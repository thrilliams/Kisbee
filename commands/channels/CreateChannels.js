const { Command } = require('discord.js-commando');
const primeTimeTable = require('../../api/primeTimeTable.js');

module.exports = class CreateRoles extends Command {
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
        let categoryId = msg.guild.settings.get('subjectChannel');
        if (categoryId === undefined) {
            categoryId = (await msg.guild.channels.create('Subjects', { type: 'category' })).id;
            msg.guild.settings.set('subjectChannel', categoryId);
        }

        let subjects = (await primeTimeTable()).subjects;
        let roles = msg.guild.settings.get('subjectRoles');
        let channels = msg.guild.settings.get('subjectChannels');
        
        if (channels !== undefined)
            subjects = subjects.filter(subject => !(subject.id in channels));

        subjects = subjects
            .filter(subject => subject.id in roles)
            .map(subject => ({ ...subject, name: subject.name.trim().toLowerCase() }))
            .map(subject => ({ ...subject, name: subject.name.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,'') }))
            .map(subject => ({ ...subject, name: subject.name.split(' ').map(e => e.trim()).filter(e => e !== '').join('-') }));
        
        for (let subject of subjects.filter(subject => msg.guild.channels.cache.find(channel => channel.name === subject.name) !== undefined)) {
            console.log(`#${subject.name} already exists, adding to DB.`);
            msg.guild.settings.set('subjectChannels.' + subject.id, msg.guild.channels.cache.find(channel => channel.name === subject.name).id);
        }

        subjects = subjects.filter(subject => msg.guild.channels.cache.find(channel => channel.name === subject.name) === undefined)

        for (let subject of subjects.slice(0, 3)) {
            let channel = await msg.guild.channels.create(subject.name, {
                parent: categoryId,
                permissionOverwrites: [
                    { id: msg.guild.roles.everyone,
                    deny: ['VIEW_CHANNEL', 'SEND_MESSAGES'] },
                    { id: msg.guild.settings.get('subjectRoles.' + subject.id),
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] },
                    { id: msg.guild.roles.cache.find(role => role.name === 'Helper'),
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] }
                ]
            });
            msg.guild.settings.set('subjectChannel.' + subject.id, channel.id);
        }
    }
}