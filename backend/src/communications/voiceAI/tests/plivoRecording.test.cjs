const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node/register');

const router = require('../routes/plivoRoutes').default;

test('plivo recording routes mount successfully', async () => {
  const express = require('express');
  const app = express();
  app.use('/webhooks/plivo', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.close(resolve));
  assert.ok(true);
});
