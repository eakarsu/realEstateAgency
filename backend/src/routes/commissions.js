const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { filterFields } = require('../middleware/fieldFilter');

// Get all commissions
router.get('/', authenticateToken, filterFields('commission'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { agentId, transactionId, status, type, page = 1, limit = 20 } = req.query;

    const where = {};
    if (agentId) where.agentId = agentId;
    if (transactionId) where.transactionId = transactionId;
    if (status) where.status = status;
    if (type) where.type = type;

    if (req.user.role === 'AGENT' && req.user.agentId) {
      where.agentId = req.user.agentId;
    }

    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        include: {
          transaction: { include: { property: { select: { address: true, city: true, price: true } } } },
          agent: { include: { user: { select: { firstName: true, lastName: true } } } }
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.commission.count({ where })
    ]);

    res.json({ commissions, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});

// Get commission by ID
router.get('/:id', authenticateToken, filterFields('commission'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const commission = await prisma.commission.findUnique({
      where: { id: req.params.id },
      include: {
        transaction: { include: { property: true } },
        agent: { include: { user: true } }
      }
    });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    res.json(commission);
  } catch (error) {
    console.error('Get commission error:', error);
    res.status(500).json({ error: 'Failed to get commission' });
  }
});

// Create commission
router.post('/', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { transactionId, agentId, type, rate, amount, splitPercentage, notes } = req.body;

    const splitAmount = amount * (splitPercentage / 100);

    const commission = await prisma.commission.create({
      data: {
        transactionId,
        agentId,
        type,
        rate,
        amount,
        splitPercentage: splitPercentage || 100,
        splitAmount,
        status: 'PENDING',
        notes
      },
      include: { transaction: true, agent: true }
    });

    res.status(201).json(commission);
  } catch (error) {
    console.error('Create commission error:', error);
    res.status(500).json({ error: 'Failed to create commission' });
  }
});

// Update commission
router.put('/:id', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { type, rate, amount, splitPercentage, status, paidAt, notes } = req.body;

    const updateData = { type, rate, notes };
    if (amount) updateData.amount = amount;
    if (splitPercentage) {
      updateData.splitPercentage = splitPercentage;
      if (amount) {
        updateData.splitAmount = amount * (splitPercentage / 100);
      }
    }
    if (status) {
      updateData.status = status;
      if (status === 'PAID') {
        updateData.paidAt = paidAt ? new Date(paidAt) : new Date();
      }
    }

    const commission = await prisma.commission.update({
      where: { id: req.params.id },
      data: updateData,
      include: { transaction: true, agent: true }
    });

    res.json(commission);
  } catch (error) {
    console.error('Update commission error:', error);
    res.status(500).json({ error: 'Failed to update commission' });
  }
});

// Delete commission
router.delete('/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.commission.delete({ where: { id: req.params.id } });
    res.json({ message: 'Commission deleted' });
  } catch (error) {
    console.error('Delete commission error:', error);
    res.status(500).json({ error: 'Failed to delete commission' });
  }
});

// Mark commission as paid
router.post('/:id/pay', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const commission = await prisma.commission.update({
      where: { id: req.params.id },
      data: {
        status: 'PAID',
        paidAt: new Date()
      },
      include: { agent: true, transaction: true }
    });

    res.json(commission);
  } catch (error) {
    console.error('Pay commission error:', error);
    res.status(500).json({ error: 'Failed to mark commission as paid' });
  }
});

// Get commission summary for agent
router.get('/agent/:agentId/summary', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const [pending, paid, yearToDate] = await Promise.all([
      prisma.commission.aggregate({
        where: { agentId: req.params.agentId, status: 'PENDING' },
        _sum: { splitAmount: true },
        _count: true
      }),
      prisma.commission.aggregate({
        where: { agentId: req.params.agentId, status: 'PAID', paidAt: { gte: startOfYear } },
        _sum: { splitAmount: true },
        _count: true
      }),
      prisma.commission.aggregate({
        where: { agentId: req.params.agentId, createdAt: { gte: startOfYear } },
        _sum: { splitAmount: true }
      })
    ]);

    res.json({
      pending: { amount: pending._sum.splitAmount || 0, count: pending._count },
      paid: { amount: paid._sum.splitAmount || 0, count: paid._count },
      yearToDate: yearToDate._sum.splitAmount || 0
    });
  } catch (error) {
    console.error('Get commission summary error:', error);
    res.status(500).json({ error: 'Failed to get commission summary' });
  }
});

// Calculate commission for transaction
router.post('/calculate', authenticateToken, async (req, res) => {
  try {
    const { salePrice, commissionRate, splitPercentage } = req.body;

    const totalCommission = salePrice * (commissionRate / 100);
    const agentCommission = totalCommission * (splitPercentage / 100);

    res.json({
      salePrice,
      commissionRate,
      totalCommission,
      splitPercentage,
      agentCommission
    });
  } catch (error) {
    console.error('Calculate commission error:', error);
    res.status(500).json({ error: 'Failed to calculate commission' });
  }
});

module.exports = router;
