import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type AuthUser = { userId: string; role: 'ACCOUNT_HOLDER' | 'STAFF' | 'ADMIN' };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Missing token' } });
  }
  const token = header.substring('Bearer '.length);
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret) as { sub: string; role: AuthUser['role'] };
    req.auth = { userId: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Invalid token' } });
  }
}

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not authenticated' } });
    if (!roles.includes(req.auth.role)) return res.status(403).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Insufficient role' } });
    return next();
  };
}


