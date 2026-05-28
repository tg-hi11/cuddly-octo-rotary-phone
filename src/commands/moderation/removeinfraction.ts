import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember, Message } from 'discord.js';
import { Command, BotClient } from '../../types';
import { hasInfractionPerms } from '../../utils/permissions';
import { buildErrorEmbed, buildSuccessEmbed } from '../../services/embeds/embedBuilder';
import { Infraction } from '../../database/schemas/Infraction';
import { logger } from '../../utils/logger';

const data = new SlashCommandBuilder()
  .setName('removeinfraction')
  .setDescription('Void an infraction by case ID')
  .addStringOption((o) => o.setName('caseid').setDescription('6-character case ID').setRequired(true));

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const member = interaction.member as GuildMember;
  if (!hasInfractionPerms(member)) {
    await interaction.reply({ embeds: [buildErrorEmbed('No Permission', 'You need Infraction perms.')], ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  const caseId = interaction.options.getString('caseid', true).toUpperCase();

  try {
    const infractions = await Infraction.find({ guildId: interaction.guildId!, active: true });
    const match = infractions.find((i) => (i._id as unknown as string).toString().slice(-6).toUpperCase() === caseId);

    if (!match) {
      await interaction.editReply({ embeds: [buildErrorEmbed('Not Found', `No active infraction with case ID \`${caseId}\`.`)] });
      return;
    }

    match.active = false;
    await match.save();

    await interaction.editReply({ embeds: [buildSuccessEmbed('Infraction Voided', `Case \`#${caseId}\` has been removed.`)] });
  } catch (err) {
    logger.error('RemoveInfraction', 'Failed', err);
    await interaction.editReply({ embeds: [buildErrorEmbed('Error', 'Failed to remove infraction.')] });
  }
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  await message.reply({ embeds: [buildErrorEmbed('Use Slash Command', 'Please use `/removeinfraction`.')] });
}

const command: Command = { data, execute, prefixExecute, cooldown: 3 };
export default command;
