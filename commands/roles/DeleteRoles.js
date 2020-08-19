const { Command } = require('discord.js-commando');

module.exports = class DeleteRoles extends Command {
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
        if (!roles) return;
        
        for (let roleId in roles) {
            let role = msg.guild.roles.resolve(roles[roleId]);
            if (role && !role.deleted) role.delete();
        }

        msg.guild.settings.remove('subjectRoles');
    }
}