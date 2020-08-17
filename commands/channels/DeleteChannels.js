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
        for (let channel of Object.keys(channels)) {
            channel = await msg.guild.channels.resolve(channels[channel]);
            if (channel) await channel.delete();
            for (let key of Object.keys(channels)) {
                if (channels[key] === channel.id) msg.guild.settings.remove('subjectChannels.' + key);
            }
        }

        let categoryId = msg.guild.settings.get('subjectChannel');
        if (categoryId !== undefined) {
            let channel = await msg.guild.channels.resolve(categoryId);
            if (channel) await channel.delete();
            msg.guild.settings.remove('subjectChannel');
        }
    }
}