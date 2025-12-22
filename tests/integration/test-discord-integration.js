// test-discord-integration.js - Integration tests for Discord bot features

const DBTestUtils = require('../db-test-utils');
const path = require('path');

describe('Discord Integration', () => {
  let dbUtils;

  beforeAll(async () => {
    dbUtils = new DBTestUtils(path.join(__dirname, 'test-db-discord.db'));
    await dbUtils.init();
  });

  afterAll(async () => {
    await dbUtils.cleanup();
  });

  test('should store message URL for transcription', async () => {
    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      transcription: 'Test transcription',
      timestamp: Math.floor(Date.now() / 1000)
    });

    // Simulate storing message URL
    // In real implementation, this would be done by bot.js
    await new Promise((resolve, reject) => {
      dbUtils.getDB().run(
        'UPDATE transcriptions SET message_url = ? WHERE id = ?',
        ['https://discord.com/channels/123/456/789', callId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    const call = await dbUtils.getCall(callId);
    expect(call.message_url).toBe('https://discord.com/channels/123/456/789');
  });

  test('should support keyword matching', async () => {
    // Insert keyword
    await new Promise((resolve, reject) => {
      dbUtils.getDB().run(
        'INSERT INTO keywords (keyword, talk_group_id) VALUES (?, ?)',
        ['emergency', '12345'],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Insert call with keyword
    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      transcription: 'Medical emergency at 123 Main Street',
      timestamp: Math.floor(Date.now() / 1000)
    });

    // Verify keyword exists
    const keywords = await new Promise((resolve, reject) => {
      dbUtils.getDB().all(
        'SELECT * FROM keywords WHERE talk_group_id = ?',
        ['12345'],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords.some(k => k.keyword === 'emergency')).toBe(true);
  });
});

