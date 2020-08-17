const { Command } = require('discord.js-commando');
const primeTimeTable = require('../../api/primeTimeTable.js');

module.exports = class DeleteChannels extends Command {
    constructor(client) {
        super(client, {
            name: 'deletechannels',
            group: 'channels',
            memberName: 'delete',
            description: 'Deletes all subject channels. Requires the Manage Channels permission.',
            guildOnly: true,
            userPermissions: [ 'MANAGE_CHANNELS' ]
        });
    }

    async run(msg, args) {
        let channels = msg.guild.settings.get('subjectChannels');
        
        if (channels === undefined) return;

        for (let channel in channels) {
            channel = await msg.guild.channels.resolve(channel);
            await channel.delete();
            msg.guild.settings.remove('subjectChannel.' + subject.id);
        }

        let categoryId = msg.guild.settings.get('subjectChannel');
        if (categoryId !== undefined) {
            let channel = await msg.guild.channels.resolve(categoryId);
            await channel.delete();
            msg.guild.settings.remove('subjectChannel');
        }
    }
}