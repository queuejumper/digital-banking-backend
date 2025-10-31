import request from 'supertest';
import { createApp } from '../../src/app';
import { PrismaClient, Role, KycStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const app = createApp();
const prisma = new PrismaClient();

async function loginAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@test.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!';
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN, kycStatus: KycStatus.VERIFIED, passwordHash: hash, totpEnabled: false },
    create: { email, passwordHash: hash, role: Role.ADMIN, kycStatus: KycStatus.VERIFIED, totpEnabled: false },
  });
  const li = await request(app).post('/api/v1/auth/login').send({ email, password });
  return li.body.tokens.accessToken as string;
}

describe('Admin endpoints', () => {
  it('requires userId for accounts list when admin', async () => {
    const token = await loginAdmin();
    const res = await request(app).get('/api/v1/accounts').set('Authorization', `Bearer ${token}`).expect(400);
    expect(res.body.error.code).toBe('ADMIN_USERID_REQUIRED');
  });

  it('lists account holders', async () => {
    const token = await loginAdmin();
    const res = await request(app).get('/api/v1/admin/users?page=1&pageSize=5').set('Authorization', `Bearer ${token}`).expect(200);
    expect(Array.isArray(res.body.items)).toBeTruthy();
  });
});


