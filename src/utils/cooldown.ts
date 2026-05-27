import { Collection } from 'discord.js';

// Map<commandName, Map<userId, expiresAt>>
const cooldowns = new Collection<string, Collection<string, number>>();

/**
 * Check if a user is on cooldown for a command.
 * Returns remaining seconds if on cooldown, 0 if not.
 */
export function checkCooldown(commandName: string, userId: string, cooldownSeconds: number): number {
  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Collection<string, number>());
  }

  const timestamps = cooldowns.get(commandName)!;
  const now = Date.now();
  const cooldownMs = cooldownSeconds * 1000;

  if (timestamps.has(userId)) {
    const expiresAt = timestamps.get(userId)!;
    if (now < expiresAt) {
      return Math.ceil((expiresAt - now) / 1000);
    }
  }

  timestamps.set(userId, now + cooldownMs);

  // Auto-clean after expiry
  setTimeout(() => timestamps.delete(userId), cooldownMs);

  return 0;
}
