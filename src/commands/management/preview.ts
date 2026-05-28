import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  TextChannel,
  Message,
} from 'discord.js';
import { Command, BotClient } from '../../types';
import { hasSessionPerms } from '../../utils/permissions';
import { buildErrorEmbed, buildSuccessEmbed, bannerEmbed, buildPreviewEmbed } from '../../services/embeds/embedBuilder';
import { PreviewPost } from '../../database/schemas/PreviewPost';
import { Config } from '../../config/config';
import { logger } from '../../utils/logger';

const data = new SlashCommandBuilder()
  .setName('preview')
  .setDescription('Manage preview/media posts')
  .addSubcommand((s) =>
    s.setName('post').setDescription('Post a preview immediately')
      .addStringOption((o) => o.setName('title').setDescription('Title').setRequired(true))
      .addStringOption((o) => o.setName('description').setDescription('Description').setRequired(true))
      .addStringOption((o) => o.setName('image').setDescription('Image URL').setRequired(false))
  )
  .addSubcommand((s) =>
    s.setName('schedule').setDescription('Schedule a preview post')
      .addStringOption((o) => o.setName('title').setDescription('Title').setRequired(true))
      .addStringOption((o) => o.setName('description').setDescription('Description').setRequired(true))
      .addIntegerOption((o) => o.setName('minutes').setDescription('Minutes until post').setRequired(true))
      .addStringOption((o) => o.setName('image').setDescription('Image URL').setRequired(false))
  )
  .addSubcommand((s) =>
    s.setName('delete').setDescription('Cancel a scheduled preview')
      .addStringOption((o) => o.setName('id').setDescription('Post ID (last 6 chars)').setRequired(true))
  );

async function execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const member = interaction.member as GuildMember;
  if (!hasSessionPerms(member)) {
    await interaction.reply({ embeds: [buildErrorEmbed('No Permission', 'You need Session perms.')], ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  const sub            = interaction.options.getSubcommand();
  const previewChannel = interaction.guild!.channels.cache.get(Config.channels.previews) as TextChannel;

  if (!previewChannel) {
    await interaction.editReply({ embeds: [buildErrorEmbed('Config Error', 'Preview channel not configured.')] });
    return;
  }

  switch (sub) {
    case 'post': {
      const title       = interaction.options.getString('title', true);
      const description = interaction.options.getString('description', true);
      const imageUrl    = interaction.options.getString('image') ?? undefined;

      try {
        const embeds = [
          bannerEmbed(Config.banners.previews),
          buildPreviewEmbed({ title, description, imageUrl, authorTag: interaction.user.tag }),
        ];

        const msg = await previewChannel.send({ embeds });

        await PreviewPost.create({
          guildId: interaction.guildId!, authorId: interaction.user.id, authorTag: interaction.user.tag,
          title, description, imageUrl, channelId: previewChannel.id, messageId: msg.id, posted: true,
        });

        await interaction.editReply({ embeds: [buildSuccessEmbed('Preview Posted', `Posted to <#${previewChannel.id}>.`)] });
      } catch (err) {
        logger.error('PreviewCommand', 'Failed to post', err);
        await interaction.editReply({ embeds: [buildErrorEmbed('Error', 'Failed to post preview.')] });
      }
      break;
    }

    case 'schedule': {
      const title       = interaction.options.getString('title', true);
      const description = interaction.options.getString('description', true);
      const minutes     = interaction.options.getInteger('minutes', true);
      const imageUrl    = interaction.options.getString('image') ?? undefined;
      const scheduledAt = new Date(Date.now() + minutes * 60000);

      try {
        const post    = await PreviewPost.create({
          guildId: interaction.guildId!, authorId: interaction.user.id, authorTag: interaction.user.tag,
          title, description, imageUrl, channelId: previewChannel.id, scheduledAt, posted: false,
        });
        const postId = (post._id as unknown as string).toString().slice(-6).toUpperCase();

        setTimeout(async () => {
          try {
            const embeds = [
              bannerEmbed(Config.banners.previews),
              buildPreviewEmbed({ title, description, imageUrl, authorTag: interaction.user.tag }),
            ];
            const msg = await previewChannel.send({ embeds });
            await PreviewPost.findByIdAndUpdate(post._id, { messageId: msg.id, posted: true });
          } catch (err) {
            logger.error('PreviewCommand', 'Failed to send scheduled preview', err);
          }
        }, minutes * 60000);

        await interaction.editReply({ embeds: [buildSuccessEmbed('Preview Scheduled', `ID \`${postId}\` — posts to <#${previewChannel.id}> in **${minutes} min**.`)] });
      } catch (err) {
        logger.error('PreviewCommand', 'Failed to schedule', err);
        await interaction.editReply({ embeds: [buildErrorEmbed('Error', 'Failed to schedule preview.')] });
      }
      break;
    }

    case 'delete': {
      const rawId = interaction.options.getString('id', true).toUpperCase();
      try {
        const posts = await PreviewPost.find({ guildId: interaction.guildId!, posted: false });
        const match = posts.find((p) => (p._id as unknown as string).toString().slice(-6).toUpperCase() === rawId);

        if (!match) {
          await interaction.editReply({ embeds: [buildErrorEmbed('Not Found', `No scheduled preview with ID \`${rawId}\`.`)] });
          return;
        }

        await PreviewPost.findByIdAndDelete(match._id);
        await interaction.editReply({ embeds: [buildSuccessEmbed('Cancelled', `Preview \`${rawId}\` has been deleted.`)] });
      } catch (err) {
        logger.error('PreviewCommand', 'Failed to delete', err);
        await interaction.editReply({ embeds: [buildErrorEmbed('Error', 'Failed to delete preview.')] });
      }
      break;
    }
  }
}

async function prefixExecute(message: Message, args: string[], client: BotClient): Promise<void> {
  const sub = args[0]?.toLowerCase();
  if (!sub) {
    await message.reply({ embeds: [buildErrorEmbed('Usage', 'Usage: `>preview <post|schedule|delete>`')] });
    return;
  }
  await message.reply({ embeds: [buildErrorEmbed('Use Slash Command', `Please use \`/preview ${sub}\` for full functionality.`)] });
}

const command: Command = { data, execute, prefixExecute, cooldown: 5 };
export default command;
