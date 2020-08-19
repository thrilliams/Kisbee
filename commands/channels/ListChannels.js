const { Command } = require('discord.js-commando');
const { APIMessage } = require('discord.js');

module.exports = class ListChannels extends Command {
    constructor(client) {
        super(client, {
            name: 'listchannels',
            aliases: [ 'ls', 'list' ],
            group: 'channels',
            memberName: 'listchannels',
            description: 'Lists each channel in a server.',
            args: [{
                key: 'server',
                prompt: 'Please specify a server.',
                default: function(msg, arg) {
                    return msg.guild;
                },
                validate: function(val, msg, arg) {
                    if (typeof val === 'number') val += '';
                    if (typeof val !== 'string') return false;
                    let server = msg.command.client.guilds.cache.get(val);
                    if (!server)
                        server = msg.command.client.guilds.cache.find(g => g.name === val);
                    if (!server) return 'Kisbee could not find a server with that name or ID.';
                    return true;
                },
                parse: function(val, msg, arg) {
                    let server = msg.command.client.guilds.cache.get(val);
                    if (!server)
                        server = msg.command.client.guilds.cache.find(g => g.name === val);
                    return server;
                }
            }]
        });
    }
    
	async run(msg, args) {
        // Array chunking. Source: https://github.com/30-seconds/30-seconds-of-code
        const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
            arr.slice(i * size, i * size + size)
        );

        let message = chunk(
            [...args.server.channels.cache.values()]
                .filter(c => c.type !== 'category')
                .map(c => `\`${(c.type === 'text' ? '#' : '') + c.name}\` (${c.id}) - ${c.type}`),
            40
        );
        message[0].unshift(`Channels for \`${args.server.name}\` (${args.server.id})\n`);
        message = message.map(e => e.join('\n'));
        message.forEach(m => msg.channel.send(m));
	}
}