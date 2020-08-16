import CommandLayer from './CommandLayer.js';
import primeTimeTable from '../api/primetimetable.js';
import db from '../api/lowdb.js';

const commands = [
    {
        name: 'createroles',
        desc: 'Finds existing roles for each subject and creates roles if they don\'t exist. Requires the Manage Roles permission.',
        elegibility: {
            type: 'hasPerm',
            value: 'MANAGE_ROLES'
        },
        exec: async function (message) {
            let subjects = (await primeTimeTable()).subjects;
            let existingRoles = db.get(message.guild.id + '.roles').value();

            let disallowedSubjectNames = ['Lunch', 'Break', 'Community Seminar', 'Community Meeting'];
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
                    let possible = message.guild.roles.cache.find(r => r.name === role.name)
                    if (possible !== undefined) {
                        console.log(`${role.name} already exists in guild ${message.guild.name}. Adding to DB.`)
                        db.set(message.guild.id + '.roles.' + role.id, possible.id).write()
                    } else {
                        let data = { name: role.name }
                        if (role.name.startsWith(coloredSubjectPrefix)) data.color = role.color;
                        message.guild.roles.create({ data: data })
                            .then(finishedRole => db.set(message.guild.id + '.roles.' + role.id, finishedRole.id).write());
                    }
                }
            }
        }
    },
    {
        name: 'deleteroles',
        desc: 'Deletes all subject roles. Requires the Manage Roles permission.',
        elegibility: {
            type: 'hasPerm',
            value: 'MANAGE_ROLES'
        },
        exec: function (message) {
            let roles = db.get(message.guild.id + '.roles').value();
            if (roles === undefined) return;
            
            for (let roleId in roles) {
                let role = message.guild.roles.resolve(roles[roleId]);
                if (role !== null) {
                    message.guild.roles.resolve(roles[roleId]).delete();
                }
            }

            db.unset(message.guild.id + '.roles').write();
        }
    },
    {
        name: 'getroles',
        desc: 'Gives subject roles to whoever\'s calling it.',
        exec: async function (message) {
            let students = (await primeTimeTable()).classes;
            let possibleStudents = students.filter(s => {
                // valid name patterns: First Last, FirstLast, FirstL, FLast
                let first = s.name.toLowerCase().split(' ')[0];
                let last = s.name.toLowerCase().split(' ')[1];
                let username = (message.author.nickname || message.author.user.username).toLowerCase();
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
                message.channel.send('Kisbee cannot tell what your name is. Please reply with your first and last name.');
                let input;
                try {
                    input = await this.getUserInput(message);
                } catch (err) {
                    return message.channel.send(err);
                }

                student = students.filter(s => s.name.toLowerCase() === input.content.toLowerCase());
                if (student.length < 1) {
                    return message.channel.send('Kisbee cannot find a student with that name. Check for typos and try again.');
                } else {
                    student = student[0];
                }
            } else {
                student = possibleStudents[0];
                message.channel.send(`You look like ${student.name}.`);
            }

            let roles = db.get(message.guild.id + '.roles').value();
            let newRoles = [];
            if (roles !== undefined) {
                for (let subject of student.subjects) {
                    if (subject.id in roles) {
                        newRoles.push(roles[subject.id]);
                    }
                }
            } else {
                message.channel.send('No roles assigned. Contact a moderator.');
            }

            message.author.roles.add(newRoles);
            message.channel.send(`Successfully assigned ${newRoles.length} roles!`);
        }
    }
];

export default new CommandLayer(commands, 'roles');