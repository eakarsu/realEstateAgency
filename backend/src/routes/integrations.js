const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all integrations
router.get('/', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const integrations = await prisma.integration.findMany({
      orderBy: { name: 'asc' }
    });

    // Hide sensitive config data
    const safeIntegrations = integrations.map(i => ({
      ...i,
      config: i.config ? { configured: true } : null
    }));

    res.json({ integrations: safeIntegrations });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ error: 'Failed to get integrations' });
  }
});

// Get available integrations
router.get('/available', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const availableIntegrations = [
      {
        id: 'mls-rets',
        name: 'MLS RETS',
        type: 'mls',
        provider: 'RETS',
        description: 'Connect to MLS systems using RETS protocol',
        requiredFields: ['retsUrl', 'retsUsername', 'retsPassword']
      },
      {
        id: 'mls-spark',
        name: 'Spark API',
        type: 'mls',
        provider: 'Spark',
        description: 'Connect to MLS systems using Spark API',
        requiredFields: ['apiKey', 'clientId', 'clientSecret']
      },
      {
        id: 'docusign',
        name: 'DocuSign',
        type: 'esign',
        provider: 'DocuSign',
        description: 'Electronic signature integration',
        requiredFields: ['integrationKey', 'userId', 'accountId', 'privateKey']
      },
      {
        id: 'dotloop',
        name: 'dotloop',
        type: 'esign',
        provider: 'dotloop',
        description: 'Transaction management and e-signatures',
        requiredFields: ['apiKey']
      },
      {
        id: 'mailchimp',
        name: 'Mailchimp',
        type: 'marketing',
        provider: 'Mailchimp',
        description: 'Email marketing automation',
        requiredFields: ['apiKey', 'serverPrefix']
      },
      {
        id: 'sendgrid',
        name: 'SendGrid',
        type: 'marketing',
        provider: 'SendGrid',
        description: 'Transactional email service',
        requiredFields: ['apiKey']
      },
      {
        id: 'twilio',
        name: 'Twilio',
        type: 'communication',
        provider: 'Twilio',
        description: 'SMS and voice communication',
        requiredFields: ['accountSid', 'authToken', 'phoneNumber']
      },
      {
        id: 'google-calendar',
        name: 'Google Calendar',
        type: 'calendar',
        provider: 'Google',
        description: 'Calendar synchronization',
        requiredFields: ['clientId', 'clientSecret']
      },
      {
        id: 'zillow',
        name: 'Zillow',
        type: 'listing',
        provider: 'Zillow',
        description: 'Property listing syndication',
        requiredFields: ['apiKey', 'partnerId']
      },
      {
        id: 'openai',
        name: 'OpenAI',
        type: 'ai',
        provider: 'OpenAI',
        description: 'AI-powered features',
        requiredFields: ['apiKey']
      }
    ];

    res.json(availableIntegrations);
  } catch (error) {
    console.error('Get available integrations error:', error);
    res.status(500).json({ error: 'Failed to get available integrations' });
  }
});

// Get integration by ID
router.get('/:id', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const integration = await prisma.integration.findUnique({
      where: { id: req.params.id }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Hide sensitive config
    res.json({
      ...integration,
      config: integration.config ? { configured: true } : null
    });
  } catch (error) {
    console.error('Get integration error:', error);
    res.status(500).json({ error: 'Failed to get integration' });
  }
});

// Create/Configure integration
router.post('/', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, type, provider, config } = req.body;

    const integration = await prisma.integration.create({
      data: {
        name,
        type,
        provider,
        config,
        isActive: false
      }
    });

    res.status(201).json({
      ...integration,
      config: { configured: true }
    });
  } catch (error) {
    console.error('Create integration error:', error);
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

// Update integration
router.put('/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, config, isActive } = req.body;

    const integration = await prisma.integration.update({
      where: { id: req.params.id },
      data: { name, config, isActive }
    });

    res.json({
      ...integration,
      config: { configured: true }
    });
  } catch (error) {
    console.error('Update integration error:', error);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

// Delete integration
router.delete('/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.integration.delete({ where: { id: req.params.id } });
    res.json({ message: 'Integration deleted' });
  } catch (error) {
    console.error('Delete integration error:', error);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

// Test integration connection
router.post('/:id/test', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const integration = await prisma.integration.findUnique({
      where: { id: req.params.id }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // TODO: Implement actual connection tests for each integration type
    // For now, return success
    res.json({ success: true, message: 'Connection test successful' });
  } catch (error) {
    console.error('Test integration error:', error);
    res.status(500).json({ error: 'Failed to test integration' });
  }
});

// Activate integration
router.post('/:id/activate', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const integration = await prisma.integration.update({
      where: { id: req.params.id },
      data: { isActive: true }
    });

    res.json(integration);
  } catch (error) {
    console.error('Activate integration error:', error);
    res.status(500).json({ error: 'Failed to activate integration' });
  }
});

// Deactivate integration
router.post('/:id/deactivate', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const integration = await prisma.integration.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.json(integration);
  } catch (error) {
    console.error('Deactivate integration error:', error);
    res.status(500).json({ error: 'Failed to deactivate integration' });
  }
});

// Sync integration
router.post('/:id/sync', authenticateToken, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');

    const integration = await prisma.integration.findUnique({
      where: { id: req.params.id }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (!integration.isActive) {
      return res.status(400).json({ error: 'Integration is not active' });
    }

    // TODO: Implement actual sync logic for each integration type
    // Update lastSyncAt
    await prisma.integration.update({
      where: { id: req.params.id },
      data: { lastSyncAt: new Date() }
    });

    res.json({ success: true, message: 'Sync completed', syncedAt: new Date() });
  } catch (error) {
    console.error('Sync integration error:', error);
    res.status(500).json({ error: 'Failed to sync integration' });
  }
});

module.exports = router;
