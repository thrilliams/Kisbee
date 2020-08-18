const { Command } = require('discord.js-commando');

module.exports = class CreateChannels extends Command {
    constructor(client) {
        super(client, {
            name: 'createchannels',
            group: 'channels',
            memberName: 'create',
            description: 'Finds existing channels for each subject and creates them if they don\'t exist. Only functions as intended after a successful `createroles`. Requires the Manage Channels permission. Use sparingly; repeated uses of this command have the potential to get Kisbee ratelimited.',
            guildOnly: true,
            userPermissions: [ 'MANAGE_CHANNELS' ],
            throttling: {
                usages: 3,
                duration: 60 * 60 * 24 * 3 // 3 days
            }
        });
    }

    async run(msg, args) {
        let roles = msg.guild.settings.get('subjectRoles');
        let channels = msg.guild.settings.get('subjectChannels');

        if (roles === undefined) return msg.reply('Double-check you ran `createroles` successfully.');

        let subjects = [];
        for (let role in roles) {
            subjects.push({ ...msg.guild.roles.resolve(roles[role]), roleId: role });
        }
        
        if (channels !== undefined)
            subjects = subjects.filter(subject => !(subject.id in Object.values(channels)));
        
        subjects = subjects
            .map(subject => ({ ...subject, name: subject.name.trim().toLowerCase() }))
            .map(subject => ({ ...subject, name: subject.name.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,'') }))
            .map(subject => ({ ...subject, name: subject.name.split(' ').map(e => e.trim()).filter(e => e !== '').join('-') }));


        let perms = [{
            id: msg.guild.roles.everyone,
            deny: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        }];

        let helperRole = msg.guild.roles.cache.find(role => role.name.toLowerCase() === 'helper');
        if (helperRole !== undefined) perms.push({
            id: helperRole.id,
            allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        });

        for (let subject of subjects) {
            let channel = msg.guild.channels.cache.find(c => c.name.toLowerCase() === subject.name);
            let tPerms = [ ...perms, {
                id: msg.guild.settings.get('subjectRoles.' + subject.roleId),
                allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
            }];

            if (channel !== undefined) {
                console.log(`#${subject.name} already exists, updating perms and adding to DB.`);
                await channel.overwritePermissions(tPerms);
            } else {
                channel = await msg.guild.channels.create(subject.name, { permissionOverwrites: tPerms });
            }

            msg.guild.settings.set('subjectChannels.' + subject.roleId, channel.id);
        }
    }
}