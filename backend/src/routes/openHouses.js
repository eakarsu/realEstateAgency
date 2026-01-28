const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

// Get all open houses
router.get('/', optionalAuth, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { status, agentId, startDate, endDate, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (agentId) where.agentId = agentId;

    // Only show upcoming by default
    if (!startDate && !endDate) {
      where.date = { gte: new Date() };
    } else {
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }
    }

    const [openHouses, total] = await Promise.all([
      prisma.openHouse.findMany({
        where,
        include: {
          property: { include: { photos: { where: { isPrimary: true }, take: 1 } } },
          agent: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } }
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { date: 'asc' }
      }),
      prisma.openHouse.count({ where })
    ]);

    res.json({ openHouses, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get open houses error:', error);
    res.status(500).json({ error: 'Failed to get open houses' });
  }
});

// Get open house by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const openHouse = await prisma.openHouse.findUnique({
      where: { id: req.params.id },
      include: {
        property: { include: { photos: true, virtualTours: true } },
        agent: { include: { user: true } }
      }
    });

    if (!openHouse) {
      return res.status(404).json({ error: 'Open house not found' });
    }

    res.json(openHouse);
  } catch (error) {
    console.error('Get open house error:', error);
    res.status(500).json({ error: 'Failed to get open house' });
  }
});

// Create open house
router.post('/', authenticateToken, requireRole('ADMIN', 'MANAGER', 'AGENT'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { propertyId, date, startTime, endTime, notes, agentId } = req.body;

    // For admin/manager without agentId, get first available agent
    let assignedAgentId = agentId || req.user.agentId;
    if (!assignedAgentId && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')) {
      const firstAgent = await prisma.agent.findFirst();
      assignedAgentId = firstAgent?.id;
    }

    const openHouse = await prisma.openHouse.create({
      data: {
        property: { connect: { id: propertyId } },
        agent: assignedAgentId ? { connect: { id: assignedAgentId } } : undefined,
        date: new Date(date),
        startTime,
        endTime,
        notes,
        status: 'SCHEDULED'
      },
      include: { property: true }
    });

    res.status(201).json(openHouse);
  } catch (error) {
    console.error('Create open house error:', error);
    res.status(500).json({ error: 'Failed to create open house' });
  }
});

// Update open house
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { date, startTime, endTime, notes, status, attendees } = req.body;

    const openHouse = await prisma.openHouse.update({
      where: { id: req.params.id },
      data: {
        date: date ? new Date(date) : undefined,
        startTime,
        endTime,
        notes,
        status,
        attendees
      },
      include: { property: true, agent: true }
    });

    res.json(openHouse);
  } catch (error) {
    console.error('Update open house error:', error);
    res.status(500).json({ error: 'Failed to update open house' });
  }
});

// Delete open house
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.openHouse.delete({ where: { id: req.params.id } });
    res.json({ message: 'Open house deleted' });
  } catch (error) {
    console.error('Delete open house error:', error);
    res.status(500).json({ error: 'Failed to delete open house' });
  }
});

// Register attendee
router.post('/:id/attendees', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, email, phone, notes } = req.body;

    const openHouse = await prisma.openHouse.findUnique({
      where: { id: req.params.id }
    });

    if (!openHouse) {
      return res.status(404).json({ error: 'Open house not found' });
    }

    const attendees = openHouse.attendees || [];
    attendees.push({
      name,
      email,
      phone,
      notes,
      registeredAt: new Date().toISOString()
    });

    const updated = await prisma.openHouse.update({
      where: { id: req.params.id },
      data: { attendees }
    });

    // Create lead if email provided
    if (email) {
      const existingLead = await prisma.lead.findFirst({ where: { email } });
      if (!existingLead) {
        const nameParts = name.split(' ');
        await prisma.lead.create({
          data: {
            firstName: nameParts[0] || name,
            lastName: nameParts.slice(1).join(' ') || '',
            email,
            phone,
            agentId: openHouse.agentId,
            status: 'NEW',
            notes: `Registered for open house at property`
          }
        });
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('Register attendee error:', error);
    res.status(500).json({ error: 'Failed to register attendee' });
  }
});

// Get upcoming open houses for a property
router.get('/property/:propertyId', optionalAuth, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const openHouses = await prisma.openHouse.findMany({
      where: {
        propertyId: req.params.propertyId,
        date: { gte: new Date() },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      },
      include: {
        agent: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } }
      },
      orderBy: { date: 'asc' }
    });

    res.json(openHouses);
  } catch (error) {
    console.error('Get property open houses error:', error);
    res.status(500).json({ error: 'Failed to get open houses' });
  }
});

module.exports = router;
