const { Command, ArgumentCollector } = require('discord.js-commando');
const primeTimeTable = require('../../api/primeTimeTable.js');

module.exports = class GetRoles extends Command {
    constructor(client) {
        super(client, {
            name: 'getroles',
            group: 'roles',
            memberName: 'get',
            description: 'Gives subject roles to whoever\'s calling it.',
            guildOnly: true
        });
    }

    async run(msg, args) {
        let author = msg.guild.member(msg.author);
        let students = (await primeTimeTable()).classes;

        let possibleStudents = students.filter(s => {
            // valid name patterns: First Last, FirstLast, FirstL, FLast
            let first = s.name.toLowerCase().split(' ')[0];
            let last = s.name.toLowerCase().split(' ')[1];
            let username = (author.nickname || msg.author.username).toLowerCase();
            if (username === first + ' ' + last) return true;
            if (username === first + last) return true;
            if (username === first + ' ' + last.charAt(0)) return true;
            if (username === first.charAt(0) + ' ' + last) return true;
            if (username === first + last.charAt(0)) return true;
            if (username === first.charAt(0) + last) return true;
            return false;
        });

        let student;
        if (possibleStudents.length !== 1) {
            let collector = new ArgumentCollector(this.client, [{
                key: 'name',
                prompt: 'Kisbee cannot tell what your name is. Please reply with your first and last name.',
                type: 'string'
            }]);
    
            let result = await collector.obtain(msg);
            if (result.cancelled) return msg.channel.send('Kisbee cannot find a student with that name. Check for typos and try again.');
            let name = result.values.name.toLowerCase();

            student = students.filter(s => s.name.toLowerCase() === name);
            if (student.length < 1) {
                return msg.channel.send('Kisbee cannot find a student with that name. Check for typos and try again.');
            } else {
                student = student[0];
            }
        } else {
            student = possibleStudents[0];
            msg.channel.send(`You look like ${student.name}.`);
        }

        let roles = msg.guild.settings.get('subjectRoles');
        let newRoles = [];
        if (roles !== undefined) {
            for (let subject of student.subjects) {
                if (subject.id in roles) {
                    newRoles.push(roles[subject.id]);
                }
            }
        } else {
            msg.channel.send('No roles assigned. Contact a moderator.');
        }

        author.roles.add(newRoles);
        msg.channel.send(`Successfully assigned ${newRoles.length} roles!`);
    }
}