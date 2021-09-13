import { Collection, CommandInteraction, MessageEmbed, Role, Guild } from 'discord.js';
import { Discord, Guard, Slash, SlashGroup, SlashOption } from 'discordx';
import { GuildMember } from 'discordx/node_modules/discord.js';
import PrimeTimeTable, { SubjectGroup } from '../lib/PrimeTimeTable';
import { HasPermission, IsGuild } from './Guards';

type RoleMap = Collection<string, SubjectGroup & { cleanedName: string, role?: Role }>;

@Discord()
@Guard(IsGuild)
@SlashGroup('roles', 'Commands for manipulating subject roles.')
export abstract class Roles {
    static initRoleMap(
        min?: number, max?: number
    ): RoleMap {
        let table = new PrimeTimeTable();
        let groups = table.filterSections(min, max);

        let roleMap: RoleMap = new Collection();
        for (let group of groups) {
            let pattern = /(\w+)/g;
            let result = pattern.exec(group.name);
            let string = '';

            while (result !== null) {
                string += `-${result[0].toLowerCase()}`;
                result = pattern.exec(group.name);
            }

            roleMap.set(group.name, { ...group, cleanedName: string.slice(1) });
        }

        return roleMap;
    }

    static async fillRoleMap(guild: Guild, roleMap: RoleMap) {
        let roles = await guild.roles.fetch();

        for (let [name, group] of roleMap) {
            // TODO: Fuzzy name search
            let role = roles.find(channel => channel.name === group.name);
            if (role !== undefined) {
                roleMap.set(name, { ...group, role: role });
            }
        }
    }

    static async getRoleMap(guild: Guild) {
        let roleMap = this.initRoleMap();
        await this.fillRoleMap(guild, roleMap);
        return roleMap;
    }

    @Guard(HasPermission('MANAGE_ROLES'))
    @Slash('verify', { description: 'Verifies the existance of roles for each applicable subject.', defaultPermission: false })
    async verify(
        @SlashOption('verbose', { description: 'Display additional information.' }) verbose: boolean,
        interaction: CommandInteraction
    ) {
        let embed = new MessageEmbed();
        let success = true;
        embed.setTitle('Verifying roles, please wait...')
            .addField('Role names:', '...');
        await interaction.reply({ embeds: [embed] });

        let roleMap = Roles.initRoleMap();
        await Roles.fillRoleMap(interaction.guild!, roleMap);

        let totalFound = roleMap.reduce((total, group) => total += group.role !== undefined ? 1 : 0, 0);
        embed.fields.find(field => field.name === 'Role names:')!.value = `${totalFound}/${roleMap.size} found${verbose ? `:\n${roleMap.filter(group => group.role !== undefined).map(group => group.name).join('\n')}` : '.'}`;
        if (totalFound < roleMap.size) {
            embed.addField('⚠️ Missing roles:', roleMap.filter(group => group.role === undefined).map(group => group.name).join('\n'));
            success = false;
        }
        embed.setTitle(success ? '✅ Subject roles successfully verified.' : '⚠️ Subject role verification failed! Please adress issues below.');
        await interaction.editReply({ embeds: [embed] });
    }

    @Guard(HasPermission('MANAGE_ROLES'))
    @Slash('create', { description: 'Creates roles as needed for each applicable subject.', defaultPermission: false })
    async create(
        interaction: CommandInteraction
    ) {
        let embed = new MessageEmbed();
        embed.setTitle('Creating roles, please wait...')
            .addField('Role names:', '...');
        await interaction.reply({ embeds: [embed] });

        let roleMap = Roles.initRoleMap();
        await Roles.fillRoleMap(interaction.guild!, roleMap);

        let totalFound = roleMap.reduce((total, group) => total += group.role !== undefined ? 1 : 0, 0);
        embed.fields.find(field => field.name === 'Role names:')!.value = `${totalFound}/${roleMap.size} found.`;
        if (totalFound < roleMap.size) {
            embed.addField('Creating roles:', roleMap.filter(group => group.role === undefined).map(group => group.name).join('\n'));
            await interaction.editReply({ embeds: [embed] });
            for (let [name, group] of roleMap) {
                if (group.role === undefined) {
                    let newRole = await interaction.guild!.roles.create({
                        name: name,
                        mentionable: true
                    });
                    roleMap.set(name, { ...group, role: newRole });
                }
            }
        }
        embed.setTitle('✅ Subject roles successfully created.');
        await interaction.editReply({ embeds: [embed] });
    }

    @Guard(HasPermission('MANAGE_ROLES'))
    @Slash('delete', { description: 'Delete roles for each applicable subject.', defaultPermission: false })
    async delete(
        interaction: CommandInteraction
    ) {
        let embed = new MessageEmbed();
        embed.setTitle('Deleting roles, please wait...')
        await interaction.reply({ embeds: [embed] });

        let roleMap = Roles.initRoleMap();
        await Roles.fillRoleMap(interaction.guild!, roleMap);
        for (let group of roleMap.values()) {
            if (group.role !== undefined) {
                await group.role.delete();
            }
        }

        embed.setTitle('✅ Subject roles successfully deleted.');
        await interaction.editReply({ embeds: [embed] });
    }

    @Slash('assign', { description: 'Assigns subject roles to the user.' })
    async assign(
        @SlashOption('name', { description: 'Your name, as it appears on PrimeTimeTable. Not case sensitive.', required: true }) name: string,
        interaction: CommandInteraction
    ) {
        let table = new PrimeTimeTable();
        let groups = await Roles.getRoleMap(interaction.guild!);

        let student = table.students.find(student => {
            return student.name.toLowerCase() === name.toLowerCase();
        });

        if (student === undefined) {
            interaction.reply({
                embeds: [new MessageEmbed({
                    title: '⚠️ Kisbee could not find a student with that name. Please try again.'
                })]
            });
        } else {
            student = table.expandStudent(student!);
            groups = groups
                .filter(group => group.role !== undefined)
                .filter(group => {
                    for (let [id] of student!.subjects!) {
                        if (group.ids.includes(id)) {
                            return true;
                        }
                    }

                    return false;
                });
            interaction.reply({
                embeds: [new MessageEmbed({
                    title: '✅ Success! Assigning the following roles:',
                    description: groups.map(group => group.name).join('\n')
                })]
            });
            groups.forEach(group => {
                if (interaction.member !== null && interaction.member instanceof GuildMember) {
                    interaction.member.roles.add(group.role!.id);
                }
            });
        }
    }
}