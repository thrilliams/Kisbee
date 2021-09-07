import { Discord, Guard, Slash, SlashGroup, SlashOption } from 'discordx';
import { TextChannel, CommandInteraction, MessageAttachment, Collection } from 'discord.js';
import { messages as fetchMessages } from 'discord-fetch-all';
import PrimeTimeTable from '../lib/PrimeTimeTable';
import { MessageEmbed } from 'discordx/node_modules/discord.js';
import { HasPermission, IsGuild } from './Guards';

@Discord()
@Guard(IsGuild)
@SlashGroup('channel', 'Commands for manipulating subject channels.')
abstract class Channel {
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
            .addField('Channel permissions:', '...')
        await interaction.reply({ embeds: [embed] });

        let table = new PrimeTimeTable();
        let groups = table.filterSections(min, max);

        let channelStatuses: Collection<string, TextChannel | undefined> = new Collection();
        groups.forEach(group => {
            let pattern = /(\w+)/g;
            let result = pattern.exec(group.name);
            let string = '';

            while (result !== null) {
                string += `-${result[0].toLowerCase()}`;
                result = pattern.exec(group.name);
            }

            channelStatuses.set(string.slice(1), undefined);
        });

        let channels = await interaction.guild!.channels.fetch();
        channels = channels.filter(channel => channel.type === "GUILD_TEXT");

        for (let name of channelStatuses.keys()) {
            // TODO: Fuzzy name search
            let channel = channels.find(channel => channel.name === name);
            if (channel !== undefined && channel.type === "GUILD_TEXT") {
                channelStatuses.set(name, channel);
            }
        }

        let totalFound = channelStatuses.reduce((total, channel) => total += channel !== undefined ? 1 : 0, 0);
        embed.fields.find(field => field.name === 'Channel names:')!.value = `${totalFound}/${channelStatuses.size} found.`;
        if (totalFound < channelStatuses.size) {
            embed.addField('⚠️ Missing channels:', [...channelStatuses.filter(channel => channel === undefined).keys()].map(name => `#${name}`).join('\n'));
            success = false;
        }
        channelStatuses = channelStatuses.filter(channel => channel !== undefined);
        await interaction.editReply({ embeds: [embed] });

        function checkPerms(channel: TextChannel) {
            // TODO: Correct permission check
            return channel.permissionsFor(interaction.guildId!)!.has('SEND_MESSAGES');
        }

        let totalCorrect = channelStatuses.reduce((total, channel) => total += checkPerms(channel!) ? 1 : 0, 0);
        embed.fields.find(field => field.name === 'Channel permissions:')!.value = `${totalCorrect}/${channelStatuses.size} correct.`;
        if (totalFound < channelStatuses.size) {
            embed.addField('⚠️ Incorrect permissions:', [...channelStatuses.filter(channel => !checkPerms(channel!)).keys()].map(name => `#${name}`).join('\n'));
            success = false;
        }
        embed.setTitle(success ? 'Subject channels successfully verified.' : '⚠️ Subject channel verification failed! Please adress issues below.');
        await interaction.editReply({ embeds: [embed] });
    }
}