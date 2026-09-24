const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');
require('ts-node/register');

const wsPath = require.resolve('ws');
require(wsPath);
const originalWs = require.cache[wsPath].exports;
let server;
let transport;
class FakeWebSocket extends EventEmitter {
  static OPEN = 1;
  constructor() {
    super();
    this.readyState = 1;
    this.sent = [];
    transport = this;
  }
  send(data) { this.sent.push(JSON.parse(data)); }
  close() { this.readyState = 3; }
}
FakeWebSocket.WebSocketServer = class extends EventEmitter {
  constructor() { super(); server = this; }
};
let attachPlivoWs;
try {
  require.cache[wsPath].exports = FakeWebSocket;
  attachPlivoWs = require('../ws/plivoWs').attachPlivoWs;
} finally {
  require.cache[wsPath].exports = originalWs;
}
const instructions = require('../config/openaiPrompt').default;

// Prompt contract checks guard configuration regressions, not model speech quality.
test('Priya prompt keeps personal questions in name, work, city order', () => {
  assert.ok(instructions.includes('STRICT CALL SEQUENCE: consent -> name -> work -> city -> closing.'));
  const questions = [
    'Sabse pehle, aapka naam kya hai?',
    'Aap kya kaam karte hain?',
    'Aap kis sheher se baat kar rahe hain?',
  ];
  const positions = questions.map((question) => instructions.indexOf(question));
  assert.ok(positions.every((position) => position >= 0));
  assert.ok(positions[0] < positions[1] && positions[1] < positions[2]);
  assert.ok(instructions.includes('Ask ONE question per turn'));
  assert.ok(instructions.includes('clarification of ONLY the current question'));
});

test('Priya prompt requires Hindi and feminine self-references throughout', () => {
  assert.ok(instructions.includes('Main Priya, Aasaan app se baat kar rahi hoon.'));
  assert.ok(instructions.includes('Speak natural, simple Hindi throughout the entire call'));
  assert.ok(instructions.includes('Do not switch to English'));
  assert.ok(instructions.includes('Keep the same female vocal identity'));
  assert.ok(instructions.includes('ALWAYS use feminine grammar for yourself'));
  assert.ok(instructions.includes('"main madad kar sakti hoon", "main karti hoon"'));
  assert.ok(instructions.includes('NEVER use masculine self-references'));
});

test('Priya prompt forbids English transitions and repeated versions within a response', () => {
  for (const phrase of [
    'All complete spoken sentences must be in Hindi, including transitions.',
    'Stage headings and instructions below are silent guidance, not speech.',
    'Give exactly one assistant message per response.',
    'Once a question is asked, end the response and wait for the caller.',
    'Use at most ONE brief acknowledgment per caller turn.',
    'Do not repeat, translate, rephrase or restart an acknowledgment or question within the same response, even across separate output items.',
    'Thank callers only for information they have already shared',
    'Repeat a question only if the caller explicitly asks you to repeat it or their answer is unclear',
    'If they agree, say only: "Shukriya! Sabse pehle, aapka naam kya hai?"',
    'Continue in the same reply without another thank-you:',
  ]) {
    assert.ok(instructions.includes(phrase), phrase);
  }
  assert.ok(!instructions.includes('Bahut achha, shukriya!'));
  assert.ok(!instructions.includes('Bahut achha, {name} ji. Apne kaam'));
});

test('Priya prompt acknowledges answers using the actual caller name', () => {
  for (const phrase of [
    'Apna naam batane ke liye dhanyavaad, {name} ji.',
    'Apne kaam ke baare mein batane ke liye shukriya.',
    'Apne sheher ke baare mein batane ke liye dhanyavaad, {name} ji.',
    'Aapse baat karke behad khushi mili.',
    'After EVERY substantive answer',
    'Use the caller\'s name, not a fixed example name.',
    'use an empathetic acknowledgment instead of "bahut achha"',
    'thank them for their time and say goodbye without pushing',
  ]) {
    assert.ok(instructions.includes(phrase), phrase);
  }
});

for (const first of ['start', 'open']) {
  test(`real adapters send Hindi session before exactly one greeting (${first} first)`, () => {
    attachPlivoWs({});
    const socket = new EventEmitter();
    socket.readyState = 1;
    server.emit('connection', socket, { socket: { remoteAddress: 'local-test' } });
    const start = () => socket.emit('message', Buffer.from(JSON.stringify({ event: 'start' })));
    if (first === 'start') {
      start();
      assert.deepEqual(transport.sent, []);
      transport.emit('open');
    } else {
      transport.emit('open');
      assert.deepEqual(transport.sent, [
        { type: 'session.update', session: { type: 'realtime', instructions, audio: {
          output: { voice: 'shimmer' },
          input: { turn_detection: { type: 'server_vad', create_response: true, interrupt_response: false } },
        } } },
      ]);
      start();
    }
    const expected = [
      { type: 'session.update', session: { type: 'realtime', instructions, audio: {
        output: { voice: 'shimmer' },
        input: { turn_detection: { type: 'server_vad', create_response: true, interrupt_response: false } },
      } } },
      { type: 'response.create' },
    ];
    assert.deepEqual(transport.sent, expected);
    start();
    transport.emit('message', Buffer.from(JSON.stringify({ type: 'response.done' })));
    assert.deepEqual(transport.sent, expected, 'no repeated intro or replacement of session instructions');
    socket.readyState = 3;
    socket.emit('close');
  });
}

