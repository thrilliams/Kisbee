import 'reflect-metadata';
import { Client } from 'discordx';
import { Intents } from 'discord.js';
import { token, mongourl } from '../config.json';
import { connect } from 'mongoose';

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
        await connect(mongourl);
        // await client.clearApplicationCommands('745694138422263928');
        await client.initApplicationCommands({ log: { forGuild: true, forGlobal: false } });
    });

    client.on('interactionCreate', interaction => {
        client.executeInteraction(interaction);
    });

    await client.login(token);
}

start();

// TODO: Change all calls of @Permission to reference Helper and Moderator rather than my user ID.