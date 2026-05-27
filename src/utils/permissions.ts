import { GuildMember } from 'discord.js';
import { Config } from '../config/config';

/** Check if a member has the Session Permissions role */
export function hasSessionPerms(member: GuildMember): boolean {
  return (
    member.permissions.has('Administrator') ||
    member.roles.cache.has(Config.roles.sessionPerms)
  );
}

/** Check if a member has the Infraction Permissions role */
export function hasInfractionPerms(member: GuildMember): boolean {
  return (
    member.permissions.has('Administrator') ||
    member.roles.cache.has(Config.roles.infractionPerms)
  );
}

/** Check if a member has the Promotion Permissions role */
export function hasPromotionPerms(member: GuildMember): boolean {
  return (
    member.permissions.has('Administrator') ||
    member.roles.cache.has(Config.roles.promotionPerms)
  );
}

/** Check if a member is an admin */
export function isAdmin(member: GuildMember): boolean {
  return member.permissions.has('Administrator');
}