for (const enabled of [false, true]) {
  test(`real call adapters log transcripts only when opted in (${enabled})`, () => {
    const previousFlag = process.env.CALL_TRANSCRIPT_LOGGING;
    const previousDebug = process.env.OPENAI_DEBUG;
    const originalLog = console.log;
    const originalError = console.error;
    const logs = [];
    const errors = [];
    const socket = new EventEmitter();
    socket.readyState = 1;
    const playback = [];
    socket.send = (data) => playback.push(data);
    try {
      process.env.CALL_TRANSCRIPT_LOGGING = enabled ? '1' : '0';
      delete process.env.OPENAI_DEBUG;
      console.log = (...args) => logs.push(args);
      console.error = (...args) => errors.push(args);
      attachPlivoWs({});
      server.emit('connection', socket, { socket: { remoteAddress: 'local-test' } });
      socket.emit('message', Buffer.from(JSON.stringify({
        event: 'start', start: { call_uuid: 'test-call-transcripts' },
      })));
      transport.emit('open');
      const session = transport.sent[0].session;
      assert.deepEqual(session.audio.input, {
        turn_detection: { type: 'server_vad', create_response: true, interrupt_response: false },
        ...(enabled ? { transcription: { model: 'gpt-4o-mini-transcribe', language: 'hi' } } : {}),
      });
      assert.equal(session.instructions, instructions);
      assert.deepEqual(session.audio.output, { voice: 'shimmer' });
      const receive = (event) => transport.emit('message', Buffer.from(JSON.stringify(event)));
      receive({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'user-1', transcript: 'मेरा नाम राजत है।' });
      for (const type of ['response.output_audio_transcript.done', 'response.audio_transcript.done']) {
        receive({ type, item_id: 'assistant-1', content_index: 0, response_id: 'response-1', transcript: 'धन्यवाद, राजत जी।' });
      }
      receive({ type: 'response.done', response: { id: 'response-1', output: [
        { id: 'assistant-1', role: 'assistant', content: [{ type: 'audio', transcript: 'धन्यवाद, राजत जी।' }] },
        { id: 'assistant-2', role: 'assistant', content: [{ type: 'output_audio', transcript: 'आप क्या काम करते हैं?' }] },
        { id: 'text-only', role: 'assistant', content: [{ type: 'output_text', text: 'Not spoken' }] },
      ] } });
      receive({ type: 'response.output_audio_transcript.delta', delta: 'Partial text' });
      receive({ type: 'response.output_audio.done', transcript: 'Not a transcript event' });
      receive({ type: 'response.audio_transcript.done', item_id: 'empty', transcript: ' ' });
      receive({ type: 'response.audio_transcript.done', item_id: 'invalid', transcript: {} });
      receive({ type: 'conversation.item.input_audio_transcription.failed', item_id: 'user-2', error: {
        code: 'transcription_failed', type: 'server_error', message: 'Sensitive server content',
      } });
      const entries = logs.filter(([tag]) => tag === '[CALL TRANSCRIPT]').map(([, data]) => JSON.parse(data));
      assert.equal(entries.length, enabled ? 3 : 0);
      if (enabled) {
        assert.deepEqual(entries.map(({ speaker, text }) => ({ speaker, text })), [
          { speaker: 'caller', text: 'मेरा नाम राजत है।' },
          { speaker: 'Priya', text: 'धन्यवाद, राजत जी।' },
          { speaker: 'Priya', text: 'आप क्या काम करते हैं?' },
        ]);
        for (const entry of entries) {
          assert.deepEqual(Object.keys(entry).sort(), ['speaker', 'text']);
        }
        const failure = JSON.parse(errors[0][1]);
        assert.equal(failure.callId, 'test-call-transcripts');
        assert.equal(failure.code, 'transcription_failed');
        assert.ok(!JSON.stringify(errors).includes('Sensitive server content'));
      } else {
        assert.deepEqual(errors, []);
      }
      assert.deepEqual(playback, [], 'transcripts must never produce Plivo playback');
    } finally {
      socket.readyState = 3;
      socket.emit('close');
      console.log = originalLog;
      console.error = originalError;
      if (previousFlag === undefined) delete process.env.CALL_TRANSCRIPT_LOGGING;
      else process.env.CALL_TRANSCRIPT_LOGGING = previousFlag;
      if (previousDebug === undefined) delete process.env.OPENAI_DEBUG;
      else process.env.OPENAI_DEBUG = previousDebug;
    }
  });
}
