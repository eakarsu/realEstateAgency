const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const createTestApp = () => {
  const app = express();
  const prisma = new PrismaClient();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Make prisma available in routes
  app.set('prisma', prisma);

  // Routes
  const authRoutes = require('../src/routes/auth');
  const userRoutes = require('../src/routes/users');
  const leadRoutes = require('../src/routes/leads');
  const propertyRoutes = require('../src/routes/properties');
  const transactionRoutes = require('../src/routes/transactions');
  const agentRoutes = require('../src/routes/agents');
  const teamRoutes = require('../src/routes/teams');
  const showingRoutes = require('../src/routes/showings');
  const taskRoutes = require('../src/routes/tasks');
  const campaignRoutes = require('../src/routes/campaigns');
  const openHouseRoutes = require('../src/routes/openHouses');
  const documentRoutes = require('../src/routes/documents');
  const commissionRoutes = require('../src/routes/commissions');
  const savedSearchRoutes = require('../src/routes/savedSearches');
  const favoriteRoutes = require('../src/routes/favorites');
  const dashboardRoutes = require('../src/routes/dashboard');
  const tagRoutes = require('../src/routes/tags');
  const leadSourceRoutes = require('../src/routes/leadSources');
  const socialPostRoutes = require('../src/routes/socialPosts');
  const flyerRoutes = require('../src/routes/flyers');
  const marketReportRoutes = require('../src/routes/marketReports');
  const notificationRoutes = require('../src/routes/notifications');
  const integrationRoutes = require('../src/routes/integrations');
  const messageRoutes = require('../src/routes/messages');
  const aiRoutes = require('../src/routes/ai');

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/properties', propertyRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/agents', agentRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/showings', showingRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/open-houses', openHouseRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/commissions', commissionRoutes);
  app.use('/api/saved-searches', savedSearchRoutes);
  app.use('/api/favorites', favoriteRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/tags', tagRoutes);
  app.use('/api/lead-sources', leadSourceRoutes);
  app.use('/api/social-posts', socialPostRoutes);
  app.use('/api/flyers', flyerRoutes);
  app.use('/api/market-reports', marketReportRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/integrations', integrationRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/ai', aiRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });

  return { app, prisma };
};

module.exports = createTestApp;
