const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Global setup
beforeAll(async () => {
  // Connect to database
  await prisma.$connect();
});

// Global teardown
afterAll(async () => {
  await prisma.$disconnect();
});

// Export prisma for use in tests
global.prisma = prisma;
