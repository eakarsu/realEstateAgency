const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get all tasks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { status, priority, transactionId, agentId, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (transactionId) where.transactionId = transactionId;
    if (agentId) where.agentId = agentId;

    if (req.user.role === 'AGENT' && req.user.agentId) {
      where.agentId = req.user.agentId;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          transaction: { include: { property: true } },
          agent: { include: { user: { select: { firstName: true, lastName: true } } } }
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }]
      }),
      prisma.task.count({ where })
    ]);

    res.json({ tasks, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Get task by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        transaction: { include: { property: true } },
        agent: { include: { user: true } }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// Create task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { transactionId, title, description, dueDate, priority, agentId } = req.body;

    // For admin/manager without agentId, get first available agent
    let assignedAgentId = agentId || req.user.agentId;
    if (!assignedAgentId && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')) {
      const firstAgent = await prisma.agent.findFirst();
      assignedAgentId = firstAgent?.id;
    }

    const task = await prisma.task.create({
      data: {
        transactionId,
        agentId: assignedAgentId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'MEDIUM',
        status: 'PENDING'
      },
      include: { transaction: true }
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { title, description, dueDate, priority, status, agentId } = req.body;

    const updateData = { title, description, priority, agentId };
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (status) {
      updateData.status = status;
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
      include: { transaction: true, agent: true }
    });

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Bulk delete tasks
router.post('/bulk-delete', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    await prisma.task.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${ids.length} tasks deleted`, count: ids.length });
  } catch (error) {
    console.error('Bulk delete tasks error:', error);
    res.status(500).json({ error: 'Failed to bulk delete tasks' });
  }
});

// Bulk update tasks
router.post('/bulk-update', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { ids, data } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const allowedFields = ['status', 'priority', 'agentId'];
    const updateData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    await prisma.task.updateMany({ where: { id: { in: ids } }, data: updateData });
    res.json({ message: `${ids.length} tasks updated`, count: ids.length });
  } catch (error) {
    console.error('Bulk update tasks error:', error);
    res.status(500).json({ error: 'Failed to bulk update tasks' });
  }
});

// Get overdue tasks
router.get('/overdue/list', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const where = {
      dueDate: { lt: new Date() },
      status: { in: ['PENDING', 'IN_PROGRESS'] }
    };

    if (req.user.role === 'AGENT' && req.user.agentId) {
      where.agentId = req.user.agentId;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        transaction: { include: { property: true } },
        agent: { include: { user: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    res.json(tasks);
  } catch (error) {
    console.error('Get overdue tasks error:', error);
    res.status(500).json({ error: 'Failed to get overdue tasks' });
  }
});

// Get tasks due today
router.get('/today/list', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = {
      dueDate: { gte: today, lt: tomorrow },
      status: { in: ['PENDING', 'IN_PROGRESS'] }
    };

    if (req.user.role === 'AGENT' && req.user.agentId) {
      where.agentId = req.user.agentId;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        transaction: { include: { property: true } }
      },
      orderBy: { priority: 'desc' }
    });

    res.json(tasks);
  } catch (error) {
    console.error('Get today tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Mark task complete
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

module.exports = router;
