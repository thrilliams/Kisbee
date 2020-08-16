import Discord from 'discord.js';
import roleLayer from './roleLayer.js';
import channelLayer from './channelLayer.js';
import secret from '../secret.js';

const client = new Discord.Client();
const prefix = '-'; // TODO: Change this

const commandLayers = [ roleLayer, channelLayer ];

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    
    if (message.guild !== undefined) message.author = await message.guild.members.fetch(message.author);
    else return message.channel.send('I don\'t currently accept direct messages, sorry!');
    
    message.content = message.content.replace(prefix, '');
    for (let layer of commandLayers) {
        if (layer.handleCommand(message)) return;
    }
});

client.on('rateLimit', console.log);

client.login(secret.client_token);

export default client;