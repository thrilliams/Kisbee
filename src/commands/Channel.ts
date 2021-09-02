import { Discord, Permission, Slash, SlashGroup, SlashOption } from 'discordx';
import { TextChannel, CommandInteraction, MessageAttachment } from 'discord.js';
import * as fetchAll from 'discord-fetch-all';

@Discord()
@SlashGroup('channel', 'Commands for manipulating subject channels.')
abstract class Channel {
    @Permission({ id: '294625075934527495', type: 'USER', permission: true })
    @Slash('archive', { description: 'Archive a channel into a text file.', defaultPermission: false })
    async archive(
        @SlashOption('forcedelete', { description: 'Delete the channel after archiving it.' }) forcedelete: boolean,
        interaction: CommandInteraction
    ) {
        await interaction.reply('Archiving, please wait...');

        const channel = interaction.channel as TextChannel;
        const messages = await fetchAll.messages(channel, {
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
}