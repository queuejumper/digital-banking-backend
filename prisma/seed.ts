import { PrismaClient, KycStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@test.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!';


  const holderEmail = process.env.SEED_HOLDER_EMAIL || 'demo@test.com';
  const holderPassword = process.env.SEED_HOLDER_PASSWORD || 'DemoPass123!';

  const [adminHash, holderHash] = await Promise.all([
    bcrypt.hash(adminPassword, 10),
    bcrypt.hash(holderPassword, 10),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, kycStatus: KycStatus.VERIFIED, passwordHash: adminHash, totpEnabled: false },
    create: { email: adminEmail, passwordHash: adminHash, role: Role.ADMIN, kycStatus: KycStatus.VERIFIED, totpEnabled: false },
  });

  const holder = await prisma.user.upsert({
    where: { email: holderEmail },
    update: { role: Role.ACCOUNT_HOLDER, kycStatus: KycStatus.VERIFIED, passwordHash: holderHash, totpEnabled: false },
    create: { email: holderEmail, passwordHash: holderHash, role: Role.ACCOUNT_HOLDER, kycStatus: KycStatus.VERIFIED, totpEnabled: false },
  });

  // Ensure a default USD account for holder
  await prisma.account.upsert({
    where: { id: holder.id + '-usd-default' },
    update: {},
    create: { id: holder.id + '-usd-default', userId: holder.id, currency: 'USD' },
  });

  // Log to console for quick copy
  // eslint-disable-next-line no-console
  console.log('Seeded users:', {
    admin: { email: adminEmail, password: adminPassword, id: admin.id },
    holder: { email: holderEmail, password: holderPassword, id: holder.id },
  });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


