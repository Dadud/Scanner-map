import { Client, GatewayIntentBits, Events, ChannelType, TextChannel, VoiceChannel } from 'discord.js';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const API_URL = process.env.API_URL || 'http://localhost:3000';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages
  ]
});

const redisSub = new Redis(REDIS_URL);
const redis = new Redis(REDIS_URL);

const activeVoiceConnections = new Map<string, TextChannel>();
const talkgroupChannels = new Map<string, VoiceChannel>();

async function initializeDiscord() {
  const alertChannelName = process.env.DISCORD_ALERT_CHANNEL || 'alerts';
  const summaryChannelName = process.env.DISCORD_SUMMARY_CHANNEL || 'summary';

  client.on(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user?.tag}`);

    await redisSub.subscribe('calls:new', 'calls:updated');
  });

  redisSub.on('message', async (channel, message) => {
    if (channel === 'calls:new') {
      const call = JSON.parse(message);
      await handleNewCall(call);
    } else if (channel === 'calls:updated') {
      const call = JSON.parse(message);
      await handleUpdatedCall(call);
    }
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const prefix = '!scanner ';
    if (message.content.startsWith(prefix)) {
      const command = message.content.slice(prefix.length).split(' ')[0];
      const args = message.content.slice(prefix.length).split(' ').slice(1);

      await handleCommand(message, command, args);
    }
  });

  await client.login(DISCORD_TOKEN);
}

async function handleNewCall(call: any) {
  try {
    const alertChannelId = process.env.DISCORD_ALERT_CHANNEL_ID;
    if (!alertChannelId) return;

    const alertChannel = await client.channels.fetch(alertChannelId);
    if (!alertChannel || alertChannel.type !== ChannelType.GuildText) return;

    const talkgroup = call.talkgroup;
    const transcription = call.transcription || 'No transcription available';

    const embed = {
      title: `New Call - ${talkgroup?.alphaTag || call.talkgroupId}`,
      description: transcription.slice(0, 4096),
      color: getCategoryColor(call.category),
      fields: [
        { name: 'Talkgroup', value: talkgroup?.alphaTag || 'Unknown', inline: true },
        { name: 'Category', value: call.category || 'Unknown', inline: true },
        { name: 'Time', value: new Date(call.timestamp).toLocaleString(), inline: true }
      ]
    };

    if (call.address) {
      embed.fields!.push({ name: 'Address', value: call.address, inline: false });
    }

    await (alertChannel as TextChannel).send({ embeds: [embed] });

    await checkKeywords(call, alertChannel as TextChannel);

  } catch (error) {
    console.error('Error handling new call:', error);
  }
}

async function handleUpdatedCall(call: any) {
  if (!call.transcription) return;

  const summaryChannelId = process.env.DISCORD_SUMMARY_CHANNEL_ID;
  if (!summaryChannelId) return;

  const summaryChannel = await client.channels.fetch(summaryChannelId);
  if (!summaryChannel || summaryChannel.type !== ChannelType.GuildText) return;

  const embed = {
    title: `Updated Transcription - ${call.talkgroup?.alphaTag || call.talkgroupId}`,
    description: call.transcription.slice(0, 4096),
    color: 0x00ff00,
    timestamp: new Date().toISOString()
  };

  await (summaryChannel as TextChannel).send({ embeds: [embed] });
}

async function checkKeywords(call: any, channel: TextChannel) {
  const keywordsResponse = await fetch(`${API_URL}/api/admin/keywords`);
  const keywords = await keywordsResponse.json();

  const transcription = (call.transcription || '').toLowerCase();

  for (const kw of keywords) {
    if (transcription.includes(kw.keyword.toLowerCase())) {
      const embed = {
        title: 'Keyword Alert',
        description: `**${kw.keyword}** mentioned in talkgroup ${call.talkgroupId}`,
        color: 0xff0000
      };
      await channel.send({ embeds: [embed] });
    }
  }
}

async function handleCommand(message: any, command: string, args: string[]) {
  switch (command) {
    case 'talkgroups':
      await message.reply('Use the web interface to manage talkgroups.');
      break;
    case 'alerts':
      await message.reply('Use the web interface to manage keyword alerts.');
      break;
    case 'help':
      await message.reply('Scanner Bot Commands:\n!scanner talkgroups - View talkgroups\n!scanner alerts - Manage alerts\n!scanner help - This help message');
      break;
    default:
      await message.reply('Unknown command. Use !scanner help for available commands.');
  }
}

function getCategoryColor(category: string | undefined): number {
  const colors: Record<string, number> = {
    'fire': 0xff0000,
    'police': 0x0000ff,
    'ems': 0x00ff00,
    'rescue': 0xffff00
  };
  return colors[category?.toLowerCase() || ''] || 0x888888;
}

initializeDiscord().catch(console.error);
