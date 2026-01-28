const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all teams
router.get('/', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const teams = await prisma.team.findMany({
      include: {
        agents: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, avatar: true } }
          }
        },
        _count: { select: { agents: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to get teams' });
  }
});

// Get team by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        agents: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true, avatar: true } },
            _count: { select: { leads: true, properties: true, transactions: true } }
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to get team' });
  }
});

// Create team
router.post('/', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, description, leadAgentId } = req.body;

    const team = await prisma.team.create({
      data: { name, description, leadAgentId }
    });

    // If lead agent specified, update their record
    if (leadAgentId) {
      await prisma.agent.update({
        where: { id: leadAgentId },
        data: { teamId: team.id, isLeadAgent: true }
      });
    }

    res.status(201).json(team);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Update team
router.put('/:id', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, description, leadAgentId } = req.body;

    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: { name, description, leadAgentId }
    });

    res.json(team);
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Delete team
router.delete('/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    // Remove agents from team
    await prisma.agent.updateMany({
      where: { teamId: req.params.id },
      data: { teamId: null, isLeadAgent: false }
    });

    await prisma.team.delete({ where: { id: req.params.id } });
    res.json({ message: 'Team deleted' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// Add agent to team
router.post('/:id/agents', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { agentId, isLeadAgent } = req.body;

    await prisma.agent.update({
      where: { id: agentId },
      data: { teamId: req.params.id, isLeadAgent: isLeadAgent || false }
    });

    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { agents: { include: { user: true } } }
    });

    res.json(team);
  } catch (error) {
    console.error('Add agent to team error:', error);
    res.status(500).json({ error: 'Failed to add agent to team' });
  }
});

// Remove agent from team
router.delete('/:id/agents/:agentId', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    await prisma.agent.update({
      where: { id: req.params.agentId },
      data: { teamId: null, isLeadAgent: false }
    });

    res.json({ message: 'Agent removed from team' });
  } catch (error) {
    console.error('Remove agent from team error:', error);
    res.status(500).json({ error: 'Failed to remove agent from team' });
  }
});

// Get team performance
router.get('/:id/performance', authenticateToken, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        agents: {
          include: {
            performanceMetrics: { orderBy: { period: 'desc' }, take: 1 }
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Aggregate team performance
    const totals = team.agents.reduce((acc, agent) => {
      const latest = agent.performanceMetrics[0];
      if (latest) {
        acc.totalVolume += latest.totalVolume || 0;
        acc.totalCommission += latest.totalCommission || 0;
        acc.listingsSold += latest.listingsSold || 0;
        acc.leadsConverted += latest.leadsConverted || 0;
      }
      return acc;
    }, { totalVolume: 0, totalCommission: 0, listingsSold: 0, leadsConverted: 0 });

    res.json({ team, totals });
  } catch (error) {
    console.error('Get team performance error:', error);
    res.status(500).json({ error: 'Failed to get team performance' });
  }
});

module.exports = router;
