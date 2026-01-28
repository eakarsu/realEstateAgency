const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all leads
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { status, agentId, sourceId, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const where = {};
    if (status) where.status = status;
    if (agentId) where.agentId = agentId;
    if (sourceId) where.sourceId = sourceId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    // If user is an agent, only show their leads
    if (req.user.role === 'AGENT' && req.user.agentId) {
      where.agentId = req.user.agentId;
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          source: true,
          agent: { include: { user: { select: { firstName: true, lastName: true } } } },
          tags: { include: { tag: true } },
          _count: { select: { activities: true, showings: true } }
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.lead.count({ where })
    ]);

    res.json({ leads, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

// Get lead by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        source: true,
        agent: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        tags: { include: { tag: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
        showings: { include: { property: true }, orderBy: { scheduledAt: 'desc' } },
        transactions: { include: { property: true } }
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Failed to get lead' });
  }
});

// Create lead
router.post('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { firstName, lastName, email, phone, sourceId, agentId, status, budget, timeline, propertyType, preferredAreas, notes, tags } = req.body;

    // For admin/manager without agentId, get first available agent
    let assignedAgentId = agentId || req.user.agentId;
    if (!assignedAgentId && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')) {
      const firstAgent = await prisma.agent.findFirst();
      assignedAgentId = firstAgent?.id;
    }

    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        sourceId,
        agentId: assignedAgentId,
        status: status || 'NEW',
        budget,
        timeline,
        propertyType,
        preferredAreas: preferredAreas || [],
        notes
      },
      include: { source: true, agent: true }
    });

    // Add tags if provided
    if (tags && tags.length > 0) {
      await prisma.tagOnLead.createMany({
        data: tags.map(tagId => ({ leadId: lead.id, tagId }))
      });
    }

    // Log activity
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        userId: req.user.id,
        type: 'NOTE',
        subject: 'Lead created',
        description: `Lead created from ${lead.source?.name || 'manual entry'}`
      }
    });

    res.status(201).json(lead);
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update lead
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { firstName, lastName, email, phone, sourceId, agentId, status, score, budget, timeline, propertyType, preferredAreas, notes } = req.body;

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        sourceId,
        agentId,
        status,
        score,
        budget,
        timeline,
        propertyType,
        preferredAreas,
        notes,
        lastContactedAt: status !== 'NEW' ? new Date() : undefined
      },
      include: { source: true, agent: true, tags: { include: { tag: true } } }
    });

    res.json(lead);
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete lead
router.delete('/:id', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lead deleted' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Assign lead to agent
router.put('/:id/assign', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { agentId } = req.body;

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { agentId },
      include: { agent: { include: { user: true } } }
    });

    await prisma.activity.create({
      data: {
        leadId: lead.id,
        userId: req.user.id,
        type: 'NOTE',
        subject: 'Lead assigned',
        description: `Lead assigned to ${lead.agent.user.firstName} ${lead.agent.user.lastName}`
      }
    });

    res.json(lead);
  } catch (error) {
    console.error('Assign lead error:', error);
    res.status(500).json({ error: 'Failed to assign lead' });
  }
});

// Add activity to lead
router.post('/:id/activities', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { type, subject, description, outcome, scheduledAt } = req.body;

    const activity = await prisma.activity.create({
      data: {
        leadId: req.params.id,
        userId: req.user.id,
        type,
        subject: subject || `${type || 'Activity'} logged`,
        description,
        outcome,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        completedAt: !scheduledAt ? new Date() : null
      }
    });

    // Update last contacted date
    await prisma.lead.update({
      where: { id: req.params.id },
      data: { lastContactedAt: new Date() }
    });

    res.status(201).json(activity);
  } catch (error) {
    console.error('Add activity error:', error);
    res.status(500).json({ error: 'Failed to add activity' });
  }
});

// Get lead activities
router.get('/:id/activities', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const activities = await prisma.activity.findMany({
      where: { leadId: req.params.id },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(activities);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Failed to get activities' });
  }
});

// Add/remove tags
router.put('/:id/tags', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { tags } = req.body;

    // Remove existing tags
    await prisma.tagOnLead.deleteMany({ where: { leadId: req.params.id } });

    // Add new tags
    if (tags && tags.length > 0) {
      // Convert tag names to IDs if needed (check if it's a UUID or name)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let tagIds = [];

      for (const tag of tags) {
        if (uuidRegex.test(tag)) {
          tagIds.push(tag);
        } else {
          // Look up tag by name, create if doesn't exist
          let existingTag = await prisma.tag.findFirst({ where: { name: tag } });
          if (!existingTag) {
            existingTag = await prisma.tag.create({
              data: { name: tag, color: '#3B82F6' }
            });
          }
          tagIds.push(existingTag.id);
        }
      }

      await prisma.tagOnLead.createMany({
        data: tagIds.map(tagId => ({ leadId: req.params.id, tagId }))
      });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: { tags: { include: { tag: true } } }
    });

    res.json(lead);
  } catch (error) {
    console.error('Update tags error:', error);
    res.status(500).json({ error: 'Failed to update tags' });
  }
});

// Get lead statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const where = {};
    if (req.user.role === 'AGENT' && req.user.agentId) {
      where.agentId = req.user.agentId;
    }

    const [total, byStatus, bySourse, recentLeads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      prisma.lead.groupBy({
        by: ['sourceId'],
        where,
        _count: true
      }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { source: true }
      })
    ]);

    res.json({ total, byStatus, bySourse, recentLeads });
  } catch (error) {
    console.error('Get lead stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;
