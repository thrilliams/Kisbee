const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');

module.exports = class HelpCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'cmds',
			group: 'misc',
			memberName: 'cmds',
			aliases: ['commands'],
			description: 'Displays a list of available commands, or detailed information for a specified command.',
			details: `The command may be part of a command name or a whole command name. If it isn't specified, all available commands will be listed.`,
			examples: ['help', 'help prefix'],
			guarded: true,

			args: [
				{
					key: 'command',
					prompt: 'Which command/category would you like to view the help for?',
					type: 'string',
					default: ''
				}
			]
		});
	}

	async run(message, args){
        let categories = this.client.registry;
        const embed = new MessageEmbed()
        if(!args.length){
            embed.setTitle("Here's a list of all of my command categories");
            categories.groups.each((group, string) => {
                embed.addField(group, `Say \`${this.client.commandPrefix}help ${string}\` to view these commands`, true);
            })
            message.channel.send(embed);
        } else if(categories.groups.keyArray().includes(args.command)){
            embed.setTitle(`Here are all of my ${args.command} commands!`)
            categories.commands.array().forEach(command => {
                embed.addField(command.name, command.description, true)
            })
            message.channel.send(embed);
        } else if(categories.commands.array().includes(args.command)){
            let command = categories.findCommands(args.command, true)[0];
            embed.setTitle(`Command info on ${command.name}`);
            embed.addFields(
                {name: "Group", value: command.group},
                {name: "Aliases", value: command.aliases},
                {name: "Description", value: command.description},
            )
            try{
                for(let i in command.args){
                    embed.addField(`Argument ${i}: ${command.args[i].key}`, command.args[i].prompt, true);
                }
            } finally {
                message.channel.send(embed);
            }
        }
    }
};