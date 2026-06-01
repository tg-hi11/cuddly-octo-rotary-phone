import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Interaction,
  TextChannel,
} from 'discord.js';
import { BotClient, Event } from '../types';
import { checkCooldown } from '../utils/cooldown';
import { buildErrorEmbed, buildSuccessEmbed, bannerEmbed, buildVoteEmbed } from '../services/embeds/embedBuilder';
import { logger } from '../utils/logger';
import { Vote } from '../database/schemas/Vote';
import { Config } from '../config/config';
import { prcApi } from '../services/prc/prcApi';
import { E } from '../config/emojis';

const event: Event = {
  name: 'interactionCreate',
  async execute(...args: unknown[]) {
    const client      = args[args.length - 1] as BotClient;
    const interaction = args[0] as Interaction;

    // ── Slash Commands ─────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands?.get(interaction.commandName);
      if (!command) return;

      const cooldown  = command.cooldown ?? 3;
      const remaining = checkCooldown(command.data.name, interaction.user.id, cooldown);
      if (remaining > 0) {
        await interaction.reply({
          embeds: [buildErrorEmbed('Cooldown', `Please wait **${remaining}s** before using this command again.`)],
          ephemeral: true,
        });
        return;
      }

      try {
        await command.execute(interaction, client);
      } catch (err) {
        logger.error('InteractionCreate', `Error in command ${interaction.commandName}`, err);
        const errEmbed = buildErrorEmbed('Command Error', 'An unexpected error occurred. Please try again.');
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errEmbed], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
      }
      return;
    }

    // ── Button Interactions ────────────────────────────────────────────────────
    if (interaction.isButton()) {
      if (interaction.customId === 'session_vote') {
        await handleVoteButton(interaction);
        return;
      }
      if (interaction.customId === 'session_voters') {
        await handleVotersButton(interaction);
        return;
      }
    }
  },
};

async function handleVoteButton(interaction: ButtonInteraction): Promise<void> {
  try {
    const guildId = interaction.guildId!;
    const userId  = interaction.user.id;

    const vote = await Vote.findOne({ guildId, status: 'pending' });
    if (!vote) {
      await interaction.reply({
        embeds: [buildErrorEmbed('No Active Vote', 'There is no active vote right now.')],
        ephemeral: true,
      });
      return;
    }

    if (vote.voters.includes(userId)) {
      await interaction.reply({
        embeds: [buildErrorEmbed('Already Voted', 'You have already cast your vote.')],
        ephemeral: true,
      });
      return;
    }

    if (new Date() > vote.expiresAt) {
      vote.status = 'expired';
      await vote.save();
      await interaction.reply({
        embeds: [buildErrorEmbed('Vote Expired', 'This vote has already expired.')],
        ephemeral: true,
      });
      return;
    }

    vote.voters.push(userId);
    await vote.save();

    const threshold = vote.threshold;
    const count     = vote.voters.length;

    if (count >= threshold) {
      vote.status = 'passed';
      await vote.save();
    }

    // Fetch live server info to rebuild vote embed
    let info, queueData;
    try {
      [info, queueData] = await Promise.all([prcApi.getServerInfo(), prcApi.getQueue()]);
    } catch {
      // API unavailable — confirm ephemerally, skip embed update
      await interaction.reply({
        embeds: [buildSuccessEmbed('Vote Counted', `Your vote has been recorded. (${count}/${threshold})`)],
        ephemeral: true,
      });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('session_vote')
        .setLabel(`Vote to Join (${count}/${threshold})`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(count >= threshold),
      new ButtonBuilder()
        .setCustomId('session_voters')
        .setLabel('Voters')
        .setStyle(ButtonStyle.Secondary)
    );

    const updatedEmbeds = [
      bannerEmbed(Config.banners.sessionVote),
      buildVoteEmbed(interaction.user.tag, vote.voters, threshold, info.Name, info.CurrentPlayers, info.MaxPlayers, queueData.Queue),
    ];

    // ── Determine which message was clicked ───────────────────────────────────
    // The session STATUS message and the VOTE message share the same button IDs.
    // If this click was on the status message, do NOT replace it with vote embed
    // content — just confirm ephemerally and update the dedicated vote message.
    const clickedVoteMessage = interaction.message.id === vote.messageId;

    if (clickedVoteMessage) {
      // User clicked the dedicated vote message → update it in-place
      await interaction.update({ embeds: updatedEmbeds, components: [row] });
    } else {
      // User clicked the session STATUS message → confirm ephemerally, then
      // update the dedicated vote message separately (keep status intact)
      await interaction.reply({
        embeds: [buildSuccessEmbed('Vote Counted', `Your vote has been recorded. (${count}/${threshold})`)],
        ephemeral: true,
      });
      try {
        const voteChannel = interaction.guild!.channels.cache.get(vote.channelId) as TextChannel;
        if (voteChannel) {
          const voteMsg = await voteChannel.messages.fetch(vote.messageId);
          await voteMsg.edit({ embeds: updatedEmbeds, components: [row] });
        }
      } catch { /* vote message may be gone — non-critical */ }
    }
  } catch (err) {
    logger.error('VoteButton', 'Error processing vote', err);
    try {
      await interaction.reply({
        embeds: [buildErrorEmbed('Error', 'Failed to process your vote.')],
        ephemeral: true,
      });
    } catch { /* already replied */ }
  }
}

async function handleVotersButton(interaction: ButtonInteraction): Promise<void> {
  try {
    const vote = await Vote.findOne({ guildId: interaction.guildId!, status: 'pending' });

    if (!vote || vote.voters.length === 0) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFFFFFF)
            .setDescription(`${E.giveaway} **Voters**\n\nNo votes have been cast yet.`)
            .setTimestamp(),
        ],
        ephemeral: true,
      });
      return;
    }

    const voterList = vote.voters.map((id, i) => `${E.dash} \`${i + 1}.\` <@${id}>`).join('\n');
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFFFFFF)
          .setDescription(
            `${E.giveaway} **Voters** — \`${vote.voters.length}/${vote.threshold}\`\n\n${voterList}`
          )
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  } catch (err) {
    logger.error('VotersButton', 'Error loading voters', err);
    try {
      await interaction.reply({
        embeds: [buildErrorEmbed('Error', 'Failed to load voters.')],
        ephemeral: true,
      });
    } catch { /* already replied */ }
  }
}

export default event;
