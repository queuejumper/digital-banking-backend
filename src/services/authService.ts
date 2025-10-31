import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrisma } from '../libs/prisma';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

function signAccessToken(userId: string, role: string) {
  return jwt.sign({ sub: userId, role }, env.jwtAccessSecret, { expiresIn: env.jwtAccessTtl });
}

function signRefreshToken(userId: string) {
  return jwt.sign({ sub: userId }, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshTtl });
}

export const AuthService = {
  async signup(email: string, password: string) {
    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('EMAIL_IN_USE', 'Email already registered', 409);
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash } });
    const accessToken = signAccessToken(user.id, user.role);
    const refreshToken = signRefreshToken(user.id);
    await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 1000) } });
    return { user, tokens: { accessToken, refreshToken } };
  },

  async login(email: string, password: string) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', 401);
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AppError('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', 401);
    const accessToken = signAccessToken(user.id, user.role);
    const refreshToken = signRefreshToken(user.id);
    await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 1000) } });
    return { user, tokens: { accessToken, refreshToken } };
  },

  async refresh(refreshToken: string) {
    const prisma = getPrisma();
    let payload: { sub: string };
    try {
      payload = jwt.verify(refreshToken, env.jwtRefreshSecret) as { sub: string };
    } catch {
      throw new AppError('AUTH_FORBIDDEN', 'Invalid token', 401);
    }
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revokedAt) throw new AppError('AUTH_FORBIDDEN', 'Invalid refresh token', 401);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new AppError('AUTH_FORBIDDEN', 'Invalid user', 401);
    const accessToken = signAccessToken(user.id, user.role);
    return { accessToken };
  },

  async logout(refreshToken: string) {
    const prisma = getPrisma();
    await prisma.refreshToken.update({ where: { token: refreshToken }, data: { revokedAt: new Date() } }).catch(() => undefined);
    return { success: true };
  },
};


