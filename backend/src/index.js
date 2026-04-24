const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Make prisma available in routes
app.set('prisma', prisma);

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const leadRoutes = require('./routes/leads');
const propertyRoutes = require('./routes/properties');
const transactionRoutes = require('./routes/transactions');
const agentRoutes = require('./routes/agents');
const teamRoutes = require('./routes/teams');
const showingRoutes = require('./routes/showings');
const taskRoutes = require('./routes/tasks');
const campaignRoutes = require('./routes/campaigns');
const openHouseRoutes = require('./routes/openHouses');
const documentRoutes = require('./routes/documents');
const commissionRoutes = require('./routes/commissions');
const savedSearchRoutes = require('./routes/savedSearches');
const favoriteRoutes = require('./routes/favorites');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');
const tagRoutes = require('./routes/tags');
const leadSourceRoutes = require('./routes/leadSources');
const socialPostRoutes = require('./routes/socialPosts');
const flyerRoutes = require('./routes/flyers');
const marketReportRoutes = require('./routes/marketReports');
const notificationRoutes = require('./routes/notifications');
const integrationRoutes = require('./routes/integrations');
const messageRoutes = require('./routes/messages');
const exportRoutes = require('./routes/exports');

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
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/lead-sources', leadSourceRoutes);
app.use('/api/social-posts', socialPostRoutes);
app.use('/api/flyers', flyerRoutes);
app.use('/api/market-reports', marketReportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/exports', exportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
