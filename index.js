const { Client, SQLiteProvider } = require('discord.js-commando');
const { open } = require('sqlite');
const { Database } = require('sqlite3');
const path = require('path');
const secret = require('./secret.json');

const client = new Client({
    owner: '294625075934527495', // thrilliams#5489, change if you want
    commandPrefix: '-'
});

client
    .on('ready', () => {
        console.log(`Logged in as ${client.user.tag} (${client.user.id})`);
    })
    .on('rateLimit', console.log);

client.setProvider(open({
    filename: path.join(__dirname, 'settings.db'),
    driver: Database
}).then(db => new SQLiteProvider(db))).catch(console.error);

client.registry
    .registerGroups([
        ['roles', 'Role management'],
        ['channels', 'Channel management'],
        ['misc', 'Miscellaneous']
    ])
    .registerDefaults()
    .registerCommandsIn(path.join(__dirname, 'commands'));

client.login(secret.client_tokens[secret.production ? 'production' : 'development']);