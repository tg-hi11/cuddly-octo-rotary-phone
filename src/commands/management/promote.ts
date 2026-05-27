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
  .setName('promote')
  .setDescription('Promote a staff member')
  .addUserOption((o) => o.setName('user').setDescription('User to promote').setRequired(true))
  .addRoleOption((o) => o.setName('rank').setDescription('New rank/role to assign').setRequired(true))
  .addStringOption((o) => o.setName('reason').setDescription('Reason for promotion').setRequired(false));

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const member = interaction.member as GuildMember;
  if (!hasPromotionPerms(member)) {
    await interaction.reply({ embeds: [buildErrorEmbed('No Permission', 'You need Promotion perms.')], ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser('user', true);
  const newRole = interaction.options.getRole('rank', true);
  const reason = interaction.options.getString('reason') ?? undefined;
  const targetMember = await interaction.guild!.members.fetch(target.id).catch(() => null);

  if (!targetMember) {
    await interaction.editReply({ embeds: [buildErrorEmbed('Not Found', 'Could not find that member in this server.')] });
    return;
  }

  const fromRank = targetMember.roles.highest.name !== '@everyone' ? targetMember.roles.highest.name : undefined;

  try {
    // Assign new role
    await targetMember.roles.add(newRole.id);

    await Promotion.create({
      guildId: interaction.guildId!,
      userId: target.id,
      userTag: target.tag,
      promoterId: interaction.user.id,
      promoterTag: interaction.user.tag,
      action: 'promote',
      fromRank,
      toRank: newRole.name,
      reason,
    });

    const banner = bannerEmbed(Config.banners.promotions);
    const embed = buildPromotionEmbed({
      userTag: target.tag,
      userId: target.id,
      promoterTag: interaction.user.tag,
      action: 'promote',
      fromRank,
      toRank: newRole.name,
      reason,
    });

    // DM the user
    try { await target.send({ embeds: [banner, embed] }); } catch { /* DM closed */ }

    // Post to promo channel
    const promoChannel = interaction.guild!.channels.cache.get(Config.channels.promotions) as TextChannel;
    if (promoChannel) await promoChannel.send({ embeds: [banner, embed] });

    await interaction.editReply({
      embeds: [buildSuccessEmbed('Promoted', `${target.tag} has been promoted to **${newRole.name}**.`)],
    });
  } catch (err) {
    logger.error('PromoteCommand', 'Failed', err);
    await interaction.editReply({ embeds: [buildErrorEmbed('Error', 'Failed to promote member.')] });
  }
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  await message.reply({ embeds: [buildErrorEmbed('Use Slash Command', 'Please use `/promote`.')] });
}

const command: Command = { data, execute, prefixExecute, cooldown: 3 };
export default command;
