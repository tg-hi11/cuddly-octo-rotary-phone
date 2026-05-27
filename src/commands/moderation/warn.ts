import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  TextChannel,
  Message,
} from 'discord.js';
import { Command, BotClient } from '../../types';
import { hasInfractionPerms } from '../../utils/permissions';
import { buildErrorEmbed, buildSuccessEmbed, bannerEmbed, buildInfractionEmbed } from '../../services/embeds/embedBuilder';
import { Infraction } from '../../database/schemas/Infraction';
import { Config } from '../../config/config';
import { logger } from '../../utils/logger';

const data = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Issue a warning to a staff member')
  .addUserOption((o) => o.setName('user').setDescription('User to warn').setRequired(true))
  .addStringOption((o) => o.setName('reason').setDescription('Reason for the warning').setRequired(true))
  .addStringOption((o) => o.setName('evidence').setDescription('Evidence link or description').setRequired(false))
  .addStringOption((o) =>
    o
      .setName('type')
      .setDescription('Warning type')
      .setRequired(false)
      .addChoices(
        { name: 'Verbal Warning', value: 'Verbal Warning' },
        { name: 'Warning', value: 'Warning' }
      )
  );

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const member = interaction.member as GuildMember;
  if (!hasInfractionPerms(member)) {
    await interaction.reply({ embeds: [buildErrorEmbed('No Permission', 'You need Infraction perms.')], ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason', true);
  const evidence = interaction.options.getString('evidence') ?? undefined;
  const type = (interaction.options.getString('type') ?? 'Warning') as 'Verbal Warning' | 'Warning';

  try {
    const infraction = await Infraction.create({
      guildId: interaction.guildId!,
      userId: target.id,
      userTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      type,
      reason,
      evidence,
      active: true,
    });

    const caseId = (infraction._id as unknown as string).toString().slice(-6).toUpperCase();
    const banner = bannerEmbed(Config.banners.infractions);
    const embed = buildInfractionEmbed({
      userTag: target.tag,
      userId: target.id,
      moderatorTag: interaction.user.tag,
      type,
      reason,
      evidence,
      caseId,
    });

    // DM the user
    try {
      await target.send({ embeds: [banner, embed] });
    } catch {
      logger.warn('WarnCommand', `Could not DM ${target.tag}`);
    }

    // Post to infraction channel
    const infrChannel = interaction.guild!.channels.cache.get(Config.channels.infractions) as TextChannel;
    if (infrChannel) {
      await infrChannel.send({ embeds: [banner, embed] });
    }

    await interaction.editReply({ embeds: [buildSuccessEmbed('Warning Issued', `${target.tag} has been warned. Case #${caseId}`)] });
  } catch (err) {
    logger.error('WarnCommand', 'Failed to issue warning', err);
    await interaction.editReply({ embeds: [buildErrorEmbed('Error', 'Failed to issue warning.')] });
  }
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  await message.reply({ embeds: [buildErrorEmbed('Use Slash Command', 'Please use `/warn` for this action.')] });
}

const command: Command = { data, execute, prefixExecute, cooldown: 3 };
export default command;
