import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import Redis from 'ioredis';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const redisSub = new Redis(process.env.REDIS_URL!);
const redis = new Redis(process.env.REDIS_URL!);
const API_URL = process.env.API_URL || 'http://localhost:3000';

async function init() {
  await client.login(process.env.DISCORD_TOKEN);

  client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
    redisSub.subscribe('calls:new', 'calls:updated');
  });

  redisSub.on('message', async (channel, message) => {
    const call = JSON.parse(message);

    if (channel === 'calls:new') {
      const alertChannelId = process.env.DISCORD_ALERT_CHANNEL_ID;
      if (!alertChannelId) return;

      const channel = await client.channels.fetch(alertChannelId);
      if (!channel || channel.type !== 0) return;

      const embed = {
        title: `Call - ${call.talkgroup?.alphaTag || call.talkgroupId}`,
        description: (call.transcription || 'No transcription').slice(0, 4096),
        color: call.category === 'fire' ? 0xff0000 : call.category === 'police' ? 0x0000ff : 0x888888,
        timestamp: new Date().toISOString()
      };

      await (channel as TextChannel).send({ embeds: [embed] });
    }
  });
}

init().catch(console.error);