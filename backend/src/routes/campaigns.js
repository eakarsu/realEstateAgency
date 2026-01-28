const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all campaigns
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { type, status, page = 1, limit = 20 } = req.query;

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          emailDrips: { orderBy: { order: 'asc' } },
          _count: { select: { emailDrips: true } }
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.campaign.count({ where })
    ]);

    res.json({ campaigns, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

// Get campaign by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: { emailDrips: { orderBy: { order: 'asc' } } }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to get campaign' });
  }
});

// Create campaign
router.post('/', authenticateToken, requireRole('ADMIN', 'MANAGER', 'AGENT'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, type, subject, content, htmlContent, targetAudience, scheduledAt } = req.body;

    const campaign = await prisma.campaign.create({
      data: {
        name,
        type,
        status: 'DRAFT',
        subject,
        content,
        htmlContent,
        targetAudience,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null
      }
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Update campaign
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, type, status, subject, content, htmlContent, targetAudience, scheduledAt } = req.body;

    const updateData = { name, type, subject, content, htmlContent, targetAudience };
    if (status) updateData.status = status;
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);

    if (status === 'ACTIVE' || status === 'COMPLETED') {
      updateData.sentAt = new Date();
    }

    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: updateData,
      include: { emailDrips: true }
    });

    res.json(campaign);
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Delete campaign
router.delete('/:id', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.campaign.delete({ where: { id: req.params.id } });
    res.json({ message: 'Campaign deleted' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Add email drip to campaign
router.post('/:id/drips', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, triggerType, delayDays, subject, content, htmlContent, order } = req.body;

    const drip = await prisma.emailDrip.create({
      data: {
        campaignId: req.params.id,
        name: name || subject || `Drip ${order || 1}`,
        triggerType: triggerType || 'DELAY',
        delayDays: delayDays || 0,
        subject,
        content,
        htmlContent,
        order: order || 0,
        isActive: true
      }
    });

    res.status(201).json(drip);
  } catch (error) {
    console.error('Add drip error:', error);
    res.status(500).json({ error: 'Failed to add email drip' });
  }
});

// Update email drip
router.put('/:id/drips/:dripId', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, triggerType, delayDays, subject, content, htmlContent, order, isActive } = req.body;

    const drip = await prisma.emailDrip.update({
      where: { id: req.params.dripId },
      data: { name, triggerType, delayDays, subject, content, htmlContent, order, isActive }
    });

    res.json(drip);
  } catch (error) {
    console.error('Update drip error:', error);
    res.status(500).json({ error: 'Failed to update email drip' });
  }
});

// Delete email drip
router.delete('/:id/drips/:dripId', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.emailDrip.delete({ where: { id: req.params.dripId } });
    res.json({ message: 'Email drip deleted' });
  } catch (error) {
    console.error('Delete drip error:', error);
    res.status(500).json({ error: 'Failed to delete email drip' });
  }
});

// Launch campaign
router.post('/:id/launch', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: {
        status: 'ACTIVE',
        sentAt: new Date()
      }
    });

    // TODO: Integrate with email service to actually send emails

    res.json(campaign);
  } catch (error) {
    console.error('Launch campaign error:', error);
    res.status(500).json({ error: 'Failed to launch campaign' });
  }
});

// Pause campaign
router.post('/:id/pause', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'PAUSED' }
    });

    res.json(campaign);
  } catch (error) {
    console.error('Pause campaign error:', error);
    res.status(500).json({ error: 'Failed to pause campaign' });
  }
});

module.exports = router;
