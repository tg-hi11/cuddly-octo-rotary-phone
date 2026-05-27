import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  Message,
  Client,
  Collection,
  SharedSlashCommand,
} from 'discord.js';

export interface BotClient extends Client {
  commands: Collection<string, Command>;
  cooldowns: Collection<string, Collection<string, number>>;
}

export interface Command {
  data: SharedSlashCommand;
  category?: string;
  cooldown?: number;
  execute: (interaction: ChatInputCommandInteraction, client: BotClient) => Promise<void>;
  prefixExecute?: (message: Message, args: string[], client: BotClient) => Promise<void>;
}

export interface Event {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void> | void;
}

// PRC API Types
export interface PRCServerInfo {
  Name: string;
  OwnerId: string;
  CoOwnerIds: string[];
  CurrentPlayers: number;
  MaxPlayers: number;
  JoinKey: string;
  AccVerifiedReq: string;
  TeamBalance: boolean;
}

export interface PRCPlayer {
  Player: string;
  Permission: string;
  Callsign: string;
  Team: string;
}

export interface PRCKillLog {
  Killed: string;
  Killer: string;
  Kill_Time: number;
}

export interface PRCJoinLog {
  Join_Time: number;
  Player: string;
}

export interface PRCCommandLog {
  Player: string;
  Command: string;
  Timestamp: number;
}

export interface PRCModCall {
  Caller: string;
  Moderator: string;
}

export interface PRCVehicle {
  Name: string;
  Owner: string;
  Texture: string;
}

export interface PRCQueue {
  Queue: number;
}

// Session Types
export interface SessionData {
  guildId: string;
  hostId: string;
  hostTag: string;
  startTime: Date;
  messageId?: string;
  channelId?: string;
  peakPlayers: number;
  status: 'active' | 'shutdown';
  isLocked: boolean;
}

// Infraction Types
export type InfractionType =
  | 'Verbal Warning'
  | 'Warning'
  | 'Strike'
  | 'Demotion'
  | 'Suspension'
  | 'Termination'
  | 'Staff Blacklist';

// Promotion Types
export interface RankData {
  name: string;
  roleId: string;
  level: number;
}
