const { Command } = require('discord.js-commando');

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
            channel = await msg.guild.channels.resolve(channels[channel]);
            await msg.guild.settings.remove('subjectChannels.' + channels);
            if (channel) channel.delete();
        }
    }
}