import { CommandInteraction, GuildMember, PermissionResolvable } from 'discord.js';
import { GuardFunction } from 'discordx';

export const IsGuild: GuardFunction<CommandInteraction> =
    async (interaction, client, next) => {
        if (interaction.guild !== null) {
            await next();
        }
    }

export function HasPermission(permission: PermissionResolvable) {
    const guard: GuardFunction<CommandInteraction> =
        async (interaction, client, next) => {
            if (interaction.member instanceof GuildMember) {
                if (interaction.member.permissions.has(permission)) {
                    await next();
                }
            }
        }

    return guard;
}