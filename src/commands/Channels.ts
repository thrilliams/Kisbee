import { Discord, Guard, Slash, SlashGroup, SlashOption } from 'discordx';
import { TextChannel, CommandInteraction, MessageAttachment, Collection, Guild } from 'discord.js';
import { messages as fetchMessages } from 'discord-fetch-all';
import PrimeTimeTable from '../lib/PrimeTimeTable';
import { MessageEmbed } from 'discordx/node_modules/discord.js';
import { HasPermission, IsGuild } from './Guards';

@Discord()
@Guard(IsGuild)
@SlashGroup('channel', 'Commands for manipulating subject channels.')
abstract class Channels {
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

        const attachment = new MessageAttachment(Buffer.from(output, 'utf8'), 'archive.txt');

        if (forcedelete === true) {
            const name = channel.name;
            let message = interaction.user.send({ content: `Channel "#${name}" archived, deleting...`, files: [attachment] });
            await channel.delete();
            (await message).edit(`Channel "#${name}" archived and deleted.`);
        } else {
            interaction.editReply({ content: 'Channel archived.', files: [attachment] })
        }
    }

    static initChannelMap(min?: number, max?: number): Collection<string, TextChannel | undefined> {
        let table = new PrimeTimeTable();
        let groups = table.filterSections(min, max);

        let channelMap: Collection<string, TextChannel | undefined> = new Collection();
        for (let group of groups) {
            let pattern = /(\w+)/g;
            let result = pattern.exec(group.name);
            let string = '';

            while (result !== null) {
                string += `-${result[0].toLowerCase()}`;
                result = pattern.exec(group.name);
            }

            channelMap.set(string.slice(1), undefined);
        }

        return channelMap;
    }

    static async fillChannelMap(guild: Guild, channelMap: Collection<string, TextChannel | undefined>) {
        let channels = await guild.channels.fetch();

        for (let name of channelMap.keys()) {
            // TODO: Fuzzy name search
            let channel = channels.find(channel => channel.name === name);
            if (channel !== undefined && channel.type === 'GUILD_TEXT') {
                channelMap.set(name, channel);
            }
        }
    }

    static filterChannelMap(guild: Guild, channelMap: Collection<string, TextChannel>,
        filter: (channel: TextChannel) => boolean) {
        return channelMap.filter(filter);
    }

    static async getChannelMap(guild: Guild, prune = false) {
        let channelMap = this.initChannelMap();
        await this.fillChannelMap(guild, channelMap);
        if (prune) channelMap = channelMap.filter(channel => channel !== undefined);
        return channelMap as Collection<string, TextChannel>;
    }

    @Guard(HasPermission('MANAGE_CHANNELS'))
    @Slash('verify', { description: 'Ensures channels exist for each applicable subject.', defaultPermission: false })
    async verify(
        @SlashOption('min', { description: 'Minimum students in a class for it be considered.' }) min: number,
        @SlashOption('max', { description: 'Maximum students in a class for it be considered.' }) max: number,
        interaction: CommandInteraction
    ) {
        let embed = new MessageEmbed();
        let success = true;
        embed.setTitle('Verifying channels, please wait...')
            .addField('Channel names:', '...')
            .addField('Channel permissions:', '...');
        await interaction.reply({ embeds: [embed] });

        let channelMap = Channels.initChannelMap(min, max);
        await Channels.fillChannelMap(interaction.guild!, channelMap);

        let totalFound = channelMap.reduce((total, channel) => total += channel !== undefined ? 1 : 0, 0);
        embed.fields.find(field => field.name === 'Channel names:')!.value = `${totalFound}/${channelMap.size} found.`;
        if (totalFound < channelMap.size) {
            embed.addField('⚠️ Missing channels:', [...channelMap.filter(channel => channel === undefined).keys()].map(name => `#${name}`).join('\n'));
            success = false;
        }
        await interaction.editReply({ embeds: [embed] });

        let fullChannelMap = channelMap.filter(channel => channel !== undefined) as Collection<string, TextChannel>;
        const filter = (channel: TextChannel) => {
            // TODO: Correct permission check
            return channel.permissionsFor(interaction.guild!.id)!.has('SEND_MESSAGES');
        }
        fullChannelMap = Channels.filterChannelMap(interaction.guild!, fullChannelMap, filter);

        let totalCorrect = fullChannelMap.reduce((total, channel) => total += filter(channel) ? 1 : 0, 0);
        embed.fields.find(field => field.name === 'Channel permissions:')!.value = `${totalCorrect}/${fullChannelMap.size} correct.`;
        if (totalCorrect < fullChannelMap.size) {
            embed.addField('⚠️ Incorrect permissions:', [...fullChannelMap.filter(channel => !filter(channel)).keys()].map(name => `#${name}`).join('\n'));
            success = false;
        }
        embed.setTitle(success ? 'Subject channels successfully verified.' : '⚠️ Subject channel verification failed! Please adress issues below.');
        await interaction.editReply({ embeds: [embed] });
    }
}