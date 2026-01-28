const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all transactions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { status, type, agentId, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (agentId) where.agentId = agentId;

    if (req.user.role === 'AGENT' && req.user.agentId) {
      where.agentId = req.user.agentId;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          property: { include: { photos: { where: { isPrimary: true }, take: 1 } } },
          agent: { include: { user: { select: { firstName: true, lastName: true } } } },
          lead: true,
          _count: { select: { documents: true, tasks: true, milestones: true } }
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({ transactions, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Get transaction by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        property: { include: { photos: true, agent: true } },
        agent: { include: { user: true } },
        lead: true,
        documents: { orderBy: { createdAt: 'desc' } },
        milestones: { orderBy: { order: 'asc' } },
        tasks: { orderBy: { dueDate: 'asc' } },
        checklists: true,
        commissions: { include: { agent: { include: { user: true } } } }
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

// Create transaction
router.post('/', authenticateToken, requireRole('ADMIN', 'MANAGER', 'AGENT'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const {
      propertyId, leadId, type, listPrice, earnestMoney, closingDate,
      contractDate, financingType, lenderName, buyerName, buyerEmail,
      buyerPhone, sellerName, sellerEmail, sellerPhone, notes, agentId
    } = req.body;

    // For admin/manager without agentId, get first available agent
    let assignedAgentId = agentId || req.user.agentId;
    if (!assignedAgentId && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')) {
      const firstAgent = await prisma.agent.findFirst();
      assignedAgentId = firstAgent?.id;
    }

    const transaction = await prisma.transaction.create({
      data: {
        propertyId,
        agentId: assignedAgentId,
        leadId,
        type,
        status: 'INITIATED',
        listPrice,
        earnestMoney,
        closingDate: closingDate ? new Date(closingDate) : null,
        contractDate: contractDate ? new Date(contractDate) : null,
        financingType,
        lenderName,
        buyerName,
        buyerEmail,
        buyerPhone,
        sellerName,
        sellerEmail,
        sellerPhone,
        notes
      },
      include: { property: true, agent: true }
    });

    // Create default milestones
    const defaultMilestones = [
      { name: 'Contract Signed', order: 1 },
      { name: 'Earnest Money Deposited', order: 2 },
      { name: 'Inspection Completed', order: 3 },
      { name: 'Appraisal Completed', order: 4 },
      { name: 'Loan Approved', order: 5 },
      { name: 'Final Walkthrough', order: 6 },
      { name: 'Closing', order: 7 }
    ];

    await prisma.milestone.createMany({
      data: defaultMilestones.map(m => ({
        transactionId: transaction.id,
        name: m.name,
        order: m.order
      }))
    });

    // Create default compliance checklist
    const checklistItems = [
      { item: 'Agency Disclosure', completed: false },
      { item: 'Property Disclosure', completed: false },
      { item: 'Lead Paint Disclosure', completed: false },
      { item: 'Contract Executed', completed: false },
      { item: 'Earnest Money Receipt', completed: false },
      { item: 'Title Commitment', completed: false },
      { item: 'Survey', completed: false },
      { item: 'HOA Documents', completed: false },
      { item: 'Insurance Binder', completed: false },
      { item: 'Closing Disclosure', completed: false }
    ];

    await prisma.complianceChecklist.create({
      data: {
        transactionId: transaction.id,
        name: 'Standard Compliance Checklist',
        items: checklistItems,
        totalItems: checklistItems.length
      }
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Update transaction
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const {
      status, salePrice, earnestMoney, closingDate, actualClosingDate,
      contractDate, inspectionDate, appraisalDate, financingType,
      lenderName, buyerName, buyerEmail, buyerPhone,
      sellerName, sellerEmail, sellerPhone, notes
    } = req.body;

    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        status,
        salePrice,
        earnestMoney,
        closingDate: closingDate ? new Date(closingDate) : undefined,
        actualClosingDate: actualClosingDate ? new Date(actualClosingDate) : undefined,
        contractDate: contractDate ? new Date(contractDate) : undefined,
        inspectionDate: inspectionDate ? new Date(inspectionDate) : undefined,
        appraisalDate: appraisalDate ? new Date(appraisalDate) : undefined,
        financingType,
        lenderName,
        buyerName,
        buyerEmail,
        buyerPhone,
        sellerName,
        sellerEmail,
        sellerPhone,
        notes
      },
      include: { property: true, agent: true, milestones: true }
    });

    // If closing, update property status
    if (status === 'CLOSED') {
      await prisma.property.update({
        where: { id: transaction.propertyId },
        data: { status: 'SOLD', soldAt: new Date() }
      });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Delete transaction
router.delete('/:id', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const transactionId = req.params.id;

    // Delete related records first to avoid foreign key constraints
    await prisma.$transaction([
      prisma.milestone.deleteMany({ where: { transactionId } }),
      prisma.document.deleteMany({ where: { transactionId } }),
      prisma.task.deleteMany({ where: { transactionId } }),
      prisma.complianceChecklist.deleteMany({ where: { transactionId } }),
      prisma.commission.deleteMany({ where: { transactionId } }),
      prisma.transaction.delete({ where: { id: transactionId } })
    ]);

    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Update milestone
router.put('/:id/milestones/:milestoneId', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { completedAt, dueDate } = req.body;

    const milestone = await prisma.milestone.update({
      where: { id: req.params.milestoneId },
      data: {
        completedAt: completedAt ? new Date(completedAt) : null,
        dueDate: dueDate ? new Date(dueDate) : undefined
      }
    });

    res.json(milestone);
  } catch (error) {
    console.error('Update milestone error:', error);
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

// Update checklist
router.put('/:id/checklists/:checklistId', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { items } = req.body;

    const completedItems = items.filter(i => i.completed).length;

    const checklist = await prisma.complianceChecklist.update({
      where: { id: req.params.checklistId },
      data: {
        items,
        completedItems
      }
    });

    res.json(checklist);
  } catch (error) {
    console.error('Update checklist error:', error);
    res.status(500).json({ error: 'Failed to update checklist' });
  }
});

// Get transaction statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const where = {};
    if (req.user.role === 'AGENT' && req.user.agentId) {
      where.agentId = req.user.agentId;
    }

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const [total, byStatus, closedThisYear, totalVolume] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      prisma.transaction.count({
        where: {
          ...where,
          status: 'CLOSED',
          actualClosingDate: { gte: startOfYear }
        }
      }),
      prisma.transaction.aggregate({
        where: {
          ...where,
          status: 'CLOSED',
          actualClosingDate: { gte: startOfYear }
        },
        _sum: { salePrice: true }
      })
    ]);

    res.json({
      total,
      byStatus,
      closedThisYear,
      totalVolume: totalVolume._sum.salePrice || 0
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;
