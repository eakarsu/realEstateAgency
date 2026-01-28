const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all showings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { status, agentId, propertyId, startDate, endDate, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (agentId) where.agentId = agentId;
    if (propertyId) where.propertyId = propertyId;

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
    }

    if (req.user.role === 'AGENT' && req.user.agentId) {
      where.agentId = req.user.agentId;
    }

    const [showings, total] = await Promise.all([
      prisma.showing.findMany({
        where,
        include: {
          property: { include: { photos: { where: { isPrimary: true }, take: 1 } } },
          agent: { include: { user: { select: { firstName: true, lastName: true } } } },
          lead: true
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { scheduledAt: 'asc' }
      }),
      prisma.showing.count({ where })
    ]);

    res.json({ showings, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get showings error:', error);
    res.status(500).json({ error: 'Failed to get showings' });
  }
});

// Get showing by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const showing = await prisma.showing.findUnique({
      where: { id: req.params.id },
      include: {
        property: { include: { photos: true, agent: true } },
        agent: { include: { user: true } },
        lead: true
      }
    });

    if (!showing) {
      return res.status(404).json({ error: 'Showing not found' });
    }

    res.json(showing);
  } catch (error) {
    console.error('Get showing error:', error);
    res.status(500).json({ error: 'Failed to get showing' });
  }
});

// Create showing
router.post('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { propertyId, leadId, scheduledAt, date, time, duration, notes, agentId } = req.body;

    // Support both 'scheduledAt' and separate 'date' + 'time' for compatibility
    let scheduledDateTime;
    if (scheduledAt) {
      scheduledDateTime = new Date(scheduledAt);
    } else if (date) {
      scheduledDateTime = time ? new Date(`${date}T${time}:00`) : new Date(date);
    } else {
      return res.status(400).json({ error: 'Either scheduledAt or date is required' });
    }

    // For admin/manager without agentId, get first available agent
    let assignedAgentId = agentId || req.user.agentId;
    if (!assignedAgentId && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')) {
      const firstAgent = await prisma.agent.findFirst();
      assignedAgentId = firstAgent?.id;
    }

    const showing = await prisma.showing.create({
      data: {
        propertyId,
        agentId: assignedAgentId,
        leadId,
        scheduledAt: scheduledDateTime,
        duration: duration || 30,
        notes,
        status: 'SCHEDULED'
      },
      include: { property: true, lead: true }
    });

    // Log activity
    if (leadId) {
      await prisma.activity.create({
        data: {
          leadId,
          userId: req.user.id,
          type: 'SHOWING',
          subject: 'Showing scheduled',
          description: `Showing scheduled for ${showing.property.address}`,
          scheduledAt: scheduledDateTime
        }
      });
    }

    res.status(201).json(showing);
  } catch (error) {
    console.error('Create showing error:', error);
    res.status(500).json({ error: 'Failed to create showing' });
  }
});

// Update showing
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { scheduledAt, duration, status, feedback, rating, notes } = req.body;

    const updateData = {};
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);
    if (duration) updateData.duration = duration;
    if (status) updateData.status = status;
    if (feedback) updateData.feedback = feedback;
    if (rating) updateData.rating = rating;
    if (notes !== undefined) updateData.notes = notes;

    if (status === 'CONFIRMED') {
      updateData.confirmedAt = new Date();
    } else if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const showing = await prisma.showing.update({
      where: { id: req.params.id },
      data: updateData,
      include: { property: true, lead: true, agent: true }
    });

    res.json(showing);
  } catch (error) {
    console.error('Update showing error:', error);
    res.status(500).json({ error: 'Failed to update showing' });
  }
});

// Delete showing
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.showing.delete({ where: { id: req.params.id } });
    res.json({ message: 'Showing deleted' });
  } catch (error) {
    console.error('Delete showing error:', error);
    res.status(500).json({ error: 'Failed to delete showing' });
  }
});

// Get today's showings
router.get('/today/list', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = {
      scheduledAt: { gte: today, lt: tomorrow }
    };

    if (req.user.role === 'AGENT' && req.user.agentId) {
      where.agentId = req.user.agentId;
    }

    const showings = await prisma.showing.findMany({
      where,
      include: {
        property: { include: { photos: { where: { isPrimary: true }, take: 1 } } },
        lead: true
      },
      orderBy: { scheduledAt: 'asc' }
    });

    res.json(showings);
  } catch (error) {
    console.error('Get today showings error:', error);
    res.status(500).json({ error: 'Failed to get showings' });
  }
});

// Get upcoming showings (next 7 days)
router.get('/upcoming/list', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const where = {
      scheduledAt: { gte: now, lte: nextWeek },
      status: { in: ['SCHEDULED', 'CONFIRMED'] }
    };

    if (req.user.role === 'AGENT' && req.user.agentId) {
      where.agentId = req.user.agentId;
    }

    const showings = await prisma.showing.findMany({
      where,
      include: {
        property: { include: { photos: { where: { isPrimary: true }, take: 1 } } },
        lead: true
      },
      orderBy: { scheduledAt: 'asc' }
    });

    res.json(showings);
  } catch (error) {
    console.error('Get upcoming showings error:', error);
    res.status(500).json({ error: 'Failed to get showings' });
  }
});

// Add feedback to showing
router.post('/:id/feedback', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { feedback, rating } = req.body;

    const showing = await prisma.showing.update({
      where: { id: req.params.id },
      data: {
        feedback,
        rating,
        status: 'COMPLETED',
        completedAt: new Date()
      },
      include: { property: true, lead: true }
    });

    // Log activity
    if (showing.leadId) {
      await prisma.activity.create({
        data: {
          leadId: showing.leadId,
          userId: req.user.id,
          type: 'SHOWING',
          subject: 'Showing feedback added',
          description: `Showing completed at ${showing.property.address}. Rating: ${rating}/5`,
          completedAt: new Date()
        }
      });
    }

    res.json(showing);
  } catch (error) {
    console.error('Add feedback error:', error);
    res.status(500).json({ error: 'Failed to add feedback' });
  }
});

module.exports = router;
