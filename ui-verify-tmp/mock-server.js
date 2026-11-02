/* Local mock API for UI verification only — temporary tooling, safe to delete. */
const http = require('http');

const PORT = 3001;

const user = {
  id: 'mock-user-1',
  phone: '9999999999',
  name: 'Test Provider',
  language: 'en',
  role: 'serviceProvider',
  plan: 'free',
  profilePhoto: null,
  createdAt: new Date().toISOString(),
  serviceProviderInfo: { services: [], radius: 20, location: null },
};

const json = (res, code, body) => {
  const data = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': '*',
  });
  res.end(data);
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});

  if (p === '/auth/send-otp') return json(res, 200, { message: 'OTP sent' });
  if (p === '/auth/check-registration') return json(res, 200, { isRegistered: true });
  if (p === '/auth/verify-otp' || p === '/auth/register') return json(res, 200, { token: 'mock-token', user });
  if (p === '/users/me') return json(res, 200, user);
  if (p === '/users/me/push-token') return json(res, 204, {});
  if (p === '/notifications') return json(res, 200, []);
  if (p === '/work-requests') return json(res, 200, []);
  json(res, 404, { message: `No mock for ${req.method} ${p}` });
});

server.listen(PORT, () => console.log(`Mock API on http://localhost:${PORT}`));
