const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node/register');

const { CallSummary, extractCallDetails } = require('../services/callSummary');

test('call summary extract details works with empty items', () => {
  const data = extractCallDetails({});
  assert.equal(typeof data, 'object');
});
