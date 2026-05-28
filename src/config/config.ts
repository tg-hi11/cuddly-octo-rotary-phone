import dotenv from 'dotenv';
dotenv.config();

export const Config = {
  token: process.env.DISCORD_TOKEN!,
  clientId: process.env.CLIENT_ID!,
  prefix: process.env.PREFIX || '>',

  erlcApiKey: process.env.ERLC_API_KEY!,
  erlcBaseUrl: 'https://api.policeroleplay.community/v1',

  mongoUri: process.env.MONGODB_URI!,

  roles: {
    sessionPerms: process.env.SESSION_PERMS_ROLE!,
    infractionPerms: process.env.INFRACTION_PERMS_ROLE!,
    promotionPerms: process.env.PROMOTION_PERMS_ROLE!,
  },

  channels: {
    sessions: process.env.SESSIONS_CHANNEL_ID!,
    previews: process.env.PREVIEWS_CHANNEL_ID!,
    promotions: process.env.PROMO_CHANNEL_ID!,
    infractions: process.env.INFRACTION_CHANNEL_ID!,
  },

  banners: {
    sessionVote:   'https://media.discordapp.net/attachments/1502972392803401818/1508782355618463856/Group_6_1.png?ex=6a181c11&is=6a16ca91&hm=6966e1f23cd0741b4a6373a692f7812c48e6b0c8dac44fd05c75a9abe98738cb&=&format=webp&quality=lossless',
    sessionStatus: 'https://media.discordapp.net/attachments/1502972392803401818/1508777477764550758/Group_6.png?ex=6a181786&is=6a16c606&hm=9e5a82cde8d5e48da9df022188a9ca32ea3b2fcde58e829efcbd5b93e73b4d5c&=&format=webp&quality=lossless',
    infractions:   'https://media.discordapp.net/attachments/1502972392803401818/1509317079621435593/Group_6_1.png?ex=6a18bc91&is=6a176b11&hm=25c84d1d74000b7dd9f4c919742696592ee2b9d53006db7be621d89746f70211&=&format=webp&quality=lossless&width=1200&height=361',
    promotions:    'https://media.discordapp.net/attachments/1502972392803401818/1509317079910846655/Group_6.png?ex=6a18bc91&is=6a176b11&hm=ffe1d21e1d6a499b69a11126863e8f0eeaacf62eef365fa16e5a201ac7876ac0&=&format=webp&quality=lossless&width=1200&height=361',
    previews:      'https://media.discordapp.net/attachments/1502972392803401818/1509317280520212603/Group_6_4.png?ex=6a18bcc1&is=6a176b41&hm=87e4abb8ed28814922f307d2d9fb60f999bc04e337fd0d3d976ccc489b50b4bf&=&format=webp&quality=lossless',
    bottom:        'https://media.discordapp.net/attachments/1502972392803401818/1509461950503977082/Group_8.png?ex=6a19437d&is=6a17f1fd&hm=d63a628c5f329bbda3872cc6f5e1e33f922cfa807b9c6a78b406a46437b78446&=&format=webp&quality=lossless&width=1304&height=141',
  },

  colors: {
    primary:    0x2B2D31,
    success:    0x57F287,
    error:      0xED4245,
    warning:    0xFEE75C,
    info:       0x5865F2,
    infraction: 0xED4245,
    promotion:  0x57F287,
  },

  session: {
    voteThreshold:   5,
    voteTimeout:     300000,
    refreshInterval: 30000,
  },
};
