const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get user messages
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { unreadOnly, page = 1, limit = 20 } = req.query;

    const where = { userId: req.user.id };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [messages, total, unreadCount] = await Promise.all([
      prisma.message.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.message.count({ where }),
      prisma.message.count({ where: { userId: req.user.id, isRead: false } })
    ]);

    res.json({ messages, total, unreadCount, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Get message by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const message = await prisma.message.findUnique({
      where: { id: req.params.id }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(message);
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'Failed to get message' });
  }
});

// Create message
router.post('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { userId, subject, content, fromSystem = false } = req.body;

    const message = await prisma.message.create({
      data: {
        userId: userId || req.user.id,
        subject,
        content,
        fromSystem
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Mark message as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const message = await prisma.message.update({
      where: { id: req.params.id },
      data: { isRead: true, readAt: new Date() }
    });

    res.json(message);
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// Delete message
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    await prisma.message.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
