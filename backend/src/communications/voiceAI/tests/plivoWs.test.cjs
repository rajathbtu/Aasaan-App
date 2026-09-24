const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node/register');

const attachPlivoWs = require('../ws/plivoWs').attachPlivoWs;

test('plivo websocket attaches without throwing', async () => {
  // Minimal smoke test: attach to a fake server object
  const server = { on: () => {}, removeListener: () => {} };
  attachPlivoWs(server);
  assert.ok(true);
});
