import { Discord, Guard, Slash, SlashGroup, SlashOption } from 'discordx';
import { TextChannel, CommandInteraction, MessageAttachment, Collection, Guild } from 'discord.js';
import { messages as fetchMessages } from 'discord-fetch-all';
import PrimeTimeTable, { SubjectGroup } from '../lib/PrimeTimeTable';
import { MessageEmbed } from 'discordx/node_modules/discord.js';
import { HasPermission, IsGuild } from './Guards';
import { Roles } from './Roles';

type ChannelMap = Collection<string, SubjectGroup & { cleanedName: string, channel?: TextChannel }>;

@Discord()
@Guard(IsGuild)
@SlashGroup('channels', 'Commands for manipulating subject channels.')
abstract class Channels {
    static initChannelMap(
        min?: number, max?: number
    ): ChannelMap {
        let table = new PrimeTimeTable();
        let groups = table.filterSections(min, max);

        let channelMap: ChannelMap = new Collection();
        for (let group of groups) {
            let pattern = /(\w+)/g;
            let result = pattern.exec(group.name);
            let string = '';

            while (result !== null) {
                string += `-${result[0].toLowerCase()}`;
                result = pattern.exec(group.name);
            }

            channelMap.set(group.name, { ...group, cleanedName: string.slice(1) });
        }

        return channelMap;
    }

    static async fillChannelMap(guild: Guild, channelMap: ChannelMap) {
        let channels = await guild.channels.fetch();

        for (let [name, group] of channelMap) {
            // TODO: Fuzzy name search
            let channel = channels.find(channel => channel.name === group.cleanedName);
            if (channel !== undefined && channel.type === 'GUILD_TEXT') {
                channelMap.set(name, { ...group, channel: channel });
            }
        }
    }

    static async getChannelMap(guild: Guild) {
        let channelMap = this.initChannelMap();
        await this.fillChannelMap(guild, channelMap);
        return channelMap as ChannelMap;
    }

    @Guard(HasPermission('MANAGE_CHANNELS'))
    @Slash('verify', { description: 'Verfies the existance of channels for each applicable subject.', defaultPermission: false })
    async verify(
        @SlashOption('verbose', { description: 'Display additional information.' }) verbose: boolean,
        interaction: CommandInteraction
    ) {
        let embed = new MessageEmbed();
        let success = true;
        embed.setTitle('Verifying channels, please wait...')
            .addField('Channel names:', '...')
            .addField('Channel permissions:', '...');
        await interaction.reply({ embeds: [embed] });

        let channelMap = Channels.initChannelMap();
        await Channels.fillChannelMap(interaction.guild!, channelMap);

        let totalFound = channelMap.reduce((total, group) => total += group.channel !== undefined ? 1 : 0, 0);
        embed.fields.find(field => field.name === 'Channel names:')!.value = `${totalFound}/${channelMap.size} found${verbose ? `:\n${channelMap.filter(group => group.channel !== undefined).map(group => `#${group.cleanedName}`).join('\n')}` : '.'}`;
        if (totalFound < channelMap.size) {
            embed.addField('⚠️ Missing channels:', channelMap.filter(group => group.channel === undefined).map(group => `#${group.cleanedName}`).join('\n'));
            success = false;
        }
        await interaction.editReply({ embeds: [embed] });

        let roleMap = Roles.initRoleMap();
        await Roles.fillRoleMap(interaction.guild!, roleMap);
        let validChannelMap = channelMap.filter(group => {
            if (group.channel !== undefined) {
                let roleGroup = roleMap.get(group.name);
                if (roleGroup !== undefined && roleGroup.role !== undefined) {
                    return (
                        !group.channel.permissionsFor(interaction.guild!.roles.everyone).has('VIEW_CHANNEL')
                        && group.channel.permissionsFor(interaction.guild!.roles.cache.find(role => role.name === 'Helper')!).has('VIEW_CHANNEL')
                        && group.channel.permissionsFor(roleGroup.role.id)!.has('VIEW_CHANNEL')
                    );
                }
            }
            return false;
        });

        embed.fields.find(field => field.name === 'Channel permissions:')!.value = `${validChannelMap.size}/${totalFound} correct${verbose ? `:\n${validChannelMap.map(group => `#${group.cleanedName}`).join('\n')}` : '.'}`;
        if (validChannelMap.size < totalFound) {
            embed.addField('⚠️ Incorrect permissions:', channelMap.filter(group => {
                if (group.channel !== undefined) {
                    return !(group.name in validChannelMap);
                }
                return false;
            }).map(group => `#${group.cleanedName}`).join('\n'));
            success = false;
        }
        embed.setTitle(success ? '✅ Subject channels successfully verified.' : '⚠️ Subject channel verification failed! Please adress issues below.');
        await interaction.editReply({ embeds: [embed] });
    }

