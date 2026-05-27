import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from 'discord.js';
import { Config } from '../../config/config';
import { PRCServerInfo, PRCPlayer } from '../../types';
import { formatDuration, secondsSince } from '../../utils/formatters';
import { ISession } from '../../database/schemas/Session';

// ─── Banner embed (always first) ───────────────────────────────────────────
export function bannerEmbed(url: string): EmbedBuilder {
  return new EmbedBuilder().setImage(url).setColor(Config.colors.primary);
}

// ─── Divider line helper ────────────────────────────────────────────────────
export const DIVIDER = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';

// ─── Session Startup Embed ──────────────────────────────────────────────────
export function buildSessionStartupEmbed(
  info: PRCServerInfo,
  players: PRCPlayer[],
  session: ISession,
  secondsAgo: number
): EmbedBuilder {
  const staff = players.filter(
    (p) =>
      p.Permission === 'Server Moderator' ||
      p.Permission === 'Server Administrator' ||
      p.Permission === 'Server Owner'
  );
  const uptime = formatDuration(Date.now() - session.startTime.getTime());
  const staffList = staff.length > 0 ? staff.map((s) => `\`${s.Player}\``).join(', ') : 'None Online';

  return new EmbedBuilder()
    .setColor(Config.colors.primary)
    .setTitle('🟢  Session Active')
    .setDescription(`${DIVIDER}`)
    .addFields(
      { name: '🏙️  Server', value: info.Name || 'ERLC Server', inline: true },
      { name: '🔑  Join Code', value: `\`${info.JoinKey}\``, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '👥  Players', value: `\`${info.CurrentPlayers} / ${info.MaxPlayers}\``, inline: true },
      { name: '⚙️  Active Staff', value: staffList, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '👑  Session Host', value: `<@${session.hostId}>`, inline: true },
      { name: '⏱️  Uptime', value: `\`${uptime}\``, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '\u200B', value: DIVIDER }
    )
    .setFooter({ text: `-# Last updated: ${secondsAgo} seconds ago` })
    .setTimestamp();
}

// ─── Session Startup Buttons ────────────────────────────────────────────────
export function buildSessionButtons(voteCount: number, threshold: number): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('session_vote')
      .setLabel(`Vote to Join (${voteCount}/${threshold})`)
      .setEmoji('🗳️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('session_voters')
      .setLabel('Voters')
      .setEmoji('👥')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel('Join Server')
      .setEmoji('🎮')
      .setStyle(ButtonStyle.Link)
      .setURL('https://policeroleplay.community/join/server')
  );
  return [row1];
}

// ─── Session Shutdown Embed ─────────────────────────────────────────────────
export function buildShutdownEmbed(session: ISession): EmbedBuilder {
  const duration = session.endTime
    ? formatDuration(session.endTime.getTime() - session.startTime.getTime())
    : 'N/A';

  return new EmbedBuilder()
    .setColor(Config.colors.error)
    .setTitle('🔴  Session Closed')
    .setDescription(`${DIVIDER}`)
    .addFields(
      { name: '👑  Session Host', value: `<@${session.hostId}>`, inline: true },
      { name: '⏱️  Total Duration', value: `\`${duration}\``, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '📈  Peak Players', value: `\`${session.peakPlayers}\``, inline: true },
      { name: '\u200B', value: DIVIDER }
    )
    .setFooter({ text: 'Thank you for attending!' })
    .setTimestamp();
}

// ─── Vote Embed ─────────────────────────────────────────────────────────────
export function buildVoteEmbed(
  initiatorTag: string,
  voters: string[],
  threshold: number,
  serverName: string,
  currentPlayers: number,
  maxPlayers: number,
  queue: number
): EmbedBuilder {
  const progress = Math.min(Math.floor((voters.length / threshold) * 10), 10);
  const bar = '█'.repeat(progress) + '░'.repeat(10 - progress);

  return new EmbedBuilder()
    .setColor(Config.colors.info)
    .setTitle('🗳️  Vote to Start Session')
    .setDescription(`${DIVIDER}\n**${initiatorTag}** has started a vote to begin the session!`)
    .addFields(
      { name: '🏙️  Server', value: serverName, inline: true },
      { name: '👥  Players', value: `\`${currentPlayers}/${maxPlayers}\``, inline: true },
      { name: '📋  Queue', value: `\`${queue}\``, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '📊  Progress', value: `\`[${bar}] ${voters.length}/${threshold}\``, inline: false },
      { name: '\u200B', value: DIVIDER }
    )
    .setFooter({ text: 'Click "Vote to Join" to cast your vote!' })
    .setTimestamp();
}

// ─── Boost Embed ─────────────────────────────────────────────────────────────
export function buildBoostEmbed(
  info: PRCServerInfo,
  queue: number,
  hostTag: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Config.colors.warning)
    .setTitle('🚀  Session Boost')
    .setDescription(`${DIVIDER}\nA session is currently **active** and needs more players!`)
    .addFields(
      { name: '🏙️  Server', value: info.Name || 'ERLC Server', inline: true },
      { name: '🔑  Join Code', value: `\`${info.JoinKey}\``, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '👥  Players', value: `\`${info.CurrentPlayers} / ${info.MaxPlayers}\``, inline: true },
      { name: '📋  Queue', value: `\`${queue}\``, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '👑  Hosted by', value: hostTag, inline: true },
      { name: '\u200B', value: DIVIDER }
    )
    .setFooter({ text: 'Join now to participate!' })
    .setTimestamp();
}

