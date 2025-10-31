import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Auth integration', () => {
  it('signup returns tokens (happy path)', async () => {
    const email = `test_${Date.now()}@ex.com`;
    const password = 'Passw0rd!';
    const su = await request(app).post('/api/v1/auth/signup').send({ email, password }).expect(201);
    expect(su.body.tokens.accessToken).toBeTruthy();
    expect(su.body.tokens.refreshToken).toBeTruthy();
  });

  it('login fails with wrong password (worst case)', async () => {
    const email = `test_${Date.now()}@ex.com`;
    await request(app).post('/api/v1/auth/signup').send({ email, password: 'Passw0rd!' }).expect(201);
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'WrongPass1!' }).expect(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });
});


