import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Message,
} from 'discord.js';
import { Command, BotClient } from '../../types';
import { hasInfractionPerms } from '../../utils/permissions';
import { buildErrorEmbed, DIVIDER } from '../../services/embeds/embedBuilder';
import { Infraction } from '../../database/schemas/Infraction';
import { Config } from '../../config/config';
import { chunkArray } from '../../utils/formatters';
import { logger } from '../../utils/logger';

const data = new SlashCommandBuilder()
  .setName('infractions')
  .setDescription('View infraction history for a user')
  .addUserOption((o) => o.setName('user').setDescription('User to look up').setRequired(true))
  .addBooleanOption((o) => o.setName('active').setDescription('Show only active infractions').setRequired(false));

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const member = interaction.member as GuildMember;
  if (!hasInfractionPerms(member)) {
    await interaction.reply({ embeds: [buildErrorEmbed('No Permission', 'You need Infraction perms.')], ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser('user', true);
  const activeOnly = interaction.options.getBoolean('active') ?? false;

  try {
    const query: Record<string, unknown> = { guildId: interaction.guildId!, userId: target.id };
    if (activeOnly) query.active = true;

    const infractions = await Infraction.find(query).sort({ createdAt: -1 });

    if (infractions.length === 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Config.colors.success)
            .setTitle('📋  Infraction History')
            .setDescription(`${DIVIDER}\n✅ **${target.tag}** has no${activeOnly ? ' active' : ''} infractions.\n${DIVIDER}`)
            .setTimestamp(),
        ],
      });
      return;
    }

    const pages = chunkArray(infractions, 5);
    let page = 0;

    const buildEmbed = (pg: number) => {
      const items = pages[pg];
      const desc =
        `${DIVIDER}\n` +
        items
          .map((inf) => {
            const caseId = (inf._id as unknown as string).toString().slice(-6).toUpperCase();
            const date = `<t:${Math.floor(inf.createdAt.getTime() / 1000)}:D>`;
            const status = inf.active ? '🔴 Active' : '✅ Voided';
            return `**Case #${caseId}** — \`${inf.type}\` ${status}\n> **Reason:** ${inf.reason}\n> **By:** ${inf.moderatorTag} | ${date}`;
          })
          .join('\n\n') +
        `\n${DIVIDER}`;

      return new EmbedBuilder()
        .setColor(Config.colors.infraction)
        .setTitle(`📋  Infractions for ${target.tag} (${infractions.length} total)`)
        .setDescription(desc)
        .setFooter({ text: `Page ${pg + 1}/${pages.length}` })
        .setTimestamp();
    };

    const row = () =>
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('iprev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('inext').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page === pages.length - 1)
      );

    const msg = await interaction.editReply({
      embeds: [buildEmbed(0)],
      components: pages.length > 1 ? [row()] : [],
    });

    if (pages.length <= 1) return;

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
    collector.on('collect', async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        await btn.reply({ content: 'Not yours.', ephemeral: true });
        return;
      }
      if (btn.customId === 'iprev' && page > 0) page--;
      if (btn.customId === 'inext' && page < pages.length - 1) page++;
      await btn.update({ embeds: [buildEmbed(page)], components: [row()] });
    });
    collector.on('end', () => interaction.editReply({ components: [] }).catch(() => null));
  } catch (err) {
    logger.error('InfractionsCommand', 'Failed', err);
    await interaction.editReply({ embeds: [buildErrorEmbed('Error', 'Failed to fetch infractions.')] });
  }
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  await message.reply({ embeds: [buildErrorEmbed('Use Slash Command', 'Please use `/infractions`.')] });
}

const command: Command = { data, execute, prefixExecute, cooldown: 3 };
export default command;
