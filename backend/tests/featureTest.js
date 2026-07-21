/**
 * Comprehensive Feature Test - Tests all buttons and features
 * Using Admin account: admin@realestate.com / StrongTestPass!2026
 */

const http = require('http');
const BASE_URL = 'http://localhost:3001/api';

function fetchAPI(endpoint, options = {}) {
  return new Promise((resolve) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, ok: res.statusCode >= 200 && res.statusCode < 300 });
        } catch {
          resolve({ status: res.statusCode, data: {}, ok: res.statusCode >= 200 && res.statusCode < 300 });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ status: 500, data: { error: e.message }, ok: false });
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n========================================');
  console.log('  COMPREHENSIVE FEATURE TEST');
  console.log('  Admin: admin@realestate.com');
  console.log('========================================\n');

  const results = { passed: 0, failed: 0, tests: [] };

  function test(name, passed, details = '') {
    results.tests.push({ name, passed, details });
    if (passed) {
      results.passed++;
      console.log(`✓ ${name}`);
    } else {
      results.failed++;
      console.log(`✗ ${name} - ${details}`);
    }
  }

  let adminToken = '';
  let testPropertyId = '';
  let testLeadId = '';
  let testTransactionId = '';
  let testTeamId = '';
  let testShowingId = '';
  let testTaskId = '';
  let testCampaignId = '';
  let testOpenHouseId = '';

  // ==================== AUTH TESTS ====================
  console.log('\n--- AUTHENTICATION ---');

  // Login
  const loginRes = await fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@realestate.com', password: 'StrongTestPass!2026' })
  });
  test('Login with admin credentials', loginRes.ok && loginRes.data.token, loginRes.data.error);
  adminToken = loginRes.data.token;

  const authHeaders = { Authorization: `Bearer ${adminToken}` };

  // Get current user
  const meRes = await fetchAPI('/auth/me', { headers: authHeaders });
  test('Get current user (/me)', meRes.ok && meRes.data.email === 'admin@realestate.com', meRes.data.error);

  // ==================== DASHBOARD ====================
  console.log('\n--- DASHBOARD ---');

  const dashRes = await fetchAPI('/dashboard/overview', { headers: authHeaders });
  test('Dashboard overview', dashRes.ok && dashRes.data.leads, dashRes.data.error);

  // ==================== PROPERTIES ====================
  console.log('\n--- PROPERTIES ---');

  // List properties
  const propsRes = await fetchAPI('/properties', { headers: authHeaders });
  test('List all properties', propsRes.ok && Array.isArray(propsRes.data.properties), propsRes.data.error);

  // Create property
  const createPropRes = await fetchAPI('/properties', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Test Property Feature',
      type: 'SINGLE_FAMILY',
      status: 'ACTIVE',
      address: '999 Test Feature St',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      price: 600000,
      bedrooms: 4,
      bathrooms: 3
    })
  });
  if (!createPropRes.ok) console.log('  DEBUG property response:', JSON.stringify(createPropRes));
  test('Create new property', createPropRes.ok && createPropRes.data.id, createPropRes.data.error);
  testPropertyId = createPropRes.data.id;

  // Get property by ID
  if (testPropertyId) {
    const getPropRes = await fetchAPI(`/properties/${testPropertyId}`, { headers: authHeaders });
    test('Get property by ID', getPropRes.ok && getPropRes.data.title, getPropRes.data.error);

    // Update property
    const updatePropRes = await fetchAPI(`/properties/${testPropertyId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ price: 650000, title: 'Updated Test Property' })
    });
    test('Update property', updatePropRes.ok && updatePropRes.data.price === 650000, updatePropRes.data.error);
  }

  // Filter properties
  const filterPropsRes = await fetchAPI('/properties?type=SINGLE_FAMILY&minPrice=500000', { headers: authHeaders });
  test('Filter properties by type and price', filterPropsRes.ok, filterPropsRes.data.error);

  // Property stats
  const propStatsRes = await fetchAPI('/properties/stats/overview', { headers: authHeaders });
  test('Get property statistics', propStatsRes.ok, propStatsRes.data.error);

  // ==================== LEADS ====================
  console.log('\n--- LEADS ---');

  // List leads
  const leadsRes = await fetchAPI('/leads', { headers: authHeaders });
  test('List all leads', leadsRes.ok && leadsRes.data.leads, leadsRes.data.error);

  // Create lead
  const createLeadRes = await fetchAPI('/leads', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'FeatureLead',
      email: 'testfeature@example.com',
      phone: '555-9999',
      status: 'NEW',
      budget: 500000
    })
  });
  test('Create new lead', createLeadRes.ok && createLeadRes.data.id, createLeadRes.data.error);
  testLeadId = createLeadRes.data.id;

  // Update lead
  if (testLeadId) {
    const updateLeadRes = await fetchAPI(`/leads/${testLeadId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ status: 'CONTACTED', notes: 'Initial contact made' })
    });
    test('Update lead status', updateLeadRes.ok && updateLeadRes.data.status === 'CONTACTED', updateLeadRes.data.error);
  }

  // Lead stats
  const leadStatsRes = await fetchAPI('/leads/stats/overview', { headers: authHeaders });
  test('Get lead statistics', leadStatsRes.ok, leadStatsRes.data.error);

  // ==================== TRANSACTIONS ====================
  console.log('\n--- TRANSACTIONS ---');

  // List transactions
  const transRes = await fetchAPI('/transactions', { headers: authHeaders });
  test('List all transactions', transRes.ok && transRes.data.transactions, transRes.data.error);

  // Create transaction
  if (testPropertyId && testLeadId) {
    const createTransRes = await fetchAPI('/transactions', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        propertyId: testPropertyId,
        leadId: testLeadId,
        type: 'BUYER',
        status: 'INITIATED',
        listPrice: 650000
      })
    });
    test('Create new transaction', createTransRes.ok && createTransRes.data.id, createTransRes.data.error);
    testTransactionId = createTransRes.data.id;
  }

  // Get transaction by ID
  if (testTransactionId) {
    const getTransRes = await fetchAPI(`/transactions/${testTransactionId}`, { headers: authHeaders });
    test('Get transaction by ID', getTransRes.ok && getTransRes.data.milestones, getTransRes.data.error);

    // Update transaction
    const updateTransRes = await fetchAPI(`/transactions/${testTransactionId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ status: 'UNDER_CONTRACT' })
    });
    test('Update transaction status', updateTransRes.ok, updateTransRes.data.error);
  }

  // Transaction stats
  const transStatsRes = await fetchAPI('/transactions/stats/overview', { headers: authHeaders });
  test('Get transaction statistics', transStatsRes.ok, transStatsRes.data.error);

  // ==================== AGENTS ====================
  console.log('\n--- AGENTS ---');

  const agentsRes = await fetchAPI('/agents', { headers: authHeaders });
  test('List all agents', agentsRes.ok && agentsRes.data.agents, agentsRes.data.error);

  if (agentsRes.data.agents && agentsRes.data.agents.length > 0) {
    const agentId = agentsRes.data.agents[0].id;
    const getAgentRes = await fetchAPI(`/agents/${agentId}`, { headers: authHeaders });
    test('Get agent by ID', getAgentRes.ok && getAgentRes.data.user, getAgentRes.data.error);

    const agentStatsRes = await fetchAPI(`/agents/${agentId}/stats`, { headers: authHeaders });
    test('Get agent statistics', agentStatsRes.ok, agentStatsRes.data.error);
  }

  // ==================== TEAMS ====================
  console.log('\n--- TEAMS ---');

  const teamsRes = await fetchAPI('/teams', { headers: authHeaders });
  test('List all teams', teamsRes.ok && Array.isArray(teamsRes.data), teamsRes.data.error);

  // Create team
  const createTeamRes = await fetchAPI('/teams', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: 'Test Feature Team', description: 'Team for feature testing' })
  });
  test('Create new team', createTeamRes.ok && createTeamRes.data.id, createTeamRes.data.error);
  testTeamId = createTeamRes.data.id;

  // ==================== SHOWINGS ====================
  console.log('\n--- SHOWINGS ---');

  const showingsRes = await fetchAPI('/showings', { headers: authHeaders });
  test('List all showings', showingsRes.ok && showingsRes.data.showings, showingsRes.data.error);

  // Create showing
  if (testPropertyId && testLeadId) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const createShowingRes = await fetchAPI('/showings', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        propertyId: testPropertyId,
        leadId: testLeadId,
        scheduledAt: tomorrow.toISOString(),
        notes: 'Test feature showing'
      })
    });
    test('Create new showing', createShowingRes.ok && createShowingRes.data.id, createShowingRes.data.error);
    testShowingId = createShowingRes.data.id;
  }

  // ==================== TASKS ====================
  console.log('\n--- TASKS ---');

  const tasksRes = await fetchAPI('/tasks', { headers: authHeaders });
  test('List all tasks', tasksRes.ok && tasksRes.data.tasks, tasksRes.data.error);

  // Create task
  const createTaskRes = await fetchAPI('/tasks', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Test Feature Task',
      description: 'Task for feature testing',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 86400000).toISOString()
    })
  });
  test('Create new task', createTaskRes.ok && createTaskRes.data.id, createTaskRes.data.error);
  testTaskId = createTaskRes.data.id;

  // Update task
  if (testTaskId) {
    const updateTaskRes = await fetchAPI(`/tasks/${testTaskId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ status: 'COMPLETED' })
    });
    test('Update task status', updateTaskRes.ok && updateTaskRes.data.status === 'COMPLETED', updateTaskRes.data.error);
  }

  // ==================== CAMPAIGNS ====================
  console.log('\n--- CAMPAIGNS ---');

  const campaignsRes = await fetchAPI('/campaigns', { headers: authHeaders });
  test('List all campaigns', campaignsRes.ok && campaignsRes.data.campaigns, campaignsRes.data.error);

  // Create campaign
  const createCampRes = await fetchAPI('/campaigns', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Test Feature Campaign',
      type: 'EMAIL',
      status: 'DRAFT'
    })
  });
  test('Create new campaign', createCampRes.ok && createCampRes.data.id, createCampRes.data.error);
  testCampaignId = createCampRes.data.id;

  // ==================== OPEN HOUSES ====================
  console.log('\n--- OPEN HOUSES ---');

  const openHousesRes = await fetchAPI('/open-houses', { headers: authHeaders });
  test('List all open houses', openHousesRes.ok && openHousesRes.data.openHouses, openHousesRes.data.error);

  // Create open house
  if (testPropertyId) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const createOHRes = await fetchAPI('/open-houses', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        propertyId: testPropertyId,
        date: nextWeek.toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '17:00'
      })
    });
    test('Create new open house', createOHRes.ok && createOHRes.data.id, createOHRes.data.error);
    testOpenHouseId = createOHRes.data.id;
  }

  // ==================== DOCUMENTS ====================
  console.log('\n--- DOCUMENTS ---');

  const docsRes = await fetchAPI('/documents', { headers: authHeaders });
  test('List all documents', docsRes.ok && docsRes.data.documents, docsRes.data.error);

  // ==================== COMMISSIONS ====================
  console.log('\n--- COMMISSIONS ---');

  const commissionsRes = await fetchAPI('/commissions', { headers: authHeaders });
  test('List all commissions', commissionsRes.ok && commissionsRes.data.commissions, commissionsRes.data.error);

  // ==================== TAGS ====================
  console.log('\n--- TAGS ---');

  const tagsRes = await fetchAPI('/tags', { headers: authHeaders });
  test('List all tags', tagsRes.ok && Array.isArray(tagsRes.data), tagsRes.data.error);

  // Create tag (use timestamp to ensure unique name)
  const createTagRes = await fetchAPI('/tags', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: `Test Tag ${Date.now()}`, color: '#FF5733' })
  });
  test('Create new tag', createTagRes.ok && createTagRes.data.id, createTagRes.data.error);

  // ==================== LEAD SOURCES ====================
  console.log('\n--- LEAD SOURCES ---');

  const leadSourcesRes = await fetchAPI('/lead-sources', { headers: authHeaders });
  test('List all lead sources', leadSourcesRes.ok && Array.isArray(leadSourcesRes.data), leadSourcesRes.data.error);

  // ==================== SAVED SEARCHES ====================
  console.log('\n--- SAVED SEARCHES ---');

  const savedSearchesRes = await fetchAPI('/saved-searches', { headers: authHeaders });
  test('List saved searches', savedSearchesRes.ok && Array.isArray(savedSearchesRes.data), savedSearchesRes.data.error);

  // Create saved search
  const createSearchRes = await fetchAPI('/saved-searches', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Test Feature Search',
      criteria: { minPrice: 400000, maxPrice: 700000, bedrooms: 3 }
    })
  });
  test('Create saved search', createSearchRes.ok && createSearchRes.data.id, createSearchRes.data.error);

  // ==================== FAVORITES ====================
  console.log('\n--- FAVORITES ---');

  const favoritesRes = await fetchAPI('/favorites', { headers: authHeaders });
  test('List favorites', favoritesRes.ok && Array.isArray(favoritesRes.data), favoritesRes.data.error);

  // Add to favorites
  if (testPropertyId) {
    const addFavRes = await fetchAPI('/favorites', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ propertyId: testPropertyId })
    });
    test('Add property to favorites', addFavRes.ok || addFavRes.status === 400, addFavRes.data.error);
  }

  // ==================== NOTIFICATIONS ====================
  console.log('\n--- NOTIFICATIONS ---');

  const notificationsRes = await fetchAPI('/notifications', { headers: authHeaders });
  test('List notifications', notificationsRes.ok && notificationsRes.data.notifications, notificationsRes.data.error);

  // ==================== MARKET REPORTS ====================
  console.log('\n--- MARKET REPORTS ---');

  const marketReportsRes = await fetchAPI('/market-reports', { headers: authHeaders });
  test('List market reports', marketReportsRes.ok && marketReportsRes.data.reports, marketReportsRes.data.error);

  // ==================== INTEGRATIONS ====================
  console.log('\n--- INTEGRATIONS ---');

  const integrationsRes = await fetchAPI('/integrations', { headers: authHeaders });
  test('List integrations', integrationsRes.ok && integrationsRes.data.integrations, integrationsRes.data.error);

  // ==================== SOCIAL POSTS ====================
  console.log('\n--- SOCIAL POSTS ---');

  const socialPostsRes = await fetchAPI('/social-posts', { headers: authHeaders });
  test('List social posts', socialPostsRes.ok && socialPostsRes.data.posts, socialPostsRes.data.error);

  // ==================== FLYERS ====================
  console.log('\n--- FLYERS ---');

  const flyersRes = await fetchAPI('/flyers', { headers: authHeaders });
  test('List flyers', flyersRes.ok && flyersRes.data.flyers, flyersRes.data.error);

  // ==================== MESSAGES ====================
  console.log('\n--- MESSAGES ---');

  const messagesRes = await fetchAPI('/messages', { headers: authHeaders });
  test('List messages', messagesRes.ok, messagesRes.data.error);

  // ==================== USERS (Admin only) ====================
  console.log('\n--- USERS (Admin) ---');

  const usersRes = await fetchAPI('/users', { headers: authHeaders });
  test('List all users', usersRes.ok && usersRes.data.users, usersRes.data.error);

  // ==================== CLEANUP ====================
  console.log('\n--- CLEANUP ---');

  // Delete test transaction first (due to foreign keys)
  if (testTransactionId) {
    const delTransRes = await fetchAPI(`/transactions/${testTransactionId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    test('Delete test transaction', delTransRes.ok, delTransRes.data.error);
  }

  // Delete test property
  if (testPropertyId) {
    const delPropRes = await fetchAPI(`/properties/${testPropertyId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    test('Delete test property', delPropRes.ok, delPropRes.data.error);
  }

  // Delete test lead
  if (testLeadId) {
    const delLeadRes = await fetchAPI(`/leads/${testLeadId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    test('Delete test lead', delLeadRes.ok, delLeadRes.data.error);
  }

  // ==================== RESULTS ====================
  console.log('\n========================================');
  console.log('  TEST RESULTS');
  console.log('========================================');
  console.log(`Total:  ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log('========================================\n');

  if (results.failed > 0) {
    console.log('Failed tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}: ${t.details}`);
    });
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
