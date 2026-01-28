const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get dashboard overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const isAgent = req.user.role === 'AGENT' && req.user.agentId;
    const agentFilter = isAgent ? { agentId: req.user.agentId } : {};

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalLeads,
      newLeadsThisMonth,
      activeListings,
      pendingTransactions,
      closedThisYear,
      totalVolumeThisYear,
      upcomingShowings,
      tasksdue
    ] = await Promise.all([
      prisma.lead.count({ where: agentFilter }),
      prisma.lead.count({ where: { ...agentFilter, createdAt: { gte: startOfMonth } } }),
      prisma.property.count({ where: { ...agentFilter, status: 'ACTIVE' } }),
      prisma.transaction.count({ where: { ...agentFilter, status: { in: ['INITIATED', 'UNDER_CONTRACT', 'PENDING', 'CONTINGENT'] } } }),
      prisma.transaction.count({ where: { ...agentFilter, status: 'CLOSED', actualClosingDate: { gte: startOfYear } } }),
      prisma.transaction.aggregate({
        where: { ...agentFilter, status: 'CLOSED', actualClosingDate: { gte: startOfYear } },
        _sum: { salePrice: true }
      }),
      prisma.showing.count({ where: { ...agentFilter, scheduledAt: { gte: now }, status: { in: ['SCHEDULED', 'CONFIRMED'] } } }),
      prisma.task.count({ where: { ...agentFilter, status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lte: now } } })
    ]);

    res.json({
      leads: {
        total: totalLeads,
        newThisMonth: newLeadsThisMonth
      },
      listings: {
        active: activeListings
      },
      transactions: {
        pending: pendingTransactions,
        closedThisYear: closedThisYear,
        volumeThisYear: totalVolumeThisYear._sum.salePrice || 0
      },
      upcoming: {
        showings: upcomingShowings,
        tasksDue: tasksdue
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to get dashboard overview' });
  }
});

// Get recent activities
router.get('/activities', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { limit = 10 } = req.query;

    const activities = await prisma.activity.findMany({
      where: req.user.role === 'AGENT' ? { lead: { agentId: req.user.agentId } } : {},
      include: {
        lead: { select: { firstName: true, lastName: true } },
        user: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json(activities);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Failed to get activities' });
  }
});

// Get upcoming tasks
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { limit = 10 } = req.query;
    const isAgent = req.user.role === 'AGENT' && req.user.agentId;

    const tasks = await prisma.task.findMany({
      where: {
        ...(isAgent && { agentId: req.user.agentId }),
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      },
      include: {
        transaction: { include: { property: { select: { address: true } } } }
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
      take: parseInt(limit)
    });

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Get upcoming showings
router.get('/showings', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { limit = 10 } = req.query;
    const isAgent = req.user.role === 'AGENT' && req.user.agentId;

    const showings = await prisma.showing.findMany({
      where: {
        ...(isAgent && { agentId: req.user.agentId }),
        scheduledAt: { gte: new Date() },
        status: { in: ['SCHEDULED', 'CONFIRMED'] }
      },
      include: {
        property: { include: { photos: { where: { isPrimary: true }, take: 1 } } },
        lead: { select: { firstName: true, lastName: true, phone: true } }
      },
      orderBy: { scheduledAt: 'asc' },
      take: parseInt(limit)
    });

    res.json(showings);
  } catch (error) {
    console.error('Get showings error:', error);
    res.status(500).json({ error: 'Failed to get showings' });
  }
});

// Get lead statistics
router.get('/lead-stats', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const isAgent = req.user.role === 'AGENT' && req.user.agentId;
    const agentFilter = isAgent ? { agentId: req.user.agentId } : {};

    const [byStatus, bySource] = await Promise.all([
      prisma.lead.groupBy({
        by: ['status'],
        where: agentFilter,
        _count: true
      }),
      prisma.lead.groupBy({
        by: ['sourceId'],
        where: agentFilter,
        _count: true
      })
    ]);

    // Get source names
    const sourceIds = bySource.map(s => s.sourceId).filter(Boolean);
    const sources = await prisma.leadSource.findMany({
      where: { id: { in: sourceIds } }
    });

    const bySourceWithNames = bySource.map(s => ({
      ...s,
      sourceName: sources.find(src => src.id === s.sourceId)?.name || 'Unknown'
    }));

    res.json({ byStatus, bySource: bySourceWithNames });
  } catch (error) {
    console.error('Get lead stats error:', error);
    res.status(500).json({ error: 'Failed to get lead statistics' });
  }
});

// Get performance metrics
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { period = '12' } = req.query;

    if (req.user.role !== 'AGENT' || !req.user.agentId) {
      // Get team performance for managers
      const agents = await prisma.agent.findMany({
        include: {
          user: { select: { firstName: true, lastName: true } },
          performanceMetrics: { orderBy: { period: 'desc' }, take: 1 },
          _count: { select: { transactions: true, leads: true } }
        }
      });

      return res.json({ type: 'team', agents });
    }

    // Get agent's own performance
    const metrics = await prisma.performanceMetric.findMany({
      where: { agentId: req.user.agentId },
      orderBy: { period: 'desc' },
      take: parseInt(period)
    });

    res.json({ type: 'individual', metrics });
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

// Get pipeline overview
router.get('/pipeline', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const isAgent = req.user.role === 'AGENT' && req.user.agentId;
    const agentFilter = isAgent ? { agentId: req.user.agentId } : {};

    const transactions = await prisma.transaction.findMany({
      where: {
        ...agentFilter,
        status: { notIn: ['CLOSED', 'CANCELLED', 'EXPIRED'] }
      },
      include: {
        property: { include: { photos: { where: { isPrimary: true }, take: 1 } } },
        agent: { include: { user: { select: { firstName: true, lastName: true } } } }
      },
      orderBy: { closingDate: 'asc' }
    });

    const byStatus = transactions.reduce((acc, t) => {
      acc[t.status] = acc[t.status] || [];
      acc[t.status].push(t);
      return acc;
    }, {});

    const totalValue = transactions.reduce((sum, t) => sum + (t.listPrice || 0), 0);

    res.json({ transactions, byStatus, totalValue, count: transactions.length });
  } catch (error) {
    console.error('Get pipeline error:', error);
    res.status(500).json({ error: 'Failed to get pipeline' });
  }
});

module.exports = router;
