const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');
require('ts-node/register');

// Load the real adapter with an in-memory WebSocket transport. No external calls.
const wsPath = require.resolve('ws');
require(wsPath);
const originalExports = require.cache[wsPath].exports;
let transport;
class FakeWebSocket extends EventEmitter {
  static OPEN = 1;
  constructor() {
    super();
    this.readyState = FakeWebSocket.OPEN;
    transport = this;
  }
  sent = [];
  send(data) { this.sent.push(data); }
  close() {}
}
let OpenAIRealtime;
try {
  require.cache[wsPath].exports = FakeWebSocket;
  OpenAIRealtime = require('../services/openaiRealtime').default;
} finally {
  require.cache[wsPath].exports = originalExports;
}

function receive(message) {
  const client = new OpenAIRealtime({ apiKey: 'test-only', model: 'test-only' });
  const audio = [];
  client.on('audio', (chunk) => audio.push(chunk));
  client.connect();
  transport.emit('message', Buffer.from(JSON.stringify(message)));
  client.close();
  return audio;
}

test('text and transcript deltas never become audio', () => {
  for (const type of [
    'response.output_text.delta',
    'response.text.delta',
    'response.output_audio_transcript.delta',
    'response.audio_transcript.delta',
    'conversation.item.input_audio_transcription.delta',
  ]) {
    assert.deepEqual(receive({ type, delta: 'Hello there' }), [], type);
  }
});

test('GA and preview audio deltas are forwarded unchanged', () => {
  const delta = Buffer.from([0, 0, 128, 0]).toString('base64');
  for (const type of ['response.output_audio.delta', 'response.audio.delta']) {
    assert.deepEqual(receive({ type, delta }), [delta], type);
  }
});

test('non-string audio deltas are not forwarded', () => {
  assert.deepEqual(receive({ type: 'response.output_audio.delta', delta: { audio: 123 } }), []);
});

test('session instructions precede greeting and response overrides are nested', () => {
  const instructions = require('../config/openaiPrompt').default;
  const client = new OpenAIRealtime({ apiKey: 'test-only', model: 'test-only', instructions });
  client.on('open', () => client.requestResponse());
  client.connect();
  transport.emit('open');
  client.requestResponse('Continue in Hindi');
  assert.deepEqual(transport.sent.map(JSON.parse), [
    { type: 'session.update', session: { type: 'realtime', instructions, audio: {
      output: { voice: 'shimmer' },
      input: { turn_detection: { type: 'server_vad', create_response: true, interrupt_response: false } },
    } } },
    { type: 'response.create' },
    { type: 'response.create', response: { instructions: 'Continue in Hindi' } },
  ]);
  client.close();
});

// Replay the reported failure. This checks logging, not model compliance.
test('reported bilingual response preserves distinct items without extra responses or playback', () => {
  const client = new OpenAIRealtime({
    apiKey: 'test-only', model: 'test-only', transcriptLogging: true,
    getCallId: () => 'test-reported-repetition',
  });
  const audio = [];
  const logs = [];
  const originalLog = console.log;
  const responseId = 'resp_EP27MgdsPmSVYDJZu5qdx';
  const items = [
    { id: 'item_EP27MiWArdbHmwacoWvXI', text: 'Theek hai, shukriya! Let’s move to your name now.' },
    { id: 'item_EP27MurzVl0TbaHyuFOuM', text: 'Bahut achha, shukriya! Apna naam bataiye, main uska dhanyavaad karna chahungi.' },
  ];
  const emit = (message) => transport.emit('message', Buffer.from(JSON.stringify(message)));
  try {
    console.log = (...args) => logs.push(args);
    client.on('audio', (chunk) => audio.push(chunk));
    client.connect();
    emit({ type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'item_EP27LL7n4uSahC80IVvzv', content_index: 0, transcript: 'हाँ।' });
    for (const item of items) {
      const event = { type: 'response.output_audio_transcript.done',
        item_id: item.id, response_id: responseId, content_index: 0, transcript: item.text };
      emit(event);
      emit(event);
    }
    emit({ type: 'response.done', response: { id: responseId, output: items.map((item) => ({
      id: item.id, role: 'assistant', content: [{ type: 'output_audio', transcript: item.text }],
    })) } });
    const entries = logs.filter(([tag]) => tag === '[CALL TRANSCRIPT]').map(([, data]) => JSON.parse(data));
    assert.equal(entries.length, 3);
    assert.equal(entries[0].text, 'हाँ।');
    assert.deepEqual(entries.slice(1), items.map((item) => ({ speaker: 'Priya', text: item.text })));
    assert.deepEqual(audio, [], 'transcripts do not produce audio');
    assert.deepEqual(transport.sent, [], 'transcripts and response.done do not request another response');
  } finally {
    console.log = originalLog;
    client.close();
  }
});

test('speech detection cancels once and suppresses old audio even after a new response starts', () => {
  const client = new OpenAIRealtime({ apiKey: 'test-only', model: 'test-only' });
  const audio = [];
  let speechEvents = 0;
  client.on('audio', (chunk) => audio.push(chunk));
  client.on('speech_started', () => speechEvents++);
  client.connect();
  const emit = (event) => transport.emit('message', Buffer.from(JSON.stringify(event)));
  emit({ type: 'response.created', response: { id: 'old' } });
  emit({ type: 'response.output_audio.delta', response_id: 'old', delta: 'AAAA' });
  emit({ type: 'input_audio_buffer.speech_started' });
  emit({ type: 'input_audio_buffer.speech_started' });
  assert.deepEqual(transport.sent.map(JSON.parse), [{ type: 'response.cancel', response_id: 'old' }]);
  assert.equal(speechEvents, 2);
  emit({ type: 'response.created', response: { id: 'new' } });
  emit({ type: 'response.done', response: { id: 'old' } });
  for (const type of ['response.audio.delta', 'response.output_audio.delta']) {
    emit({ type, response_id: 'old', delta: 'BBBB' });
  }
  emit({ type: 'response.output_audio.delta', response_id: 'new', delta: 'CCCC' });
  assert.deepEqual(audio, ['AAAA', 'CCCC']);
  emit({ type: 'input_audio_buffer.speech_started' });
  assert.deepEqual(transport.sent.map(JSON.parse).at(-1), { type: 'response.cancel', response_id: 'new' });
  client.close();
});

test('speech after generation completes still signals playback clearing without cancelling an idle response', () => {
  const client = new OpenAIRealtime({ apiKey: 'test-only', model: 'test-only' });
  let speechEvents = 0;
  client.on('speech_started', () => speechEvents++);
  client.connect();
  const emit = (event) => transport.emit('message', Buffer.from(JSON.stringify(event)));
  emit({ type: 'response.created', response: { id: 'completed' } });
  emit({ type: 'response.done', response: { id: 'completed' } });
  emit({ type: 'input_audio_buffer.speech_started' });
  assert.equal(speechEvents, 1);
  assert.deepEqual(transport.sent, []);
  client.close();
});
