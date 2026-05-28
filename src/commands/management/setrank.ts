import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  TextChannel,
  Message,
} from 'discord.js';
import { Command, BotClient } from '../../types';
import { hasPromotionPerms } from '../../utils/permissions';
import { buildErrorEmbed, buildSuccessEmbed, bannerEmbed, buildPromotionEmbed } from '../../services/embeds/embedBuilder';
import { Promotion } from '../../database/schemas/Promotion';
import { Config } from '../../config/config';
import { logger } from '../../utils/logger';

const data = new SlashCommandBuilder()
  .setName('setrank')
  .setDescription('Set a specific rank for a staff member')
  .addUserOption((o) => o.setName('user').setDescription('User').setRequired(true))
  .addRoleOption((o) => o.setName('rank').setDescription('Role to assign').setRequired(true))
  .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false));

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const member = interaction.member as GuildMember;
  if (!hasPromotionPerms(member)) {
    await interaction.reply({ embeds: [buildErrorEmbed('No Permission', 'You need Promotion perms.')], ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  const target       = interaction.options.getUser('user', true);
  const newRole      = interaction.options.getRole('rank', true);
  const reason       = interaction.options.getString('reason') ?? undefined;
  const targetMember = await interaction.guild!.members.fetch(target.id).catch(() => null);

  if (!targetMember) {
    await interaction.editReply({ embeds: [buildErrorEmbed('Not Found', 'Could not find that member.')] });
    return;
  }

  const fromRank = targetMember.roles.highest.name !== '@everyone' ? targetMember.roles.highest.name : undefined;

  try {
    await targetMember.roles.add(newRole.id);

    await Promotion.create({
      guildId: interaction.guildId!, userId: target.id, userTag: target.tag,
      promoterId: interaction.user.id, promoterTag: interaction.user.tag,
      action: 'setrank', fromRank, toRank: newRole.name, reason,
    });

    const embeds = [
      bannerEmbed(Config.banners.promotions),
      buildPromotionEmbed({ userTag: target.tag, userId: target.id, promoterTag: interaction.user.tag, action: 'setrank', fromRank, toRank: newRole.name, reason }),
    ];

    try { await target.send({ embeds }); } catch { /* DM closed */ }

    const promoChannel = interaction.guild!.channels.cache.get(Config.channels.promotions) as TextChannel;
    if (promoChannel) await promoChannel.send({ embeds });

    await interaction.editReply({ embeds: [buildSuccessEmbed('Rank Set', `${target.tag} → **${newRole.name}**`)] });
  } catch (err) {
    logger.error('SetRankCommand', 'Failed', err);
    await interaction.editReply({ embeds: [buildErrorEmbed('Error', 'Failed to set rank.')] });
  }
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  await message.reply({ embeds: [buildErrorEmbed('Use Slash Command', 'Please use `/setrank`.')] });
}

const command: Command = { data, execute, prefixExecute, cooldown: 3 };
export default command;
