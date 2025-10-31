import request from 'supertest';
import { createApp } from '../../src/app';
import { PrismaClient, KycStatus } from '@prisma/client';

const app = createApp();
const prisma = new PrismaClient();

async function setupAccount(currency = 'USD') {
  const email = `txn_${Date.now()}@ex.com`;
  const password = 'Passw0rd!';
  const su = await request(app).post('/api/v1/auth/signup').send({ email, password });
  const token = su.body.tokens.accessToken;
  const userId = su.body.user.id as string;
  await prisma.user.update({ where: { id: userId }, data: { kycStatus: KycStatus.VERIFIED } });
  const acc = await request(app).post('/api/v1/accounts').set('Authorization', `Bearer ${token}`).send({ currency });
  return { token, accountId: acc.body.account.id };
}

describe('Transactions integration', () => {
  it('deposit then withdraw (happy)', async () => {
    const { token, accountId } = await setupAccount();
    await request(app)
      .post(`/api/v1/accounts/${accountId}/deposits`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `${Date.now()}-d`)
      .send({ amount_minor: '5000' })
      .expect(201);
    const w = await request(app)
      .post(`/api/v1/accounts/${accountId}/withdrawals`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `${Date.now()}-w`)
      .send({ amount_minor: '3000' })
      .expect(201);
    expect(w.body.balanceMinor).toBeDefined();
  });

  it('withdraw fails with insufficient funds (worst case)', async () => {
    const { token, accountId } = await setupAccount();
    const res = await request(app)
      .post(`/api/v1/accounts/${accountId}/withdrawals`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `${Date.now()}-w2`)
      .send({ amount_minor: '1' })
      .expect(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
  });

  it('does not double-charge on duplicate Idempotency-Key (happy idempotency)', async () => {
    const { token, accountId } = await setupAccount();
    const key = `dup-${Date.now()}`;
    const first = await request(app)
      .post(`/api/v1/accounts/${accountId}/deposits`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ amount_minor: '1234' })
      .expect(201);
    const second = await request(app)
      .post(`/api/v1/accounts/${accountId}/deposits`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ amount_minor: '1234' })
      .expect(201);
    expect(second.body.transaction.id).toBe(first.body.transaction.id);
    // Balance should match the first response
    expect(second.body.balanceMinor).toBe(first.body.balanceMinor);
  });

  it('rejects Idempotency-Key reuse with different request (worst idempotency)', async () => {
    const { token, accountId } = await setupAccount();
    const key = `mismatch-${Date.now()}`;
    await request(app)
      .post(`/api/v1/accounts/${accountId}/deposits`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ amount_minor: '500' })
      .expect(201);
    const res = await request(app)
      .post(`/api/v1/accounts/${accountId}/deposits`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ amount_minor: '600' })
      .expect(409);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REPLAY');
  });
});


