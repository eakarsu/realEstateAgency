const jwt = require('jsonwebtoken');
const { verifyOptions } = require('../config/auth');

function getToken(req) {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function resolveUser(req, token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET, verifyOptions);
  const prisma = req.app.get('prisma');
  const user = await prisma.user.findUnique({ where: { id: String(payload.sub) }, include: { agent: true } });
  if (!user?.isActive || payload.ver !== user.authVersion) return null;
  return { id: user.id, email: user.email, role: user.role, agentId: user.agent?.id || null };
}

async function authenticateToken(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    req.user = await resolveUser(req, token);
    if (!req.user) return res.status(401).json({ error: 'Session is no longer valid' });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

async function optionalAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return next();
  try { req.user = await resolveUser(req, token); } catch { /* Anonymous access remains anonymous. */ }
  next();
}

module.exports = { authenticateToken, requireRole, optionalAuth };
