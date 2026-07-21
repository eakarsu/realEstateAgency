function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function loadConfig() {
  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  const databaseUrl = required('DATABASE_URL');
  const corsOrigins = required('CORS_ORIGINS').split(',').map((item) => item.trim()).filter(Boolean);
  if (!corsOrigins.length || corsOrigins.includes('*')) throw new Error('CORS_ORIGINS must list exact origins');
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');
  return { jwtSecret, databaseUrl, corsOrigins, port };
}

module.exports = { loadConfig };
