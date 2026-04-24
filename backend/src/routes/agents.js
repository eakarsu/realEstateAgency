const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { filterFields } = require('../middleware/fieldFilter');

// Get all agents
router.get('/', authenticateToken, filterFields('agent'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { teamId, search, page = 1, limit = 20 } = req.query;

    const where = {};
    if (teamId) where.teamId = teamId;
    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true, isActive: true } },
          team: true,
          _count: { select: { leads: true, properties: true, transactions: true } }
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.agent.count({ where })
    ]);

    res.json({ agents, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: 'Failed to get agents' });
  }
});

// Get agent by ID
router.get('/:id', authenticateToken, filterFields('agent'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true } },
        team: true,
        performanceMetrics: { orderBy: { period: 'desc' }, take: 12 },
        trainingRecords: { orderBy: { createdAt: 'desc' } },
        _count: { select: { leads: true, properties: true, transactions: true, showings: true } }
      }
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

// Update agent profile
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { licenseNumber, licenseExpiry, bio, specializations, yearsExperience, commissionRate, teamId } = req.body;

    // Only allow agents to update their own profile, or admins/managers
    if (req.user.agentId !== req.params.id && !['ADMIN', 'MANAGER'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const agent = await prisma.agent.update({
      where: { id: req.params.id },
      data: {
        licenseNumber,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined,
        bio,
        specializations,
        yearsExperience,
        commissionRate,
        teamId
      },
      include: { user: true, team: true }
    });

    res.json(agent);
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Get agent performance
router.get('/:id/performance', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { period } = req.query; // e.g., "2024" or "2024-Q1"

    const metrics = await prisma.performanceMetric.findMany({
      where: {
        agentId: req.params.id,
        ...(period && { period: { startsWith: period } })
      },
      orderBy: { period: 'desc' }
    });

    res.json(metrics);
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({ error: 'Failed to get performance' });
  }
});

// Add/update performance metric
router.post('/:id/performance', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { period, listingsSold, listingsTaken, totalVolume, totalCommission, leadsConverted, avgDaysOnMarket, clientRating } = req.body;

    const metric = await prisma.performanceMetric.upsert({
      where: { agentId_period: { agentId: req.params.id, period } },
      update: { listingsSold, listingsTaken, totalVolume, totalCommission, leadsConverted, avgDaysOnMarket, clientRating },
      create: {
        agentId: req.params.id,
        period,
        listingsSold,
        listingsTaken,
        totalVolume,
        totalCommission,
        leadsConverted,
        avgDaysOnMarket,
        clientRating
      }
    });

    res.json(metric);
  } catch (error) {
    console.error('Add performance error:', error);
    res.status(500).json({ error: 'Failed to add performance metric' });
  }
});

// Get agent training records
router.get('/:id/training', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const records = await prisma.trainingRecord.findMany({
      where: { agentId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(records);
  } catch (error) {
    console.error('Get training error:', error);
    res.status(500).json({ error: 'Failed to get training records' });
  }
});

// Add training record
router.post('/:id/training', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { courseName, provider, completedAt, expiresAt, certificateUrl, status } = req.body;

    const record = await prisma.trainingRecord.create({
      data: {
        agentId: req.params.id,
        courseName,
        provider,
        completedAt: completedAt ? new Date(completedAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        certificateUrl,
        status: status || 'IN_PROGRESS'
      }
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('Add training error:', error);
    res.status(500).json({ error: 'Failed to add training record' });
  }
});

// Update training record
router.put('/:id/training/:trainingId', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { courseName, provider, completedAt, expiresAt, certificateUrl, status } = req.body;

    const record = await prisma.trainingRecord.update({
      where: { id: req.params.trainingId },
      data: {
        courseName,
        provider,
        completedAt: completedAt ? new Date(completedAt) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        certificateUrl,
        status
      }
    });

    res.json(record);
  } catch (error) {
    console.error('Update training error:', error);
    res.status(500).json({ error: 'Failed to update training record' });
  }
});

// Get agent's leads
router.get('/:id/leads', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const leads = await prisma.lead.findMany({
      where: { agentId: req.params.id },
      include: { source: true, tags: { include: { tag: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(leads);
  } catch (error) {
    console.error('Get agent leads error:', error);
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

// Get agent's properties
router.get('/:id/properties', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const properties = await prisma.property.findMany({
      where: { agentId: req.params.id },
      include: { photos: { where: { isPrimary: true }, take: 1 } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(properties);
  } catch (error) {
    console.error('Get agent properties error:', error);
    res.status(500).json({ error: 'Failed to get properties' });
  }
});

// Get agent's transactions
router.get('/:id/transactions', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const transactions = await prisma.transaction.findMany({
      where: { agentId: req.params.id },
      include: { property: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(transactions);
  } catch (error) {
    console.error('Get agent transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Get agent statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const agentId = req.params.id;

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const [
      totalLeads,
      totalProperties,
      totalTransactions,
      closedTransactions,
      totalVolume
    ] = await Promise.all([
      prisma.lead.count({ where: { agentId } }),
      prisma.property.count({ where: { agentId } }),
      prisma.transaction.count({ where: { agentId } }),
      prisma.transaction.count({
        where: { agentId, status: 'CLOSED', actualClosingDate: { gte: startOfYear } }
      }),
      prisma.transaction.aggregate({
        where: { agentId, status: 'CLOSED', actualClosingDate: { gte: startOfYear } },
        _sum: { salePrice: true }
      })
    ]);

    res.json({
      totalLeads,
      totalProperties,
      totalTransactions,
      closedThisYear: closedTransactions,
      volumeThisYear: totalVolume._sum.salePrice || 0
    });
  } catch (error) {
    console.error('Get agent stats error:', error);
    res.status(500).json({ error: 'Failed to get agent stats' });
  }
});

module.exports = router;
