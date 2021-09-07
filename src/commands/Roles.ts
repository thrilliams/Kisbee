import { Collection, CommandInteraction, MessageEmbed, Role, Guild } from 'discord.js';
import { Discord, Guard, Slash, SlashGroup, SlashOption } from 'discordx';
import PrimeTimeTable from '../lib/PrimeTimeTable';
import { HasPermission, IsGuild } from './Guards';

@Discord()
@Guard(IsGuild)
@SlashGroup('roles', 'Commands for manipulating subject roles.')
export abstract class Roles {
    static initRoleMap(min?: number, max?: number): Collection<string, Role | undefined> {
        let table = new PrimeTimeTable();
        let groups = table.filterSections(min, max);

        let roleMap: Collection<string, Role | undefined> = new Collection();
        for (let group of groups) {
            roleMap.set(group.name, undefined);
        }

        return roleMap;
    }

    static async fillRoleMap(guild: Guild, roleMap: Collection<string, Role | undefined>) {
        let roles = await guild.roles.fetch();

        for (let name of roleMap.keys()) {
            // TODO: Fuzzy name search
            let role = roles.find(role => role.name.toLowerCase() === name.toLowerCase());
            if (role !== undefined) {
                roleMap.set(name, role);
            }
        }
    }

    static async getRoleMap(guild: Guild, prune = false) {
        let roleMap = this.initRoleMap();
        await this.fillRoleMap(guild, roleMap);
        if (prune) roleMap = roleMap.filter(role => role !== undefined);
        return roleMap;
    }

    @Guard(HasPermission('MANAGE_CHANNELS'))
    @Slash('verify', { description: 'Ensures roles exist for each applicable subject.', defaultPermission: false })
    async verify(
        @SlashOption('min', { description: 'Minimum students in a class for it be considered.' }) min: number,
        @SlashOption('max', { description: 'Maximum students in a class for it be considered.' }) max: number,
        interaction: CommandInteraction
    ) {
        console.log(await Roles.getRoleMap(interaction.guild!));

        let embed = new MessageEmbed();
        let success = true;
        embed.setTitle('Verifying roles, please wait...')
            .addField('Role names:', '...');
        await interaction.reply({ embeds: [embed] });

        let roleMap = Roles.initRoleMap(min, max);
        await Roles.fillRoleMap(interaction.guild!, roleMap);

        let totalFound = roleMap.reduce((total, role) => total += role !== undefined ? 1 : 0, 0);
        embed.fields.find(field => field.name === 'Role names:')!.value = `${totalFound}/${roleMap.size} found.`;
        if (totalFound < roleMap.size) {
            embed.addField('⚠️ Missing roles:', [...roleMap.filter(role => role === undefined).keys()].join('\n'));
            success = false;
        }
        embed.setTitle(success ? 'Subject roles successfully verified.' : '⚠️ Subject role verification failed! Please adress issues below.');
        await interaction.editReply({ embeds: [embed] });
    }
}