// test-transcription-server.js - Unit tests for transcription server mocking

const { MockTranscriptionServer } = require('../mock-transcription-server');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

describe('MockTranscriptionServer', () => {
  let server;
  const port = 8765;

  beforeAll(async () => {
    server = new MockTranscriptionServer(port);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.reset();
  });

  test('should respond to transcription requests', async () => {
    const form = new FormData();
    const testAudio = Buffer.alloc(1024);
    form.append('audio', testAudio, { filename: 'test.mp3' });

    const response = await fetch(`http://localhost:${port}/transcribe`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('text');
  });

  test('should handle OpenAI-style requests', async () => {
    const form = new FormData();
    const testAudio = Buffer.alloc(1024);
    form.append('file', testAudio, { filename: 'test.mp3' });

    const response = await fetch(`http://localhost:${port}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('text');
  });

  test('should return empty transcription when configured', async () => {
    server.configure({ empty: true });

    const form = new FormData();
    const testAudio = Buffer.alloc(1024);
    form.append('audio', testAudio, { filename: 'test.mp3' });

    const response = await fetch(`http://localhost:${port}/transcribe`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const data = await response.json();
    expect(data.text).toBe('');
  });

  test('should handle errors', async () => {
    server.configure({ error: 'Transcription failed' });

    const form = new FormData();
    const testAudio = Buffer.alloc(1024);
    form.append('audio', testAudio, { filename: 'test.mp3' });

    const response = await fetch(`http://localhost:${port}/transcribe`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Transcription failed');
  });

  test('should handle timeouts', async () => {
    server.configure({ timeout: true });

    const form = new FormData();
    const testAudio = Buffer.alloc(1024);
    form.append('audio', testAudio, { filename: 'test.mp3' });

    const response = await fetch(`http://localhost:${port}/transcribe`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    expect(response.status).toBe(504);
  });
});

