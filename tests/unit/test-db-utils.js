// test-db-utils.js - Unit tests for database utilities

const DBTestUtils = require('../db-test-utils');
const path = require('path');
const fs = require('fs');

describe('DBTestUtils', () => {
  let dbUtils;
  const dbPath = path.join(__dirname, 'test-db-unit.db');

  beforeAll(async () => {
    dbUtils = new DBTestUtils(dbPath);
    await dbUtils.init();
  });

  afterAll(async () => {
    await dbUtils.cleanup();
  });

  test('should create tables', async () => {
    const calls = await dbUtils.getAllCalls();
    expect(Array.isArray(calls)).toBe(true);
  });

  test('should insert a call', async () => {
    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      transcription: 'Test transcription',
      timestamp: Math.floor(Date.now() / 1000)
    });

    expect(callId).toBeGreaterThan(0);

    const call = await dbUtils.getCall(callId);
    expect(call).toBeDefined();
    expect(call.transcription).toBe('Test transcription');
  });

  test('should update transcription', async () => {
    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      timestamp: Math.floor(Date.now() / 1000)
    });

    await dbUtils.updateTranscription(callId, 'Updated transcription');

    const call = await dbUtils.getCall(callId);
    expect(call.transcription).toBe('Updated transcription');
  });

  test('should update address and coordinates', async () => {
    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      timestamp: Math.floor(Date.now() / 1000)
    });

    await dbUtils.updateAddress(callId, '123 Main Street', 39.2904, -76.6122);

    const call = await dbUtils.getCall(callId);
    expect(call.address).toBe('123 Main Street');
    expect(call.lat).toBe(39.2904);
    expect(call.lon).toBe(-76.6122);
  });

  test('should update category', async () => {
    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      timestamp: Math.floor(Date.now() / 1000)
    });

    await dbUtils.updateCategory(callId, 'MEDICAL EMERGENCY');

    const call = await dbUtils.getCall(callId);
    expect(call.category).toBe('MEDICAL EMERGENCY');
  });

  test('should query calls by time range', async () => {
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - 3600; // 1 hour ago
    const endTime = now + 3600; // 1 hour from now

    await dbUtils.insertCall({
      talkGroupID: '12345',
      timestamp: now
    });

    const calls = await dbUtils.getCallsByTimeRange(startTime, endTime);
    expect(calls.length).toBeGreaterThan(0);
  });

  test('should query calls by talkgroup', async () => {
    await dbUtils.insertCall({
      talkGroupID: '99999',
      timestamp: Math.floor(Date.now() / 1000)
    });

    const calls = await dbUtils.getCallsByTalkgroup('99999');
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0].talk_group_id).toBe('99999');
  });

  test('should purge calls', async () => {
    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      address: '123 Main Street',
      lat: 39.2904,
      lon: -76.6122,
      timestamp: Math.floor(Date.now() / 1000)
    });

    await dbUtils.purgeCalls({
      talkgroupIds: ['12345']
    });

    const call = await dbUtils.getCall(callId);
    expect(call.lat).toBeNull();
    expect(call.lon).toBeNull();
  });
});