    @Guard(HasPermission('MANAGE_CHANNELS'))
    @Slash('create', { description: 'Creates channels as needed for each applicable subject.', defaultPermission: false })
    async create(
        interaction: CommandInteraction
    ) {
        let embed = new MessageEmbed();
        embed.setTitle('Creating channels, please wait...')
            .addField('Channel names:', '...')
            .addField('Channel permissions:', '...');
        await interaction.reply({ embeds: [embed] });

        let channelMap = Channels.initChannelMap();
        await Channels.fillChannelMap(interaction.guild!, channelMap);

        let roleMap = Roles.initRoleMap();
        await Roles.fillRoleMap(interaction.guild!, roleMap);

        let totalFound = channelMap.reduce((total, group) => total += group.channel !== undefined ? 1 : 0, 0);
        embed.fields.find(field => field.name === 'Channel names:')!.value = `${totalFound}/${channelMap.size} found.`;
        if (totalFound < channelMap.size) {
            embed.addField('Creating channels:', channelMap.filter(group => group.channel === undefined).map(group => `#${group.cleanedName}`).join('\n'));
            await interaction.editReply({ embeds: [embed] });
            for (let [name, group] of channelMap) {
                let roleGroup = roleMap.get(group.name);
                let channel: TextChannel;
                channel = await interaction.guild!.channels.create(group.cleanedName, {
                    permissionOverwrites: [{
                        id: interaction.guild!.roles.everyone,
                        deny: ['VIEW_CHANNEL']
                    },
                    {
                        id: interaction.guild!.roles.cache.find(role => role.name === 'Helper')!.id,
                        allow: ['VIEW_CHANNEL']
                    },
                    {
                        id: roleGroup!.role!.id,
                        allow: ['VIEW_CHANNEL']
                    }]
                });

                channelMap.set(name, { ...group, channel: channel });
            }
        }

        let validChannelMap = channelMap.filter(group => {
            if (group.channel !== undefined) {
                let roleGroup = roleMap.get(group.name);
                if (roleGroup !== undefined && roleGroup.role !== undefined) {
                    return (
                        !group.channel.permissionsFor(interaction.guild!.roles.everyone).has('VIEW_CHANNEL')
                        && group.channel.permissionsFor(interaction.guild!.roles.cache.find(role => role.name === 'Helper')!).has('VIEW_CHANNEL')
                        && group.channel.permissionsFor(roleGroup.role.id)!.has('SEND_MESSAGES')
                    );
                }
            }
            return false;
        });

        embed.fields.find(field => field.name === 'Channel permissions:')!.value = `${validChannelMap.size}/${channelMap.size} correct.`;
        if (validChannelMap.size < channelMap.size) {
            let invalidChannelMap = channelMap.filter(group => {
                if (group.channel !== undefined) {
                    return !(group.name in validChannelMap);
                }
                return false;
            });
            embed.addField('Updating channel permissions:', invalidChannelMap.map(group => `#${group.cleanedName}`).join('\n'));
            await interaction.editReply({ embeds: [embed] });
            for (let group of invalidChannelMap.values()) {
                let roleGroup = roleMap.get(group.name);
                await group.channel!.permissionOverwrites.set([
                    {
                        id: interaction.guild!.roles.everyone,
                        deny: ['VIEW_CHANNEL']
                    },
                    {
                        id: interaction.guild!.roles.cache.find(role => role.name === 'Helper')!.id,
                        allow: ['VIEW_CHANNEL']
                    },
                    {
                        id: roleGroup!.role!.id,
                        allow: ['VIEW_CHANNEL']
                    }
                ]);
            }
        }
        embed.setTitle('✅ Subject channels successfully created.');
        await interaction.editReply({ embeds: [embed] });
    }

    @Guard(HasPermission('MANAGE_CHANNELS'))
    @Slash('archive', { description: 'Archive a channel into a text file.', defaultPermission: false })
    async archive(
        @SlashOption('forcedelete', { description: 'Delete the channel after archiving it.' }) forcedelete: boolean,
        interaction: CommandInteraction
    ) {
        await interaction.reply('Archiving, please wait...');

        const channel = interaction.channel as TextChannel;
        const messages = await fetchMessages(channel, {
            userOnly: false,
            botOnly: false,
            reverseArray: true,
            pinnedOnly: false
        });

        let output = '';
        messages.forEach(message => {
            output += `${message.author.tag}: ${message.content}\n`;
        });

        const attachment = new MessageAttachment(Buffer.from(output, 'utf8'), channel.name + '.txt');

        if (forcedelete === true) {
            const name = channel.name;
            let message = interaction.user.send({ content: `Channel "#${name}" archived, deleting...`, files: [attachment] });
            await channel.delete();
            (await message).edit(`Channel "#${name}" archived and deleted.`);
        } else {
            interaction.editReply({ content: 'Channel archived.', files: [attachment] })
        }
    }

    @Guard(HasPermission('MANAGE_CHANNELS'))
    @Slash('delete', { description: 'Deletes existing channels for each applicable subject.', defaultPermission: false })
    async delete(
        interaction: CommandInteraction
    ) {
        let embed = new MessageEmbed();
        embed.setTitle('Deleting channels, please wait...')
        await interaction.reply({ embeds: [embed] });

        let channelMap = Channels.initChannelMap();
        await Channels.fillChannelMap(interaction.guild!, channelMap);
        for (let group of channelMap.values()) {
            if (group.channel !== undefined) {
                await group.channel.delete();
            }
        }

        embed.setTitle('✅ Subject channels successfully deleted.');
        await interaction.editReply({ embeds: [embed] });
    }
}