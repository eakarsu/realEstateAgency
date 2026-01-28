const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all lead sources
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { isActive } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const sources = await prisma.leadSource.findMany({
      where,
      include: {
        _count: { select: { leads: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json(sources);
  } catch (error) {
    console.error('Get lead sources error:', error);
    res.status(500).json({ error: 'Failed to get lead sources' });
  }
});

// Get lead source by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const source = await prisma.leadSource.findUnique({
      where: { id: req.params.id },
      include: {
        leads: { take: 10, orderBy: { createdAt: 'desc' } },
        _count: { select: { leads: true } }
      }
    });

    if (!source) {
      return res.status(404).json({ error: 'Lead source not found' });
    }

    res.json(source);
  } catch (error) {
    console.error('Get lead source error:', error);
    res.status(500).json({ error: 'Failed to get lead source' });
  }
});

// Create lead source
router.post('/', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, type, description } = req.body;

    const source = await prisma.leadSource.create({
      data: {
        name,
        type,
        description,
        isActive: true
      }
    });

    res.status(201).json(source);
  } catch (error) {
    console.error('Create lead source error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Lead source with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create lead source' });
  }
});

// Update lead source
router.put('/:id', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, type, description, isActive } = req.body;

    const source = await prisma.leadSource.update({
      where: { id: req.params.id },
      data: { name, type, description, isActive }
    });

    res.json(source);
  } catch (error) {
    console.error('Update lead source error:', error);
    res.status(500).json({ error: 'Failed to update lead source' });
  }
});

// Delete lead source
router.delete('/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    // Check if source has leads
    const leadCount = await prisma.lead.count({ where: { sourceId: req.params.id } });
    if (leadCount > 0) {
      return res.status(400).json({ error: 'Cannot delete source with existing leads. Deactivate instead.' });
    }

    await prisma.leadSource.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lead source deleted' });
  } catch (error) {
    console.error('Delete lead source error:', error);
    res.status(500).json({ error: 'Failed to delete lead source' });
  }
});

// Get lead source statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const [total, byStatus, conversions] = await Promise.all([
      prisma.lead.count({ where: { sourceId: req.params.id } }),
      prisma.lead.groupBy({
        by: ['status'],
        where: { sourceId: req.params.id },
        _count: true
      }),
      prisma.lead.count({
        where: { sourceId: req.params.id, status: 'CLOSED_WON' }
      })
    ]);

    res.json({
      total,
      byStatus,
      conversions,
      conversionRate: total > 0 ? (conversions / total * 100).toFixed(2) : 0
    });
  } catch (error) {
    console.error('Get lead source stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;
