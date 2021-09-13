import { Discord, Slash, SlashChoice, SlashGroup, SlashOption } from 'discordx';
import { CommandInteraction } from 'discord.js';

@Discord()
@SlashGroup({ 'info': 'Commands for manipulating useful information.' })
abstract class Utility {
    @Slash('invite', { description: 'Bring Kisbee to a new server.' })
    invite(interaction: CommandInteraction) {
        interaction.reply(`https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user!.id}&permissions=8&scope=applications.commands%20bot`);
    }

    @Slash('remind', { description: 'Set a reminder.' })
    remind(
        @SlashOption('amount', { description: 'The amount of time to be reminded in.', required: true }) amount: number,
        @SlashChoice({
            'Seconds': 1000,
            'Minutes': 1000 * 60,
            'Hours': 1000 * 60 * 60,
            'Days': 1000 * 60 * 60 * 24
        })
        @SlashOption('unit', { description: 'The unit of time.', required: true }) unit: number,
        @SlashOption('reason', { description: 'The reason for your reminder.' }) reason: string,
        interaction: CommandInteraction
    ) {
        interaction.reply('Reminder set.');
        setTimeout(() => interaction.user.send(reason ? reason : 'Become reminded.'), amount * unit);
    }
}