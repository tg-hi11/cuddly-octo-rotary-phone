import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Config } from '../../config/config';
import { E } from '../../config/emojis';
import { PRCServerInfo, PRCPlayer } from '../../types';
import { formatDuration } from '../../utils/formatters';
import { ISession } from '../../database/schemas/Session';

// ─── Shared helpers ───────────────────────────────────────────────────────────

export function bannerEmbed(url: string): EmbedBuilder {
  return new EmbedBuilder().setImage(url).setColor(0xFFFFFF);
}

export function bottomBannerEmbed(): EmbedBuilder {
  return new EmbedBuilder().setImage(Config.banners.bottom).setColor(0xFFFFFF);
}

// ─── Session Startup ──────────────────────────────────────────────────────────

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

  const uptime   = formatDuration(Date.now() - session.startTime.getTime());
  const staffStr = staff.length > 0 ? staff.map((s) => `\`${s.Player}\``).join(', ') : 'None';
  const lock     = session.isLocked ? '`Locked`' : '`Open`';
  const full     = session.isFull   ? '`Full`'   : '`Available`';

  return new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setDescription(
      `${E.leaf1} **Session Active**\n` +
      `\n` +
      `${E.roblox} **Server** — ${info.Name || 'ERLC Server'}\n` +
      `${E.giveaway} **Join Code** — \`${info.JoinKey}\`\n` +
      `\n` +
      `${E.person} **Players** — \`${info.CurrentPlayers} / ${info.MaxPlayers}\`\n` +
      `${E.dev} **Active Staff** — ${staffStr}\n` +
      `\n` +
      `${E.notif} **Host** — <@${session.hostId}>\n` +
      `${E.calendar} **Uptime** — \`${uptime}\`\n` +
      `\n` +
      `${E.restricted} **Status** — ${lock} · ${full}`
    )
    .setFooter({ text: `Last refreshed: ${secondsAgo}s ago` });
}

export function buildSessionButtons(voteCount: number, threshold: number): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('session_vote')
      .setLabel(`Vote to Join (${voteCount}/${threshold})`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('session_voters')
      .setLabel('Voters')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel('Join Server')
      .setStyle(ButtonStyle.Link)
      .setURL('https://policeroleplay.community/join/server')
  );
  return [row];
}

// ─── Session Shutdown ─────────────────────────────────────────────────────────

export function buildShutdownEmbed(session: ISession): EmbedBuilder {
  const duration = session.endTime
    ? formatDuration(session.endTime.getTime() - session.startTime.getTime())
    : 'N/A';

  return new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setDescription(
      `${E.moon} **Session Closed**\n` +
      `\n` +
      `${E.notif} **Host** — <@${session.hostId}>\n` +
      `${E.calendar} **Duration** — \`${duration}\`\n` +
      `${E.person} **Peak Players** — \`${session.peakPlayers}\`\n` +
      `\n` +
      `Thank you to everyone who attended.`
    )
    .setTimestamp();
}

// ─── Vote Embed ───────────────────────────────────────────────────────────────

export function buildVoteEmbed(
  initiatorTag: string,
  voters: string[],
  threshold: number,
  serverName: string,
  currentPlayers: number,
  maxPlayers: number,
  queue: number
): EmbedBuilder {
  const filled = Math.min(Math.floor((voters.length / threshold) * 10), 10);
  const bar    = '█'.repeat(filled) + '░'.repeat(10 - filled);

  return new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setDescription(
      `${E.giveaway} **Vote to Start**\n` +
      `\n` +
      `${E.roblox} **Server** — ${serverName}\n` +
      `${E.person} **Players** — \`${currentPlayers}/${maxPlayers}\`  ${E.folder} **Queue** — \`${queue}\`\n` +
      `\n` +
      `${E.dash} **Progress** — \`[${bar}] ${voters.length}/${threshold}\`\n` +
      `\n` +
      `${E.notif} Started by **${initiatorTag}** — click the button below to vote.`
    )
    .setFooter({ text: 'Voters are hidden. Use the Voters button to see who voted.' });
}

// ─── Boost Embed ──────────────────────────────────────────────────────────────