// ─── Infraction Embed ────────────────────────────────────────────────────────
export function buildInfractionEmbed(params: {
  userTag: string;
  userId: string;
  moderatorTag: string;
  type: string;
  reason: string;
  evidence?: string;
  expiresAt?: Date;
  caseId: string;
}): EmbedBuilder {
  const fields = [
    { name: '👤  Staff Member', value: `<@${params.userId}> (${params.userTag})`, inline: true },
    { name: '🛡️  Moderator', value: params.moderatorTag, inline: true },
    { name: '\u200B', value: '\u200B', inline: false },
    { name: '⚠️  Infraction Type', value: `\`${params.type}\``, inline: true },
    { name: '🗒️  Reason', value: params.reason, inline: false },
  ];

  if (params.evidence) {
    fields.push({ name: '🖼️  Evidence', value: params.evidence, inline: false });
  }
  if (params.expiresAt) {
    fields.push({
      name: '📅  Expires',
      value: `<t:${Math.floor(params.expiresAt.getTime() / 1000)}:F>`,
      inline: true,
    });
  }

  fields.push({ name: '\u200B', value: DIVIDER, inline: false });

  return new EmbedBuilder()
    .setColor(Config.colors.infraction)
    .setTitle(`🚨  Infraction Issued — Case #${params.caseId}`)
    .setDescription(DIVIDER)
    .addFields(fields)
    .setFooter({ text: `Case ID: ${params.caseId}` })
    .setTimestamp();
}

// ─── Promotion Embed ─────────────────────────────────────────────────────────
export function buildPromotionEmbed(params: {
  userTag: string;
  userId: string;
  promoterTag: string;
  action: string;
  fromRank?: string;
  toRank: string;
  reason?: string;
}): EmbedBuilder {
  const actionLabel =
    params.action === 'promote' ? '📈  Promoted'
    : params.action === 'demote' ? '📉  Demoted'
    : '🔧  Rank Set';

  const color =
    params.action === 'promote' ? Config.colors.success
    : params.action === 'demote' ? Config.colors.error
    : Config.colors.info;

  const fields = [
    { name: '👤  Staff Member', value: `<@${params.userId}> (${params.userTag})`, inline: true },
    { name: '🛡️  Issued by', value: params.promoterTag, inline: true },
    { name: '\u200B', value: '\u200B', inline: false },
  ];

  if (params.fromRank) {
    fields.push({ name: '📍  Previous Rank', value: `\`${params.fromRank}\``, inline: true });
  }
  fields.push({ name: '🎯  New Rank', value: `\`${params.toRank}\``, inline: true });

  if (params.reason) {
    fields.push({ name: '\u200B', value: '\u200B', inline: false });
    fields.push({ name: '🗒️  Reason', value: params.reason, inline: false });
  }

  fields.push({ name: '\u200B', value: DIVIDER, inline: false });

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${actionLabel}`)
    .setDescription(DIVIDER)
    .addFields(fields)
    .setTimestamp();
}

// ─── Preview Post Embed ──────────────────────────────────────────────────────
export function buildPreviewEmbed(params: {
  title: string;
  description: string;
  imageUrl?: string;
  authorTag: string;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Config.colors.primary)
    .setTitle(params.title)
    .setDescription(`${DIVIDER}\n${params.description}\n\n${DIVIDER}`)
    .setFooter({ text: `Posted by ${params.authorTag}` })
    .setTimestamp();

  if (params.imageUrl) embed.setImage(params.imageUrl);

  return embed;
}

// ─── Error Embed ─────────────────────────────────────────────────────────────
export function buildErrorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Config.colors.error)
    .setTitle(`❌  ${title}`)
    .setDescription(description)
    .setTimestamp();
}

// ─── Success Embed ───────────────────────────────────────────────────────────
export function buildSuccessEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Config.colors.success)
    .setTitle(`✅  ${title}`)
    .setDescription(description)
    .setTimestamp();
}

// ─── ERLC Server Info Embed ──────────────────────────────────────────────────
export function buildServerInfoEmbed(info: PRCServerInfo, players: PRCPlayer[], queue: number): EmbedBuilder {
  const staff = players.filter(
    (p) => p.Permission !== 'Normal'
  );

  return new EmbedBuilder()
    .setColor(Config.colors.primary)
    .setTitle('🏙️  Server Information')
    .setDescription(DIVIDER)
    .addFields(
      { name: '📛  Name', value: info.Name, inline: true },
      { name: '🔑  Join Code', value: `\`${info.JoinKey}\``, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '👥  Players', value: `\`${info.CurrentPlayers} / ${info.MaxPlayers}\``, inline: true },
      { name: '📋  Queue', value: `\`${queue}\``, inline: true },
      { name: '👮  Staff Online', value: `\`${staff.length}\``, inline: true },
      { name: '\u200B', value: DIVIDER }
    )
    .setTimestamp();
}
