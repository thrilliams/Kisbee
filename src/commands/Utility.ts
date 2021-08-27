import { Discord, Slash, SlashGroup, SlashOption } from 'discordx';
import { CommandInteraction } from 'discord.js';

@Discord()
abstract class Utility {
    @Slash('help')
    private async help(
        interaction: CommandInteraction
    ) {
        let commands = await interaction.client.application.commands.fetch();
        console.log(interaction.client);
        interaction.reply(commands.reduce((acc, command) => acc + `${command.name}, `, '').slice(0, -2));
    }
}