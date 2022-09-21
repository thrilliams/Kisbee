import 'reflect-metadata';
import { Client } from 'discordx';
import { Intents } from 'discord.js';
import { token, mongourl, tableids } from '../config.json';
import { connect } from 'mongoose';
import PrimeTimeTable from './lib/PrimeTimeTable';

async function start() {
	const client = new Client({
		intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
		classes: [`${__dirname}/commands/*.ts`],
		silent: true,
		botGuilds: ['745694138422263928', '644736412138340362']
	});

	client.once('ready', async () => {
		await client.initApplicationCommands({ log: { forGuild: true, forGlobal: false } });
	});

	client.on('interactionCreate', (interaction) => {
		client.executeInteraction(interaction);
	});

	await connect(mongourl);

	let table = new PrimeTimeTable(tableids[0]);
	await table.initialize();

	await client.login(token);
}

start();
