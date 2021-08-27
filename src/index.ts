import 'reflect-metadata';
import { Client } from 'discordx';
import { Intents } from 'discord.js';
import { token } from '../config.json';

async function start() {
    const client = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
        ],
        classes: [
            `${__dirname}/commands/*.ts`
        ],
        silent: true,
        botGuilds: ['745694138422263928']
    });

    client.once('ready', async () => {
        // await client.clearApplicationCommands('745694138422263928');
        await client.initApplicationCommands({ log: { forGuild: true, forGlobal: false } });
    });

    client.on('interactionCreate', interaction => {
        client.executeInteraction(interaction);
    });

    await client.login(token);
}

start()