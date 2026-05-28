import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember, Message } from 'discord.js';
import { Command, BotClient } from '../../types';
import { prcApi } from '../../services/prc/prcApi';
import { buildSuccessEmbed, buildErrorEmbed, bottomBannerEmbed } from '../../services/embeds/embedBuilder';
import { hasSessionPerms } from '../../utils/permissions';

const data = new SlashCommandBuilder()
  .setName('erlccommand')
  .setDescription('Execute an in-game ERLC command')
  .addStringOption((o) => o.setName('command').setDescription('The command to execute in-game').setRequired(true));

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const member = interaction.member as GuildMember;
  if (!hasSessionPerms(member)) {
    await interaction.reply({ embeds: [buildErrorEmbed('No Permission', 'You do not have permission to execute in-game commands.')], ephemeral: true });
    return;
  }

  const command = interaction.options.getString('command', true);
  await interaction.deferReply({ ephemeral: true });

  try {
    await prcApi.executeCommand(command);
    await interaction.editReply({ embeds: [buildSuccessEmbed('Command Executed', `\`${command}\` was sent successfully.`), bottomBannerEmbed()] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to execute command.';
    await interaction.editReply({ embeds: [buildErrorEmbed('Execution Failed', msg)] });
  }
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  const member = message.member as GuildMember;
  if (!hasSessionPerms(member)) {
    await message.reply({ embeds: [buildErrorEmbed('No Permission', 'You do not have permission.')] });
    return;
  }
  if (!args[0]) {
    await message.reply({ embeds: [buildErrorEmbed('Usage', 'Usage: `>erlccommand <command>`')] });
    return;
  }
  const cmd = args.join(' ');
  try {
    await prcApi.executeCommand(cmd);
    await message.reply({ embeds: [buildSuccessEmbed('Command Executed', `\`${cmd}\` was sent successfully.`), bottomBannerEmbed()] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to execute command.';
    await message.reply({ embeds: [buildErrorEmbed('Execution Failed', msg)] });
  }
}

const command: Command = { data, execute, prefixExecute, cooldown: 5 };
export default command;
