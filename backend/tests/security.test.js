const fs = require('node:fs');

test('server exposes a health endpoint', () => {
  const body = fs.readFileSync(__dirname + '/../src/index.js', 'utf8');
  expect(body.includes('/api/health')).toBe(true);
});

test('no hard-coded secret fallback in server entry', () => {
  const body = fs.readFileSync(__dirname + '/../src/index.js', 'utf8');
  expect(/process\.env\.(JWT_SECRET|SESSION_SECRET)\s*\|\|\s*['"][^'"]+['"]/.test(body)).toBe(false);
});
