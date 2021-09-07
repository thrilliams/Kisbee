import { CommandInteraction } from 'discord.js';
import { GuardFunction, ArgsOf } from 'discordx';

export const IsGuild: GuardFunction<CommandInteraction> =
    async (interaction, client, next) => {
        if (interaction.guild !== null) {
            await next();
        }
    }