export function buildBoostEmbed(
  info: PRCServerInfo,
  queue: number,
  hostTag: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setDescription(
      `${E.notif} **Session Boost**\n` +
      `\n` +
      `${E.roblox} **Server** — ${info.Name || 'ERLC Server'}\n` +
      `${E.giveaway} **Join Code** — \`${info.JoinKey}\`\n` +
      `\n` +
      `${E.person} **Players** — \`${info.CurrentPlayers} / ${info.MaxPlayers}\`\n` +
      `${E.folder} **Queue** — \`${queue}\`\n` +
      `\n` +
      `${E.leaf1} **Hosted by** — ${hostTag}\n` +
      `\n` +
      `Join now and help us fill the server.`
    )
    .setTimestamp();
}

// ─── Infraction Embed ─────────────────────────────────────────────────────────

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
  let body =
    `${E.person} **Staff Member** — <@${params.userId}> (${params.userTag})\n` +
    `${E.gavel} **Issued by** — ${params.moderatorTag}\n` +
    `\n` +
    `${E.restricted} **Type** — \`${params.type}\`\n` +
    `${E.folder} **Reason** — ${params.reason}\n`;

  if (params.evidence) {
    body += `${E.search} **Evidence** — ${params.evidence}\n`;
  }
  if (params.expiresAt) {
    body += `${E.calendar} **Expires** — <t:${Math.floor(params.expiresAt.getTime() / 1000)}:F>\n`;
  }

  body += `\n${E.dash} **Case ID** — \`#${params.caseId}\``;

  return new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setDescription(body)
    .setTimestamp();
}

// ─── Promotion Embed ──────────────────────────────────────────────────────────

export function buildPromotionEmbed(params: {
  userTag: string;
  userId: string;
  promoterTag: string;
  action: string;
  fromRank?: string;
  toRank: string;
  reason?: string;
}): EmbedBuilder {
  const label =
    params.action === 'promote' ? `${E.thumbsup} **Promoted**`
    : params.action === 'demote' ? `${E.thumbsdown} **Demoted**`
    : `${E.dev} **Rank Set**`;

  let body =
    `${label}\n` +
    `\n` +
    `${E.person} **Staff Member** — <@${params.userId}> (${params.userTag})\n` +
    `${E.gavel} **Issued by** — ${params.promoterTag}\n` +
    `\n`;

  if (params.fromRank) {
    body += `${E.dash} **From** — \`${params.fromRank}\`\n`;
  }
  body += `${E.leaf1} **To** — \`${params.toRank}\`\n`;

  if (params.reason) {
    body += `\n${E.folder} **Reason** — ${params.reason}\n`;
  }

  return new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setDescription(body)
    .setTimestamp();
}

// ─── Preview Post Embed ───────────────────────────────────────────────────────

export function buildPreviewEmbed(params: {
  title: string;
  description: string;
  imageUrl?: string;
  authorTag: string;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setTitle(params.title)
    .setDescription(params.description)
    .setFooter({ text: `Posted by ${params.authorTag}` })
    .setTimestamp();

  if (params.imageUrl) embed.setImage(params.imageUrl);
  return embed;
}

// ─── Server Info Embed ────────────────────────────────────────────────────────

export function buildServerInfoEmbed(
  info: PRCServerInfo,
  players: PRCPlayer[],
  queue: number
): EmbedBuilder {
  const staff = players.filter((p) => p.Permission !== 'Normal');

  return new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setDescription(
      `${E.roblox} **Server** — ${info.Name}\n` +
      `${E.giveaway} **Join Code** — \`${info.JoinKey}\`\n` +
      `\n` +
      `${E.person} **Players** — \`${info.CurrentPlayers} / ${info.MaxPlayers}\`\n` +
      `${E.folder} **Queue** — \`${queue}\`\n` +
      `${E.dev} **Staff Online** — \`${staff.length}\``
    )
    .setTimestamp();
}

// ─── Error / Success ──────────────────────────────────────────────────────────

export function buildErrorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setDescription(`${E.restricted} **${title}**\n${description}`)
    .setTimestamp();
}

export function buildSuccessEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setDescription(`${E.thumbsup} **${title}**\n${description}`)
    .setTimestamp();
}

export const DIVIDER = '';
