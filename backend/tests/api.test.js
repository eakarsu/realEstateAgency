const request = require('supertest');
const createTestApp = require('./testApp');
const bcrypt = require('bcryptjs');

let app, prisma;
let adminToken, agentToken, clientToken;
let testAdmin, testAgent, testClient;
let testProperty, testLead, testTransaction;

beforeAll(async () => {
  const testApp = createTestApp();
  app = testApp.app;
  prisma = testApp.prisma;

  // Clean up test data
  await prisma.activity.deleteMany({});
  await prisma.tagOnLead.deleteMany({});
  await prisma.tagOnProperty.deleteMany({});
  await prisma.showing.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.savedSearch.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.commission.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.propertyPhoto.deleteMany({});
  await prisma.virtualTour.deleteMany({});
  await prisma.openHouse.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.performanceMetric.deleteMany({});
  await prisma.trainingRecord.deleteMany({});
  await prisma.agent.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.leadSource.deleteMany({});

  // Create test users
  const hashedPassword = await bcrypt.hash('StrongTestPass!2026', 10);

  testAdmin = await prisma.user.create({
    data: {
      email: 'testadmin@test.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Admin',
      role: 'ADMIN'
    }
  });

  const agentUser = await prisma.user.create({
    data: {
      email: 'testagent@test.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Agent',
      role: 'AGENT'
    }
  });

  testAgent = await prisma.agent.create({
    data: {
      userId: agentUser.id,
      licenseNumber: 'TEST-001',
      specializations: ['Residential'],
      yearsExperience: 5
    }
  });

  // Update agentUser with agentId reference
  await prisma.user.update({
    where: { id: agentUser.id },
    data: { agent: { connect: { id: testAgent.id } } }
  });

  testClient = await prisma.user.create({
    data: {
      email: 'testclient@test.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Client',
      role: 'CLIENT'
    }
  });

  // Create test lead source and tag
  await prisma.leadSource.create({
    data: { name: 'Test Website', type: 'website' }
  });

  await prisma.tag.create({
    data: { name: 'Test Tag', color: '#FF0000' }
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ==================== AUTH TESTS ====================

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'StrongTestPass!2026',
          firstName: 'New',
          lastName: 'User',
          role: 'ADMIN'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', 'newuser@test.com');
      expect(res.body.user).toHaveProperty('role', 'CLIENT');
    });

    it('should not register user with existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testadmin@test.com',
          password: 'StrongTestPass!2026',
          firstName: 'Duplicate',
          lastName: 'User'
        });

      expect(res.statusCode).toBe(400);
    });

    it('should require all fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'incomplete@test.com'
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login admin user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testadmin@test.com',
          password: 'StrongTestPass!2026'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      adminToken = res.body.token;
    });

    it('should login agent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testagent@test.com',
          password: 'StrongTestPass!2026'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      agentToken = res.body.token;
    });

    it('should login client user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testclient@test.com',
          password: 'StrongTestPass!2026'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      clientToken = res.body.token;
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testadmin@test.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('email', 'testadmin@test.com');
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Password reset', () => {
    it('stores only a reset-token hash and invalidates the old password', async () => {
      let delivered;
      app.set('passwordResetNotifier', async (message) => { delivered = message; });
      const requested = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'newuser@test.com' });
      expect(requested.statusCode).toBe(200);
      expect(delivered.token).toBeTruthy();

      const stored = await prisma.user.findUnique({ where: { email: 'newuser@test.com' } });
      expect(stored.resetToken).toHaveLength(64);
      expect(stored.resetToken).not.toBe(delivered.token);

      const reset = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: delivered.token, password: 'A-New-Strong-Pass!2026' });
      expect(reset.statusCode).toBe(200);

      const oldLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'newuser@test.com', password: 'StrongTestPass!2026' });
      expect(oldLogin.statusCode).toBe(401);
      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'newuser@test.com', password: 'A-New-Strong-Pass!2026' });
      expect(newLogin.statusCode).toBe(200);
      app.set('passwordResetNotifier', undefined);
    });

    it('does not create a token when no mail adapter is configured', async () => {
      const requested = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'testadmin@test.com' });
      expect(requested.statusCode).toBe(200);
      const stored = await prisma.user.findUnique({ where: { email: 'testadmin@test.com' } });
      expect(stored.resetToken).toBeNull();
    });
  });
});

