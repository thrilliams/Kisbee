import { GuardFunction, ArgsOf } from 'discordx';

export const IsGuild: GuardFunction<ArgsOf<'interactionCreate'>> = async (
    [interaction],
    client,
    next
) => {
    if (interaction.guild !== null) {
        await next();
    }
};