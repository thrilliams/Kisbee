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
        
        let disallowedSubjectNames = ['Lunch', 'Break', 'Community Seminar', 'Community Meeting', 'Independent Study', 'Senior Seminar', 'College Counseling (IL7)'];
        let coloredSubjectPrefix = 'Advisory';

        subjects = subjects
            .map(subject => ({ ...subject, name: subject.name.replace(/\([0-9]*\)/g, '').trim() }))
            .filter(subject => !disallowedSubjectNames.includes(subject.name));
        
        if (existingRoles) subjects = subjects
            .filter(subject => !(subject.id in existingRoles));
        
        for (let subject of subjects) {
            let role = msg.guild.roles.cache.find(r => r.name === subject.name);
            if (!role) {
                let data = { name: subject.name }
                if (subject.name.startsWith(coloredSubjectPrefix)) data.color = subject.color;
                role = await msg.guild.roles.create({ data: data });
            } else console.log(`${role.name} already exists, adding to DB.`);

            msg.guild.settings.set('subjectRoles.' + subject.id, role.id);
        }
    }
}