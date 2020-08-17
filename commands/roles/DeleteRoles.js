const { Command } = require('discord.js-commando');

module.exports = class CreateRoles extends Command {
    constructor(client) {
        super(client, {
            name: 'deleteroles',
            group: 'roles',
            memberName: 'delete',
            description: 'Deletes all subject roles. Requires the Manage Roles permission.',
            guildOnly: true,
            userPermissions: [ 'MANAGE_ROLES' ]
        });
    }

    async run(msg, args) {
        let roles = msg.guild.settings.get('subjectRoles');
        if (roles === undefined) return;
        
        for (let roleId in roles) {
            let role = msg.guild.roles.resolve(roles[roleId]);
            if (role !== null) {
                msg.guild.roles.resolve(roles[roleId]).delete();
            }
        }

        msg.guild.settings.remove('subjectRoles');
    }
}