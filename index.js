const { Client, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// Goodbye keywords to end session
const goodbyeKeywords = ["bye", "goodbye", "see ya", "farewell", "later", "stop", "exit", "quit"];

// Personality triggers and responses — add or expand this list
const personalityResponses = {
  "hello": "Hi there! How can I help you today?",
  "hi": "Hello! What can I do for you?",
  "how are you": "I'm just a bot, but I'm doing great! Thanks for asking.",
  "what's your name": "I'm UK:LCRP custom chatbot, created by .voidnex.",
  "help": "Sure! Ask me anything about UK:LCRP or Discord.",
  "thank you": "You're very welcome!",
  "thanks": "No problem!",
  "who made you": "My creator is .voidnex.",
  "bye": "Goodbye! Hope to chat again soon.",
  "goodbye": "See you later!",
  "what is this server": "This is the UK:LCRP London City Roleplay Discord server.",
  "what can you do": "I can chat with you, answer questions, and keep you company!",
  "tell me a joke": "Why did the scarecrow win an award? Because he was outstanding in his field!",
  "what is your favorite british actor": "Benedict Cumberbatch is brilliant!",
  "how do i get verified": "Follow instructions in the #verify channel.",
  "can you tell me about british customs": "Tea time and queuing are famous British customs!",
  "what is your favorite british singer": "Ed Sheeran is very popular!",
  "how do i set up my profile": "Go to Discord user settings to customize your profile.",
  "what is your favorite british dish": "Shepherd’s pie is delicious!",
  "how do i join events": "Look out for event announcements and join when they start!",
  "can you tell me about british holidays": "Christmas and Easter are widely celebrated!",
  "what is your favorite british movie": "Notting Hill is a charming film!",
  "can you tell me a tongue twister": "Peter Piper picked a peck of pickled peppers!",
  "how do i report harassment": "Contact staff immediately via the #report channel.",
  "can you tell me a fun fact": "The London Eye is one of the tallest observation wheels in the world!",
  "what is your favorite british festival": "The Edinburgh Fringe Festival is amazing!",
  "can you tell me about british slang": "‘Mate’ means friend, and ‘cheers’ means thanks!",
  "how do i mute notifications": "Use Discord’s mute feature on channels or servers.",
  "can you help me with discord commands": "Sure! Ask about any command you want to know.",
  "what is your favorite british city": "Edinburgh is stunning!",
  "how do i get roles": "Participate and follow server rules to earn roles.",
  "can you tell me about british culture": "It’s rich with tradition, arts, and modern diversity!",
  "what is your favorite british sport": "Cricket is very traditional!",
  "how do i invite friends": "Use the invite link found in #welcome.",
  "can you tell me about british landmarks": "From Big Ben to Buckingham Palace, so many iconic sites!",
  "what is your favorite british food": "Cornish pasties are tasty!",
  "how do i report spam": "Report spam to staff or use the #report channel.",
  "what is your favorite british music": "Rock and pop have huge followings here!",
  "can you tell me a riddle": "What has a face and two hands but no arms or legs? A clock!",
  "how do i join voice chat": "Click on any available voice channel to join.",
  "can you tell me a funny story": "Once a bot tried to organize a party, but forgot to invite anyone!",
  "how do i change nickname": "Right click your name and select 'Change Nickname'.",
  "can you help me with server setup": "Sure, ask me any questions you have!",
  "how do i mute channels": "Right-click the channel and select 'Mute Channel'.",
  "how do i report bugs": "Use #bug-reports to let staff know.",
  "how do i get help": "Ping staff or ask me anytime!",
  "how do i change server language": "English is the default server language here.",
  "can you tell me about british history": "From monarchs to industrial revolution, it’s fascinating!",
  "how do i change text color": "Discord doesn’t support colored text natively.",
  // add more phrases here...
};

const fallbackResponses = [
  "I'm not sure how to respond to that. Can you ask something else?",
  "Sorry, I didn't get that. Could you rephrase?",
  "Hmm, interesting! Tell me more.",
  "I wish I knew more about that!",
  "That's cool! What else do you want to chat about?",
];

const activeChats = new Map();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const contentLower = message.content.toLowerCase();
  const isBotMentioned = message.mentions.has(client.user);

  // When bot is pinged, start chat session for that user in this channel
  if (isBotMentioned) {
    activeChats.set(message.author.id, message.channel.id);
    return message.channel.send(
      `Welcome to the UK:LCRP custom chatbot. My creator is .voidnex. How may I help you, <@${message.author.id}>?`
    );
  }

  // If user has active chat session and message is in that channel
  if (activeChats.has(message.author.id)) {
    const chatChannelId = activeChats.get(message.author.id);
    if (message.channel.id === chatChannelId) {
      // Check if user said goodbye
      if (goodbyeKeywords.some((word) => contentLower.includes(word))) {
        activeChats.delete(message.author.id);
        return message.channel.send(`Goodbye <@${message.author.id}>! If you want to chat again, just ping me.`);
      }

      // Check personality triggers
      for (const trigger in personalityResponses) {
        if (contentLower.includes(trigger)) {
          return message.channel.send(personalityResponses[trigger]);
        }
      }

      // No triggers matched — send fallback response
      const fallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      return message.channel.send(fallback);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);