const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const { tokenOptions } = require('../config/auth');

const router = express.Router();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPassword(value) {
  return value.length >= 12 && Buffer.byteLength(value) <= 72;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    agentId: user.agent?.id || null,
  };
}

function signToken(user) {
  return jwt.sign({ ver: user.authVersion }, process.env.JWT_SECRET, {
    ...tokenOptions,
    subject: user.id,
  });
}

router.post('/register', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const firstName = String(req.body.firstName || '').trim();
    const lastName = String(req.body.lastName || '').trim();
    const phone = String(req.body.phone || '').trim() || null;
    if (!validEmail(email) || !firstName || !lastName || firstName.length > 100 || lastName.length > 100) {
      return res.status(400).json({ error: 'A valid email, first name, and last name are required' });
    }
    if (!validPassword(password)) return res.status(400).json({ error: 'Password must be 12 to 72 bytes' });
    if (phone && phone.length > 40) return res.status(400).json({ error: 'Phone number is too long' });

    const prisma = req.app.get('prisma');
    if (await prisma.user.findUnique({ where: { email } })) return res.status(400).json({ error: 'Email already registered' });
    const user = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 12),
        firstName,
        lastName,
        phone,
        role: 'CLIENT',
      },
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Email already registered' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const user = await req.app.get('prisma').user.findUnique({ where: { email }, include: { agent: true } });
    const valid = user && await bcrypt.compare(password, user.password);
    if (!valid || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await req.app.get('prisma').user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, avatar: true, agent: true },
    });
    res.json(user);
  } catch (error) { next(error); }
});

router.put('/password', authenticateToken, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if (!validPassword(newPassword)) return res.status(400).json({ error: 'New password must be 12 to 72 bytes' });
    const prisma = req.app.get('prisma');
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!await bcrypt.compare(currentPassword, user.password)) return res.status(401).json({ error: 'Current password is incorrect' });
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 12), authVersion: { increment: 1 } } });
    res.json({ message: 'Password updated; sign in again on every device.' });
  } catch (error) { next(error); }
});

router.post('/forgot-password', async (req, res) => {
  const response = { message: 'If an account exists with that email, a reset link has been sent.' };
  try {
    const notifier = req.app.get('passwordResetNotifier');
    if (typeof notifier !== 'function') return res.json(response);
    const email = normalizeEmail(req.body.email);
    const user = validEmail(email) ? await req.app.get('prisma').user.findUnique({ where: { email } }) : null;
    if (user?.isActive) {
      const token = crypto.randomBytes(32).toString('base64url');
      await req.app.get('prisma').user.update({
        where: { id: user.id },
        data: {
          resetToken: crypto.createHash('sha256').update(token).digest('hex'),
          resetTokenExpiry: new Date(Date.now() + 60 * 60_000),
        },
      });
      await notifier({ email: user.email, token, expiresInMinutes: 60 });
    }
  } catch {
    // Keep the response indistinguishable and never log reset credentials.
  }
  res.json(response);
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');
    if (!token || !validPassword(password)) return res.status(400).json({ error: 'A valid token and a 12 to 72 byte password are required' });
    const resetToken = crypto.createHash('sha256').update(token).digest('hex');
    const prisma = req.app.get('prisma');
    const user = await prisma.user.findFirst({ where: { resetToken, resetTokenExpiry: { gt: new Date() }, isActive: true } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(password, 12),
        resetToken: null,
        resetTokenExpiry: null,
        authVersion: { increment: 1 },
      },
    });
    res.json({ message: 'Password reset successfully' });
  } catch (error) { next(error); }
});

module.exports = router;
