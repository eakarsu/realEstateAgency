#!/usr/bin/env node
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function main() {
  if (process.env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') {
    throw new Error('Set BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin for this one-time operation');
  }
  const email = String(process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '');
  const names = String(process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator').trim().split(/\s+/);
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('A valid administrator email is required');
  if (password.length < 12 || Buffer.byteLength(password) > 72) throw new Error('Administrator password must be 12 to 72 bytes');

  const prisma = new PrismaClient();
  try {
    if (await prisma.user.findUnique({ where: { email } })) throw new Error('Administrator already exists; refusing to overwrite it');
    const user = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 12),
        firstName: names[0] || 'Runtime',
        lastName: names.slice(1).join(' ') || 'Administrator',
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`Provisioned administrator ${user.id}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message || 'Administrator provisioning failed');
  process.exitCode = 1;
});