// ==================== PROPERTIES TESTS ====================

describe('Properties API', () => {
  describe('POST /api/properties', () => {
    it('should create a property (agent)', async () => {
      const res = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          title: 'Test Property',
          type: 'SINGLE_FAMILY',
          status: 'ACTIVE',
          address: '123 Test St',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          price: 500000,
          bedrooms: 3,
          bathrooms: 2
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('title', 'Test Property');
      testProperty = res.body;
    });

    it('should reject property creation without auth', async () => {
      const res = await request(app)
        .post('/api/properties')
        .send({
          title: 'Unauthorized Property',
          type: 'CONDO',
          address: '456 Test Ave',
          city: 'Austin',
          state: 'TX',
          zipCode: '78702',
          price: 300000
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/properties', () => {
    it('should get all properties', async () => {
      const res = await request(app).get('/api/properties');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('properties');
      expect(Array.isArray(res.body.properties)).toBe(true);
    });

    it('should filter properties by type', async () => {
      const res = await request(app)
        .get('/api/properties')
        .query({ type: 'SINGLE_FAMILY' });

      expect(res.statusCode).toBe(200);
      expect(res.body.properties.every(p => p.type === 'SINGLE_FAMILY')).toBe(true);
    });

    it('should filter properties by price range', async () => {
      const res = await request(app)
        .get('/api/properties')
        .query({ minPrice: 400000, maxPrice: 600000 });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should get property by id', async () => {
      const res = await request(app).get(`/api/properties/${testProperty.id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', testProperty.id);
    });

    it('should return 404 for non-existent property', async () => {
      const res = await request(app).get('/api/properties/nonexistent-id');

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/properties/:id', () => {
    it('should update property', async () => {
      const res = await request(app)
        .put(`/api/properties/${testProperty.id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          title: 'Updated Test Property',
          price: 550000
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('title', 'Updated Test Property');
      expect(res.body).toHaveProperty('price', 550000);
    });
  });
});

// ==================== LEADS TESTS ====================

describe('Leads API', () => {
  describe('POST /api/leads', () => {
    it('should create a lead (agent)', async () => {
      const res = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Lead',
          email: 'testlead@test.com',
          phone: '555-1234',
          status: 'NEW',
          budget: 400000
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      testLead = res.body;
    });
  });

  describe('GET /api/leads', () => {
    it('should get all leads', async () => {
      const res = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('leads');
    });

    it('should filter leads by status', async () => {
      const res = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${agentToken}`)
        .query({ status: 'NEW' });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('PUT /api/leads/:id', () => {
    it('should update lead', async () => {
      const res = await request(app)
        .put(`/api/leads/${testLead.id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: 'CONTACTED',
          notes: 'Called and discussed requirements'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'CONTACTED');
    });
  });
});

// ==================== TRANSACTIONS TESTS ====================

describe('Transactions API', () => {
  describe('POST /api/transactions', () => {
    it('should create a transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          propertyId: testProperty.id,
          leadId: testLead.id,
          type: 'BUYER',
          status: 'INITIATED',
          listPrice: 550000
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      testTransaction = res.body;
    });
  });

  describe('GET /api/transactions', () => {
    it('should get all transactions', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('transactions');
    });
  });
});

// ==================== AGENTS TESTS ====================

describe('Agents API', () => {
  describe('GET /api/agents', () => {
    it('should get all agents', async () => {
      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('agents');
    });
  });

  describe('GET /api/agents/:id', () => {
    it('should get agent by id', async () => {
      const res = await request(app)
        .get(`/api/agents/${testAgent.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', testAgent.id);
    });
  });
});

// ==================== TEAMS TESTS ====================

describe('Teams API', () => {
  let testTeam;

  describe('POST /api/teams', () => {
    it('should create a team (admin)', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Team',
          description: 'A test team'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      testTeam = res.body;
    });
  });

  describe('GET /api/teams', () => {
    it('should get all teams', async () => {
      const res = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

// ==================== SHOWINGS TESTS ====================

describe('Showings API', () => {
  let testShowing;

  describe('POST /api/showings', () => {
    it('should create a showing', async () => {
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + 1);

      const res = await request(app)
        .post('/api/showings')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          propertyId: testProperty.id,
          leadId: testLead.id,
          scheduledAt: scheduledAt.toISOString(),
          notes: 'Test showing'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      testShowing = res.body;
    });
  });

  describe('GET /api/showings', () => {
    it('should get all showings', async () => {
      const res = await request(app)
        .get('/api/showings')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('showings');
    });
  });
});

// ==================== TASKS TESTS ====================

describe('Tasks API', () => {
  let testTask;

  describe('POST /api/tasks', () => {
    it('should create a task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          title: 'Test Task',
          description: 'A test task',
          priority: 'HIGH',
          dueDate: new Date(Date.now() + 86400000).toISOString()
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      testTask = res.body;
    });
  });

  describe('GET /api/tasks', () => {
    it('should get all tasks', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('tasks');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task status', async () => {
      const res = await request(app)
        .put(`/api/tasks/${testTask.id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: 'COMPLETED'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'COMPLETED');
    });
  });
});

// ==================== TAGS TESTS ====================

describe('Tags API', () => {
  describe('GET /api/tags', () => {
    it('should get all tags', async () => {
      const res = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/tags', () => {
    it('should create a tag (admin)', async () => {
      const res = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Test Tag',
          color: '#00FF00'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('name', 'New Test Tag');
    });
  });
});

// ==================== LEAD SOURCES TESTS ====================

describe('Lead Sources API', () => {
  describe('GET /api/lead-sources', () => {
    it('should get all lead sources', async () => {
      const res = await request(app)
        .get('/api/lead-sources')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

// ==================== NOTIFICATIONS TESTS ====================

describe('Notifications API', () => {
  describe('GET /api/notifications', () => {
    it('should get user notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('notifications');
    });
  });
});

// ==================== FAVORITES TESTS ====================

describe('Favorites API', () => {
  describe('POST /api/favorites', () => {
    it('should add property to favorites', async () => {
      const res = await request(app)
        .post('/api/favorites')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          propertyId: testProperty.id
        });

      expect(res.statusCode).toBe(201);
    });
  });

  describe('GET /api/favorites', () => {
    it('should get user favorites', async () => {
      const res = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

// ==================== SAVED SEARCHES TESTS ====================

describe('Saved Searches API', () => {
  describe('POST /api/saved-searches', () => {
    it('should create a saved search', async () => {
      const res = await request(app)
        .post('/api/saved-searches')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          name: 'Test Search',
          criteria: { minPrice: 300000, maxPrice: 600000, bedrooms: 3 }
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('name', 'Test Search');
    });
  });

  describe('GET /api/saved-searches', () => {
    it('should get user saved searches', async () => {
      const res = await request(app)
        .get('/api/saved-searches')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

// ==================== DASHBOARD TESTS ====================

describe('Dashboard API', () => {
  describe('GET /api/dashboard/overview', () => {
    it('should get dashboard overview', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('leads');
      expect(res.body).toHaveProperty('listings');
      expect(res.body).toHaveProperty('transactions');
    });
  });
});

// ==================== HEALTH CHECK ====================

describe('Health Check', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });
});

// ==================== CLEANUP TESTS ====================

describe('Cleanup - Delete Operations', () => {
  describe('DELETE /api/transactions/:id', () => {
    it('should delete transaction (admin)', async () => {
      const res = await request(app)
        .delete(`/api/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/properties/:id', () => {
    it('should delete property (admin)', async () => {
      const res = await request(app)
        .delete(`/api/properties/${testProperty.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });
  });
});
