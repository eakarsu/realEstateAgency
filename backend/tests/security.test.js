const fs = require('node:fs');
const path = require('node:path');

const read = (relative) => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');

describe('security boundaries', () => {
  test('public registration cannot select an elevated role', () => {
    const source = read('src/routes/auth.js');
    expect(source).toContain("role: 'CLIENT'");
    expect(source).not.toMatch(/role\s*\|\|\s*'CLIENT'/);
  });

  test('JWT verification pins algorithm, issuer, and audience', () => {
    const source = read('src/config/auth.js');
    expect(source).toContain("algorithms: ['HS256']");
    expect(source).toContain("issuer: 'real-estate-agency-api'");
    expect(source).toContain("audience: 'real-estate-agency-client'");
  });

  test('fixture seed is gated and has no checked-in password', () => {
    const source = read('prisma/seed.js');
    expect(source).toContain('ALLOW_DISPOSABLE_SEED');
    expect(source).not.toContain('StrongTestPass!2026');
  });
});
