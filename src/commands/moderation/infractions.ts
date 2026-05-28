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
import { buildErrorEmbed, bottomBannerEmbed } from '../../services/embeds/embedBuilder';
import { E } from '../../config/emojis';
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

  const target     = interaction.options.getUser('user', true);
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
            .setDescription(`${E.search} **Infractions for ${target.tag}**\n\nNo${activeOnly ? ' active' : ''} infractions found.`)
            .setTimestamp(),
          bottomBannerEmbed(),
        ],
      });
      return;
    }

    const pages = chunkArray(infractions, 5);
    let page = 0;

    const buildEmbed = (pg: number) => {
      const lines = pages[pg].map((inf) => {
        const caseId = (inf._id as unknown as string).toString().slice(-6).toUpperCase();
        const ts     = `<t:${Math.floor(inf.createdAt.getTime() / 1000)}:D>`;
        const status = inf.active ? 'Active' : 'Voided';
        return (
          `${E.gavel} **Case #${caseId}** — \`${inf.type}\` · ${status}\n` +
          `${E.folder} ${inf.reason}\n` +
          `${E.dash} by ${inf.moderatorTag} · ${ts}`
        );
      }).join('\n\n');

      return new EmbedBuilder()
        .setColor(Config.colors.infraction)
        .setDescription(`${E.search} **Infractions for ${target.tag}** — \`${infractions.length} total\`\n\n${lines}`)
        .setFooter({ text: `Page ${pg + 1}/${pages.length}` })
        .setTimestamp();
    };

    const navRow = () =>
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('iprev').setLabel('Back').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('inext').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page === pages.length - 1)
      );

    const msg = await interaction.editReply({
      embeds: [buildEmbed(0), bottomBannerEmbed()],
      components: pages.length > 1 ? [navRow()] : [],
    });

    if (pages.length <= 1) return;
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
    collector.on('collect', async (btn) => {
      if (btn.user.id !== interaction.user.id) { await btn.reply({ content: 'Not yours.', ephemeral: true }); return; }
      if (btn.customId === 'iprev' && page > 0) page--;
      if (btn.customId === 'inext' && page < pages.length - 1) page++;
      await btn.update({ embeds: [buildEmbed(page), bottomBannerEmbed()], components: [navRow()] });
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
