const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with comprehensive data...');

  // Create 15+ Lead Sources
  const leadSourcesData = [
    { name: 'Website', type: 'website', description: 'Leads from main website' },
    { name: 'Referral', type: 'referral', description: 'Referral from existing clients' },
    { name: 'Zillow', type: 'portal', description: 'Leads from Zillow' },
    { name: 'Realtor.com', type: 'portal', description: 'Leads from Realtor.com' },
    { name: 'Facebook Ads', type: 'social', description: 'Leads from Facebook advertising' },
    { name: 'Google Ads', type: 'advertising', description: 'Leads from Google advertising' },
    { name: 'Open House', type: 'event', description: 'Leads from open house events' },
    { name: 'Direct Call', type: 'direct', description: 'Direct phone inquiries' },
    { name: 'Instagram', type: 'social', description: 'Leads from Instagram' },
    { name: 'LinkedIn', type: 'social', description: 'Leads from LinkedIn' },
    { name: 'Trulia', type: 'portal', description: 'Leads from Trulia' },
    { name: 'Redfin', type: 'portal', description: 'Leads from Redfin' },
    { name: 'Walk-in', type: 'direct', description: 'Walk-in office visitors' },
    { name: 'Email Campaign', type: 'marketing', description: 'From email marketing' },
    { name: 'Past Client', type: 'referral', description: 'Repeat business from past clients' },
    { name: 'Yard Sign', type: 'advertising', description: 'From property yard signs' },
    { name: 'Print Ad', type: 'advertising', description: 'From newspaper/magazine ads' },
    { name: 'YouTube', type: 'social', description: 'From YouTube channel' }
  ];

  const leadSources = [];
  for (const source of leadSourcesData) {
    const created = await prisma.leadSource.upsert({
      where: { name: source.name },
      update: {},
      create: source
    });
    leadSources.push(created);
  }
  console.log(`Created ${leadSources.length} lead sources`);

  // Create 15+ Tags
  const tagsData = [
    { name: 'Hot Lead', color: '#EF4444' },
    { name: 'First Time Buyer', color: '#10B981' },
    { name: 'Investor', color: '#8B5CF6' },
    { name: 'Luxury', color: '#F59E0B' },
    { name: 'Relocating', color: '#3B82F6' },
    { name: 'Pre-Approved', color: '#22C55E' },
    { name: 'Downsizing', color: '#6366F1' },
    { name: 'Cash Buyer', color: '#14B8A6' },
    { name: 'Vacation Home', color: '#EC4899' },
    { name: 'Rental Property', color: '#F97316' },
    { name: 'Fixer Upper', color: '#84CC16' },
    { name: 'New Construction', color: '#06B6D4' },
    { name: 'Waterfront', color: '#0EA5E9' },
    { name: 'Golf Course', color: '#65A30D' },
    { name: 'Senior Living', color: '#A855F7' },
    { name: 'Military/VA', color: '#1D4ED8' },
    { name: 'Commercial Interest', color: '#DC2626' },
    { name: 'Land Only', color: '#78716C' }
  ];

  const tags = [];
  for (const tag of tagsData) {
    const created = await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag
    });
    tags.push(created);
  }
  console.log(`Created ${tags.length} tags`);

  // Create Admin User
  const password = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@realestate.com' },
    update: {},
    create: {
      email: 'admin@realestate.com',
      password,
      firstName: 'Admin',
      lastName: 'User',
      phone: '555-0100',
      role: 'ADMIN'
    }
  });
  console.log('Created admin user');

  // Create Manager User with Agent Profile
  const manager = await prisma.user.upsert({
    where: { email: 'manager@realestate.com' },
    update: {},
    create: {
      email: 'manager@realestate.com',
      password,
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '555-0101',
      role: 'MANAGER'
    }
  });

  const managerAgent = await prisma.agent.upsert({
    where: { userId: manager.id },
    update: {},
    create: {
      userId: manager.id,
      licenseNumber: 'RE-001234',
      bio: 'Experienced real estate manager with 15 years in the industry. Specializing in luxury properties and team leadership.',
      specializations: ['Residential', 'Commercial', 'Luxury'],
      yearsExperience: 15,
      commissionRate: 0.03
    }
  });
  console.log('Created manager');

  // Create 15+ Agent Users
  const agentData = [
    { firstName: 'John', lastName: 'Smith', email: 'john@realestate.com', specializations: ['Residential', 'First Time Buyers'], years: 8 },
    { firstName: 'Emily', lastName: 'Davis', email: 'emily@realestate.com', specializations: ['Luxury', 'Waterfront'], years: 12 },
    { firstName: 'Michael', lastName: 'Brown', email: 'michael@realestate.com', specializations: ['Commercial', 'Investment'], years: 10 },
    { firstName: 'Jessica', lastName: 'Wilson', email: 'jessica@realestate.com', specializations: ['Condos', 'Townhouses'], years: 5 },
    { firstName: 'David', lastName: 'Martinez', email: 'david@realestate.com', specializations: ['New Construction', 'Land'], years: 7 },
    { firstName: 'Amanda', lastName: 'Taylor', email: 'amanda@realestate.com', specializations: ['Relocation', 'Military'], years: 6 },
    { firstName: 'Chris', lastName: 'Anderson', email: 'chris@realestate.com', specializations: ['Senior Living', 'Downsizing'], years: 9 },
    { firstName: 'Jennifer', lastName: 'Thomas', email: 'jennifer@realestate.com', specializations: ['Investment', 'Multi-Family'], years: 11 },
    { firstName: 'Robert', lastName: 'Jackson', email: 'robert@realestate.com', specializations: ['Luxury', 'Golf Course'], years: 14 },
    { firstName: 'Lisa', lastName: 'White', email: 'lisa@realestate.com', specializations: ['Residential', 'Schools'], years: 4 },
    { firstName: 'Daniel', lastName: 'Harris', email: 'daniel@realestate.com', specializations: ['Commercial', 'Retail'], years: 8 },
    { firstName: 'Michelle', lastName: 'Clark', email: 'michelle@realestate.com', specializations: ['Vacation Homes', 'Beach'], years: 7 },
    { firstName: 'Kevin', lastName: 'Lewis', email: 'kevin@realestate.com', specializations: ['Fixer Upper', 'Foreclosures'], years: 6 },
    { firstName: 'Rachel', lastName: 'Robinson', email: 'rachel@realestate.com', specializations: ['New Buyers', 'FHA'], years: 3 },
    { firstName: 'Steven', lastName: 'Walker', email: 'steven@realestate.com', specializations: ['Luxury', 'Estate'], years: 15 }
  ];

  const agents = [];
  for (const data of agentData) {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: `555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        role: 'AGENT'
      }
    });

    const agent = await prisma.agent.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        licenseNumber: `RE-${String(Math.floor(Math.random() * 90000) + 10000)}`,
        bio: `Dedicated real estate professional specializing in ${data.specializations.join(' and ')}. ${data.years} years of experience helping clients achieve their real estate goals.`,
        specializations: data.specializations,
        yearsExperience: data.years,
        commissionRate: 0.025
      }
    });
    agents.push({ user, agent });
  }
  console.log(`Created ${agents.length} agents`);

  // Create 3 Teams
  const teamsData = [
    { name: 'Downtown Team', description: 'Specializing in downtown properties and urban living', leadIndex: 0 },
    { name: 'Luxury Division', description: 'High-end properties and luxury estates', leadIndex: 1 },
    { name: 'Commercial Group', description: 'Commercial and investment properties', leadIndex: 2 }
  ];

  const teams = [];
  for (let i = 0; i < teamsData.length; i++) {
    const teamData = teamsData[i];
    const team = await prisma.team.upsert({
      where: { id: `team-${i + 1}` },
      update: {},
      create: {
        id: `team-${i + 1}`,
        name: teamData.name,
        description: teamData.description,
        leadAgentId: agents[teamData.leadIndex].agent.id
      }
    });
    teams.push(team);

    // Assign agents to team
    const teamAgents = agents.slice(i * 5, (i + 1) * 5);
    for (let j = 0; j < teamAgents.length; j++) {
      await prisma.agent.update({
        where: { id: teamAgents[j].agent.id },
        data: { teamId: team.id, isLeadAgent: j === 0 }
      });
    }
  }
  console.log(`Created ${teams.length} teams`);

  // Create 20+ Properties
  const propertyData = [
    { type: 'SINGLE_FAMILY', title: 'Beautiful Family Home', address: '123 Oak Street', city: 'Austin', state: 'TX', zipCode: '78701', price: 450000, bedrooms: 4, bathrooms: 2.5, sqft: 2400, year: 2015, features: ['Hardwood Floors', 'Granite Counters', 'Large Backyard'], status: 'ACTIVE' },
    { type: 'CONDO', title: 'Modern Downtown Condo', address: '456 Main Street #1201', city: 'Austin', state: 'TX', zipCode: '78702', price: 375000, bedrooms: 2, bathrooms: 2, sqft: 1200, year: 2020, features: ['City Views', 'Concierge', 'Rooftop Pool'], status: 'ACTIVE' },
    { type: 'TOWNHOUSE', title: 'Spacious Townhouse', address: '789 Tech Way', city: 'Austin', state: 'TX', zipCode: '78703', price: 525000, bedrooms: 3, bathrooms: 2.5, sqft: 1800, year: 2018, features: ['Smart Home', 'Private Garage', 'Energy Efficient'], status: 'ACTIVE' },
    { type: 'SINGLE_FAMILY', title: 'Luxury Estate with Pool', address: '1000 Lakeside Drive', city: 'Austin', state: 'TX', zipCode: '78704', price: 1250000, bedrooms: 5, bathrooms: 4, sqft: 4500, year: 2019, features: ['Pool', 'Home Theater', 'Wine Cellar'], status: 'ACTIVE' },
    { type: 'SINGLE_FAMILY', title: 'Charming Starter Home', address: '555 Maple Avenue', city: 'Austin', state: 'TX', zipCode: '78705', price: 295000, bedrooms: 3, bathrooms: 2, sqft: 1500, year: 2005, features: ['Updated Kitchen', 'Fenced Yard', 'New Roof'], status: 'ACTIVE' },
    { type: 'CONDO', title: 'Sleek Urban Loft', address: '100 Congress Ave #500', city: 'Austin', state: 'TX', zipCode: '78701', price: 425000, bedrooms: 1, bathrooms: 1, sqft: 900, year: 2021, features: ['Exposed Brick', 'High Ceilings', 'City Views'], status: 'ACTIVE' },
    { type: 'SINGLE_FAMILY', title: 'Ranch Style Home', address: '2500 Hill Country Blvd', city: 'Austin', state: 'TX', zipCode: '78735', price: 675000, bedrooms: 4, bathrooms: 3, sqft: 2800, year: 2010, features: ['Single Story', 'Large Lot', 'Custom Built'], status: 'ACTIVE' },
    { type: 'MULTI_FAMILY', title: 'Investment Duplex', address: '800 East Side Dr', city: 'Austin', state: 'TX', zipCode: '78702', price: 550000, bedrooms: 4, bathrooms: 4, sqft: 2200, year: 2000, features: ['Two Units', 'Separate Entrances', 'Rental Income'], status: 'ACTIVE' },
    { type: 'LAND', title: 'Prime Development Land', address: '0 FM 2222', city: 'Austin', state: 'TX', zipCode: '78730', price: 850000, bedrooms: 0, bathrooms: 0, sqft: 0, year: 2024, features: ['5 Acres', 'Road Frontage', 'Utilities Available'], status: 'ACTIVE' },
    { type: 'COMMERCIAL', title: 'Retail Strip Center', address: '3000 Lamar Blvd', city: 'Austin', state: 'TX', zipCode: '78705', price: 2500000, bedrooms: 0, bathrooms: 4, sqft: 8000, year: 1995, features: ['NNN Leases', 'Fully Occupied', 'Prime Location'], status: 'ACTIVE' },
    { type: 'SINGLE_FAMILY', title: 'Waterfront Paradise', address: '150 Lake Austin Blvd', city: 'Austin', state: 'TX', zipCode: '78703', price: 1850000, bedrooms: 5, bathrooms: 4.5, sqft: 5200, year: 2017, features: ['Lake Views', 'Private Dock', 'Infinity Pool'], status: 'ACTIVE' },
    { type: 'TOWNHOUSE', title: 'New Construction Modern', address: '222 East Ave #A', city: 'Austin', state: 'TX', zipCode: '78701', price: 650000, bedrooms: 3, bathrooms: 3.5, sqft: 2100, year: 2024, features: ['Never Lived In', 'Rooftop Deck', 'EV Charger'], status: 'ACTIVE' },
    { type: 'CONDO', title: 'High Rise Living', address: '200 Congress Ave #3001', city: 'Austin', state: 'TX', zipCode: '78701', price: 950000, bedrooms: 3, bathrooms: 2, sqft: 1800, year: 2018, features: ['30th Floor', 'Panoramic Views', 'Valet Parking'], status: 'ACTIVE' },
    { type: 'SINGLE_FAMILY', title: 'Historic Craftsman', address: '1800 Hyde Park Blvd', city: 'Austin', state: 'TX', zipCode: '78751', price: 725000, bedrooms: 3, bathrooms: 2, sqft: 1900, year: 1925, features: ['Original Hardwoods', 'Front Porch', 'Updated Systems'], status: 'ACTIVE' },
    { type: 'SINGLE_FAMILY', title: 'Golf Course Living', address: '500 Fairway Dr', city: 'Austin', state: 'TX', zipCode: '78738', price: 895000, bedrooms: 4, bathrooms: 3.5, sqft: 3200, year: 2012, features: ['Golf Views', 'Gourmet Kitchen', 'Home Office'], status: 'ACTIVE' },
    { type: 'SINGLE_FAMILY', title: 'Recently Sold Home', address: '333 Sold Street', city: 'Austin', state: 'TX', zipCode: '78704', price: 485000, bedrooms: 3, bathrooms: 2, sqft: 1800, year: 2010, features: ['Updated', 'Great Schools', 'Quiet Street'], status: 'SOLD' },
    { type: 'CONDO', title: 'Pending Sale Condo', address: '444 Under Contract Way', city: 'Austin', state: 'TX', zipCode: '78702', price: 320000, bedrooms: 2, bathrooms: 2, sqft: 1100, year: 2019, features: ['Modern', 'Balcony', 'Parking'], status: 'PENDING' },
    { type: 'SINGLE_FAMILY', title: 'Suburban Dream', address: '600 Cedar Park Dr', city: 'Cedar Park', state: 'TX', zipCode: '78613', price: 425000, bedrooms: 4, bathrooms: 2.5, sqft: 2600, year: 2016, features: ['Community Pool', 'Great Schools', 'Large Yard'], status: 'ACTIVE' },
    { type: 'SINGLE_FAMILY', title: 'Round Rock Family Home', address: '700 Round Rock Ave', city: 'Round Rock', state: 'TX', zipCode: '78664', price: 385000, bedrooms: 4, bathrooms: 2, sqft: 2200, year: 2008, features: ['Cul-de-sac', 'Updated Kitchen', 'Pool'], status: 'ACTIVE' },
    { type: 'TOWNHOUSE', title: 'Domain Area Townhome', address: '11000 Domain Dr #301', city: 'Austin', state: 'TX', zipCode: '78758', price: 475000, bedrooms: 2, bathrooms: 2.5, sqft: 1600, year: 2020, features: ['Walk to Shops', 'Modern Design', 'Garage'], status: 'ACTIVE' }
  ];

  const properties = [];
  for (let i = 0; i < propertyData.length; i++) {
    const data = propertyData[i];
    const property = await prisma.property.create({
      data: {
        type: data.type,
        title: data.title,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        price: data.price,
        originalPrice: data.price,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFeet: data.sqft,
        yearBuilt: data.year,
        features: data.features,
        status: data.status,
        agentId: agents[i % agents.length].agent.id,
        pricePerSqft: data.sqft > 0 ? Math.round(data.price / data.sqft) : 0,
        garage: Math.floor(Math.random() * 3) + 1,
        lotSize: 0.15 + Math.random() * 0.5,
        description: `This beautiful ${data.type.toLowerCase().replace('_', ' ')} offers exceptional living in ${data.city}. ${data.features.join(', ')} are just some highlights.`,
        listedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        soldAt: data.status === 'SOLD' ? new Date() : null
      }
    });
    properties.push(property);

    // Add photo - using picsum.photos for reliable placeholder images
    await prisma.propertyPhoto.create({
      data: {
        propertyId: property.id,
        url: `https://picsum.photos/seed/property${i}/800/600`,
        caption: 'Front View',
        isPrimary: true,
        order: 0
      }
    });
  }
  console.log(`Created ${properties.length} properties`);

  // Create 20+ Leads
  const leadData = [
    { firstName: 'Robert', lastName: 'Garcia', email: 'robert.g@email.com', status: 'QUALIFIED', budget: 500000, timeline: '1 month', type: 'SINGLE_FAMILY' },
    { firstName: 'Lisa', lastName: 'Martinez', email: 'lisa.m@email.com', status: 'NEW', budget: 350000, timeline: '3 months', type: 'CONDO' },
    { firstName: 'David', lastName: 'Thompson', email: 'david.t@email.com', status: 'SHOWING', budget: 600000, timeline: '1 month', type: 'SINGLE_FAMILY' },
    { firstName: 'Jennifer', lastName: 'White', email: 'jennifer.w@email.com', status: 'NURTURING', budget: 400000, timeline: '6 months', type: 'TOWNHOUSE' },
    { firstName: 'James', lastName: 'Anderson', email: 'james.a@email.com', status: 'NEGOTIATING', budget: 750000, timeline: 'immediate', type: 'SINGLE_FAMILY' },
    { firstName: 'Amanda', lastName: 'Taylor', email: 'amanda.t@email.com', status: 'NEW', budget: 300000, timeline: '3 months', type: 'CONDO' },
    { firstName: 'Christopher', lastName: 'Lee', email: 'chris.l@email.com', status: 'CONTACTED', budget: 450000, timeline: '1 month', type: 'TOWNHOUSE' },
    { firstName: 'Michelle', lastName: 'Harris', email: 'michelle.h@email.com', status: 'QUALIFIED', budget: 550000, timeline: '1 month', type: 'SINGLE_FAMILY' },
    { firstName: 'William', lastName: 'Clark', email: 'william.c@email.com', status: 'NEW', budget: 280000, timeline: '6 months', type: 'CONDO' },
    { firstName: 'Sarah', lastName: 'Lewis', email: 'sarah.l@email.com', status: 'SHOWING', budget: 900000, timeline: '1 month', type: 'SINGLE_FAMILY' },
    { firstName: 'Daniel', lastName: 'Robinson', email: 'daniel.r@email.com', status: 'QUALIFIED', budget: 1200000, timeline: 'immediate', type: 'SINGLE_FAMILY' },
    { firstName: 'Emily', lastName: 'Walker', email: 'emily.w@email.com', status: 'NURTURING', budget: 375000, timeline: '1 year', type: 'TOWNHOUSE' },
    { firstName: 'Matthew', lastName: 'Hall', email: 'matthew.h@email.com', status: 'CONTACTED', budget: 425000, timeline: '3 months', type: 'SINGLE_FAMILY' },
    { firstName: 'Ashley', lastName: 'Allen', email: 'ashley.a@email.com', status: 'NEW', budget: 320000, timeline: '6 months', type: 'CONDO' },
    { firstName: 'Andrew', lastName: 'Young', email: 'andrew.y@email.com', status: 'QUALIFIED', budget: 650000, timeline: '1 month', type: 'SINGLE_FAMILY' },
    { firstName: 'Nicole', lastName: 'King', email: 'nicole.k@email.com', status: 'SHOWING', budget: 475000, timeline: '1 month', type: 'TOWNHOUSE' },
    { firstName: 'Joshua', lastName: 'Wright', email: 'joshua.w@email.com', status: 'NEGOTIATING', budget: 580000, timeline: 'immediate', type: 'SINGLE_FAMILY' },
    { firstName: 'Stephanie', lastName: 'Scott', email: 'stephanie.s@email.com', status: 'NEW', budget: 290000, timeline: '3 months', type: 'CONDO' },
    { firstName: 'Ryan', lastName: 'Green', email: 'ryan.g@email.com', status: 'CONTACTED', budget: 725000, timeline: '1 month', type: 'SINGLE_FAMILY' },
    { firstName: 'Lauren', lastName: 'Baker', email: 'lauren.b@email.com', status: 'CLOSED_WON', budget: 410000, timeline: 'immediate', type: 'TOWNHOUSE' }
  ];

  const leads = [];
  for (let i = 0; i < leadData.length; i++) {
    const data = leadData[i];
    const lead = await prisma.lead.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: `555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        status: data.status,
        budget: data.budget,
        timeline: data.timeline,
        propertyType: data.type,
        preferredAreas: ['Austin', 'Cedar Park', 'Round Rock'].slice(0, Math.floor(Math.random() * 3) + 1),
        score: Math.floor(Math.random() * 50) + 30,
        sourceId: leadSources[i % leadSources.length].id,
        agentId: agents[i % agents.length].agent.id
      }
    });
    leads.push(lead);

    // Add activity for each lead
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: 'NOTE',
        subject: `Initial contact with ${data.firstName}`,
        description: `Interested in ${data.type.toLowerCase().replace('_', ' ')} properties.`,
        userId: agents[i % agents.length].user.id
      }
    });
  }
  console.log(`Created ${leads.length} leads`);

  // Create 15+ Showings
  const showingsData = [];
  for (let i = 0; i < 18; i++) {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + Math.floor(Math.random() * 14) - 7);
    scheduledAt.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

    showingsData.push({
      propertyId: properties[i % properties.length].id,
      leadId: leads[i % leads.length].id,
      agentId: agents[i % agents.length].agent.id,
      scheduledAt,
      status: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'][Math.floor(Math.random() * 4)],
      notes: `Showing for ${leads[i % leads.length].firstName}`
    });
  }

  for (const showing of showingsData) {
    await prisma.showing.create({ data: showing });
  }
  console.log(`Created ${showingsData.length} showings`);

  // Create 15+ Tasks
  const taskTypes = ['Follow Up', 'Send Documents', 'Schedule Showing', 'Market Analysis', 'Contract Review', 'Client Call', 'Property Research', 'Update Listing'];
  for (let i = 0; i < 18; i++) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14));

    await prisma.task.create({
      data: {
        title: `${taskTypes[i % taskTypes.length]} - ${leads[i % leads.length].firstName} ${leads[i % leads.length].lastName}`,
        description: `Task related to lead ${leads[i % leads.length].email}`,
        dueDate,
        priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][Math.floor(Math.random() * 4)],
        status: ['PENDING', 'IN_PROGRESS', 'COMPLETED'][Math.floor(Math.random() * 3)],
        agentId: agents[i % agents.length].agent.id
      }
    });
  }
  console.log('Created 18 tasks');

  // Create 15+ Transactions
  const transactionStatuses = ['INITIATED', 'UNDER_CONTRACT', 'PENDING', 'CLOSED', 'CANCELLED'];
  const transactionTypes = ['LISTING', 'BUYER', 'DUAL', 'REFERRAL'];
  const transactions = [];
  for (let i = 0; i < 16; i++) {
    const status = transactionStatuses[i % transactionStatuses.length];
    const listPrice = properties[i % properties.length].price;
    const transaction = await prisma.transaction.create({
      data: {
        propertyId: properties[i % properties.length].id,
        leadId: leads[i % leads.length].id,
        agentId: agents[i % agents.length].agent.id,
        type: transactionTypes[i % transactionTypes.length],
        status,
        listPrice: listPrice,
        salePrice: listPrice * (0.95 + Math.random() * 0.1),
        contractDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        actualClosingDate: status === 'CLOSED' ? new Date() : null
      }
    });
    transactions.push(transaction);

    // Add milestones
    const milestones = ['Contract Signed', 'Inspection Complete', 'Appraisal Done', 'Loan Approved', 'Final Walkthrough', 'Closing'];
    for (let j = 0; j < milestones.length; j++) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + j * 7);
      await prisma.milestone.create({
        data: {
          transactionId: transaction.id,
          name: milestones[j],
          dueDate,
          order: j,
          completedAt: (status === 'CLOSED' || j < 2) ? new Date() : null
        }
      });
    }
  }
  console.log('Created 16 transactions with milestones');

  // Create 15+ Campaigns
  const campaignTypes = ['EMAIL', 'SOCIAL', 'SMS', 'PRINT'];
  const campaignNames = [
    'New Listing Announcement', 'Market Update Newsletter', 'Just Sold Campaign', 'Open House Invitation',
    'Holiday Greetings', 'First Time Buyer Guide', 'Investment Property Alert', 'Price Reduction Notice',
    'Neighborhood Spotlight', 'Home Selling Tips', 'Spring Market Preview', 'Summer Sales Event',
    'Fall Newsletter', 'Year-End Review', 'New Year Promotion', 'Referral Program'
  ];

  for (let i = 0; i < campaignNames.length; i++) {
    await prisma.campaign.create({
      data: {
        name: campaignNames[i],
        type: campaignTypes[i % campaignTypes.length],
        status: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED'][Math.floor(Math.random() * 4)],
        subject: `${campaignNames[i]} - Your Real Estate Update`,
        content: `This is the content for ${campaignNames[i]}. Engaging real estate content here.`,
        targetAudience: { status: ['QUALIFIED', 'NURTURING'], areas: ['Austin'] },
        stats: {
          sentCount: Math.floor(Math.random() * 500),
          openCount: Math.floor(Math.random() * 200),
          clickCount: Math.floor(Math.random() * 50)
        }
      }
    });
  }
  console.log('Created 16 campaigns');

  // Create 15+ Open Houses
  for (let i = 0; i < 16; i++) {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 14));
    const startHour = 10 + Math.floor(Math.random() * 4);
    const endHour = startHour + 2;

    await prisma.openHouse.create({
      data: {
        propertyId: properties[i % properties.length].id,
        agentId: agents[i % agents.length].agent.id,
        date: eventDate,
        startTime: `${startHour}:00`,
        endTime: `${endHour}:00`,
        status: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'][Math.floor(Math.random() * 4)],
        attendees: { visitors: [], count: Math.floor(Math.random() * 30) },
        notes: `Open house for ${properties[i % properties.length].address}`
      }
    });
  }
  console.log('Created 16 open houses');

  // Create 15+ Social Posts
  const platforms = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER'];
  for (let i = 0; i < 18; i++) {
    const isPublished = Math.random() > 0.5;
    await prisma.socialPost.create({
      data: {
        platform: platforms[i % platforms.length],
        content: `Check out this amazing property at ${properties[i % properties.length].address}! #realestate #${properties[i % properties.length].city.toLowerCase()}`,
        mediaUrls: [`https://picsum.photos/seed/social${i}/800/600`],
        hashtags: ['realestate', properties[i % properties.length].city.toLowerCase(), 'home'],
        status: isPublished ? 'PUBLISHED' : ['DRAFT', 'SCHEDULED'][Math.floor(Math.random() * 2)],
        scheduledAt: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        publishedAt: isPublished ? new Date() : null,
        engagement: {
          likes: Math.floor(Math.random() * 100),
          comments: Math.floor(Math.random() * 20),
          shares: Math.floor(Math.random() * 10)
        }
      }
    });
  }
  console.log('Created 18 social posts');

  // Create 15+ Documents
  const docTypes = ['CONTRACT', 'DISCLOSURE', 'INSPECTION', 'APPRAISAL', 'TITLE', 'CLOSING', 'OTHER'];
  for (let i = 0; i < Math.min(18, transactions.length); i++) {
    await prisma.document.create({
      data: {
        name: `${docTypes[i % docTypes.length]}_${i + 1}.pdf`,
        type: docTypes[i % docTypes.length],
        url: `/documents/${docTypes[i % docTypes.length].toLowerCase()}_${i + 1}.pdf`,
        transactionId: transactions[i % transactions.length].id
      }
    });
  }
  console.log('Created 18 documents');

  // Create 15+ Commissions
  for (let i = 0; i < Math.min(16, transactions.length); i++) {
    const rate = 0.03;
    const amount = properties[i % properties.length].price * rate;
    const splitPercentage = 70 + Math.floor(Math.random() * 20);
    await prisma.commission.create({
      data: {
        transactionId: transactions[i % transactions.length].id,
        agentId: agents[i % agents.length].agent.id,
        type: ['LISTING', 'BUYER'][Math.floor(Math.random() * 2)],
        rate: rate,
        amount: amount,
        splitPercentage: splitPercentage,
        splitAmount: amount * (splitPercentage / 100),
        status: ['PENDING', 'APPROVED', 'PAID'][Math.floor(Math.random() * 3)]
      }
    });
  }
  console.log('Created 16 commissions');

  // Create 15+ Market Reports
  const areas = ['Austin', 'Cedar Park', 'Round Rock', 'Pflugerville', 'Georgetown', 'Leander'];
  for (let i = 0; i < 16; i++) {
    await prisma.marketReport.create({
      data: {
        area: areas[i % areas.length],
        title: `${areas[i % areas.length]} Market Report - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        reportDate: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
        data: {
          activeListings: 50 + Math.floor(Math.random() * 100),
          recentSales: 20 + Math.floor(Math.random() * 40),
          avgListPrice: 400000 + Math.floor(Math.random() * 200000),
          avgSoldPrice: 380000 + Math.floor(Math.random() * 190000),
          avgDaysOnMarket: 20 + Math.floor(Math.random() * 30),
          medianPrice: 375000 + Math.floor(Math.random() * 150000)
        },
        analysis: `The ${areas[i % areas.length]} real estate market continues to show strong activity. Prices have remained stable with moderate inventory levels.`
      }
    });
  }
  console.log('Created 16 market reports');

  // Create 15+ Notifications
  const notificationTypes = ['LEAD_ASSIGNED', 'SHOWING_SCHEDULED', 'TASK_DUE', 'OFFER_RECEIVED', 'CONTRACT_SIGNED', 'DOCUMENT_UPLOADED'];
  for (let i = 0; i < 18; i++) {
    await prisma.notification.create({
      data: {
        userId: agents[i % agents.length].user.id,
        type: notificationTypes[i % notificationTypes.length],
        title: `${notificationTypes[i % notificationTypes.length].replace('_', ' ')}`,
        message: `You have a new notification regarding ${leads[i % leads.length].firstName} ${leads[i % leads.length].lastName}`,
        isRead: Math.random() > 0.5
      }
    });
  }
  console.log('Created 18 notifications');

  // Create 15+ Integrations
  const integrations = [
    { name: 'Zillow', provider: 'zillow', type: 'MLS', isActive: true },
    { name: 'Realtor.com', provider: 'realtor', type: 'MLS', isActive: true },
    { name: 'DocuSign', provider: 'docusign', type: 'E_SIGNATURE', isActive: true },
    { name: 'Mailchimp', provider: 'mailchimp', type: 'EMAIL', isActive: false },
    { name: 'Google Calendar', provider: 'google', type: 'CALENDAR', isActive: true },
    { name: 'Stripe', provider: 'stripe', type: 'PAYMENT', isActive: true },
    { name: 'Twilio', provider: 'twilio', type: 'SMS', isActive: false },
    { name: 'Facebook', provider: 'facebook', type: 'SOCIAL', isActive: true },
    { name: 'Instagram', provider: 'instagram', type: 'SOCIAL', isActive: true },
    { name: 'LinkedIn', provider: 'linkedin', type: 'SOCIAL', isActive: false },
    { name: 'Zapier', provider: 'zapier', type: 'AUTOMATION', isActive: true },
    { name: 'Slack', provider: 'slack', type: 'COMMUNICATION', isActive: true },
    { name: 'QuickBooks', provider: 'quickbooks', type: 'ACCOUNTING', isActive: false },
    { name: 'Dotloop', provider: 'dotloop', type: 'TRANSACTION', isActive: true },
    { name: 'ShowingTime', provider: 'showingtime', type: 'SHOWING', isActive: true },
    { name: 'BombBomb', provider: 'bombbomb', type: 'VIDEO', isActive: false }
  ];

  for (const integration of integrations) {
    await prisma.integration.create({
      data: {
        name: integration.name,
        provider: integration.provider,
        type: integration.type,
        isActive: integration.isActive,
        config: {}
      }
    });
  }
  console.log(`Created ${integrations.length} integrations`);

  // Create Client Users
  const clientsData = [
    { firstName: 'Demo', lastName: 'Client', email: 'client@example.com' },
    { firstName: 'Test', lastName: 'Buyer', email: 'buyer@example.com' },
    { firstName: 'Sample', lastName: 'Seller', email: 'seller@example.com' }
  ];

  for (const client of clientsData) {
    await prisma.user.upsert({
      where: { email: client.email },
      update: {},
      create: {
        email: client.email,
        password,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: `555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        role: 'CLIENT'
      }
    });
  }
  console.log('Created client users');

  console.log('\n========================================');
  console.log('Seeding complete!');
  console.log('========================================');
  console.log('\nTest Accounts:');
  console.log('  Admin:   admin@realestate.com / password123');
  console.log('  Manager: manager@realestate.com / password123');
  console.log('  Agent:   john@realestate.com / password123');
  console.log('  Client:  client@example.com / password123');
  console.log('\nData Summary:');
  console.log(`  - ${leadSources.length} Lead Sources`);
  console.log(`  - ${tags.length} Tags`);
  console.log(`  - ${agents.length} Agents`);
  console.log(`  - ${teams.length} Teams`);
  console.log(`  - ${properties.length} Properties`);
  console.log(`  - ${leads.length} Leads`);
  console.log('  - 18 Showings');
  console.log('  - 18 Tasks');
  console.log('  - 16 Transactions');
  console.log('  - 16 Campaigns');
  console.log('  - 16 Open Houses');
  console.log('  - 18 Social Posts');
  console.log('  - 18 Documents');
  console.log('  - 16 Commissions');
  console.log('  - 16 Market Reports');
  console.log('  - 18 Notifications');
  console.log(`  - ${integrations.length} Integrations`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
