import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  TextChannel,
  Message,
} from 'discord.js';
import { Command, BotClient } from '../../types';
import { hasInfractionPerms } from '../../utils/permissions';
import { buildErrorEmbed, buildSuccessEmbed, bannerEmbed, bottomBannerEmbed, buildInfractionEmbed } from '../../services/embeds/embedBuilder';
import { Infraction } from '../../database/schemas/Infraction';
import { Config } from '../../config/config';
import { logger } from '../../utils/logger';

const data = new SlashCommandBuilder()
  .setName('suspend')
  .setDescription('Suspend a staff member')
  .addUserOption((o) => o.setName('user').setDescription('User to suspend').setRequired(true))
  .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(true))
  .addStringOption((o) => o.setName('evidence').setDescription('Evidence link').setRequired(false))
  .addIntegerOption((o) => o.setName('days').setDescription('Duration in days (0 = indefinite)').setRequired(false));

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const member = interaction.member as GuildMember;
  if (!hasInfractionPerms(member)) {
    await interaction.reply({ embeds: [buildErrorEmbed('No Permission', 'You need Infraction perms.')], ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  const target    = interaction.options.getUser('user', true);
  const reason    = interaction.options.getString('reason', true);
  const evidence  = interaction.options.getString('evidence') ?? undefined;
  const days      = interaction.options.getInteger('days') ?? 0;
  const expiresAt = days > 0 ? new Date(Date.now() + days * 86400000) : undefined;

  try {
    const infraction = await Infraction.create({
      guildId: interaction.guildId!, userId: target.id, userTag: target.tag,
      moderatorId: interaction.user.id, moderatorTag: interaction.user.tag,
      type: 'Suspension', reason, evidence, expiresAt, active: true,
    });
    const caseId = (infraction._id as unknown as string).toString().slice(-6).toUpperCase();

    const embeds = [
      bannerEmbed(Config.banners.infractions),
      buildInfractionEmbed({ userTag: target.tag, userId: target.id, moderatorTag: interaction.user.tag, type: 'Suspension', reason, evidence, expiresAt, caseId }),
      bottomBannerEmbed(),
    ];

    try { await target.send({ embeds }); } catch { /* DM closed */ }

    const infrChannel = interaction.guild!.channels.cache.get(Config.channels.infractions) as TextChannel;
    if (infrChannel) await infrChannel.send({ embeds });

    await interaction.editReply({ embeds: [buildSuccessEmbed('Suspended', `${target.tag}${days > 0 ? ` for ${days} day(s)` : ' indefinitely'} — Case \`#${caseId}\``)] });
  } catch (err) {
    logger.error('SuspendCommand', 'Failed', err);
    await interaction.editReply({ embeds: [buildErrorEmbed('Error', 'Failed to issue suspension.')] });
  }
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  await message.reply({ embeds: [buildErrorEmbed('Use Slash Command', 'Please use `/suspend`.')] });
}

const command: Command = { data, execute, prefixExecute, cooldown: 3 };
export default command;
