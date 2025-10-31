import request from 'supertest';
import { createApp } from '../../src/app';
import { PrismaClient, KycStatus } from '@prisma/client';

const app = createApp();
const prisma = new PrismaClient();

async function signupAndLogin() {
  const email = `acct_${Date.now()}@ex.com`;
  const password = 'Passw0rd!';
  const su = await request(app).post('/api/v1/auth/signup').send({ email, password });
  const userId = su.body.user.id as string;
  // Verify KYC to allow account operations
  await prisma.user.update({ where: { id: userId }, data: { kycStatus: KycStatus.VERIFIED } });
  return { token: su.body.tokens.accessToken };
}

describe('Accounts integration', () => {
  it('create and list accounts (happy)', async () => {
    const { token } = await signupAndLogin();
    const created = await request(app)
      .post('/api/v1/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ currency: 'USD' })
      .expect(201);
    const id = created.body.account.id;
    const list = await request(app).get('/api/v1/accounts').set('Authorization', `Bearer ${token}`).expect(200);
    expect(list.body.accounts.find((a: any) => a.id === id)).toBeTruthy();
  });

  it('cannot close account with non-zero balance (edge)', async () => {
    const { token } = await signupAndLogin();
    const { body } = await request(app)
      .post('/api/v1/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ currency: 'USD' });
    const id = body.account.id;
    await request(app)
      .post(`/api/v1/accounts/${id}/deposits`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `${Date.now()}-d`)
      .send({ amount_minor: '1000' })
      .expect(201);
    const res = await request(app).delete(`/api/v1/accounts/${id}`).set('Authorization', `Bearer ${token}`).expect(400);
    expect(res.body.error.code).toBe('NON_ZERO_BALANCE');
  });
});


