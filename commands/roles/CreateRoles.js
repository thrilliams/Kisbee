const { Command } = require('discord.js-commando');
const primeTimeTable = require('../../api/primeTimeTable.js');

module.exports = class CreateRoles extends Command {
    constructor(client) {
        super(client, {
            name: 'createroles',
            group: 'roles',
            memberName: 'create',
            description: 'Finds existing roles for each subject and creates roles if they don\'t exist. Requires the Manage Roles permission. Use sparingly; repeated uses of this command have the potential to get Kisbee ratelimited.',
            guildOnly: true,
            userPermissions: [ 'MANAGE_ROLES' ],
            throttling: {
                usages: 3,
                duration: 60 * 60 * 24 * 3 // 3 days
            }
        });
    }

    async run(msg, args) {
        let subjects = (await primeTimeTable()).subjects;
        let existingRoles = msg.guild.settings.get('subjectRoles');
        
        let disallowedSubjectNames = ['Lunch', 'Break', 'Community Seminar', 'Community Meeting', 'Independent Study', 'Senior Seminar'];
        let coloredSubjectPrefix = 'Advisory';

        let newRoles = [];
        if (existingRoles === undefined) {
            newRoles.push(...subjects);
        } else {
            for (let subject of subjects) {
                if (!(subject.id in existingRoles)) newRoles.push(subject);
            }
        }
        
        for (let role of newRoles) {
            if (!disallowedSubjectNames.includes(role.name)) {
                let possible = msg.guild.roles.cache.find(r => r.name === role.name)
                if (possible !== undefined) {
                    console.log(`${role.name} already exists in guild ${msg.guild.name}. Adding to DB.`)
                    msg.guild.settings.set('subjectRoles.' + role.id, possible.id);
                } else {
                    let data = { name: role.name }
                    if (role.name.startsWith(coloredSubjectPrefix)) data.color = role.color;
                    let finishedRole = await msg.guild.roles.create({ data: data });
                    msg.guild.settings.set('subjectRoles.' + role.id, finishedRole.id);
                }
            }
        }
    }
}