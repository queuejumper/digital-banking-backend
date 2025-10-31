import { Request, Response } from 'express';
import { getPrisma } from '../libs/prisma';
import { toErrorResponse } from '../utils/errors';

export async function listAccountHolders(req: Request, res: Response) {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = Math.min(parseInt((req.query.pageSize as string) || '20', 10), 100);
    const search = ((req.query.search as string) || '').trim();
    const prisma = getPrisma();
    const where = {
      role: 'ACCOUNT_HOLDER' as const,
      ...(search ? { email: { contains: search, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, email: true, kycStatus: true, totpEnabled: true } }),
      prisma.user.count({ where }),
    ]);
    return res.status(200).json({ items, total, page, pageSize });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function getAccountHolder(req: Request, res: Response) {
  try {
    const { userId } = req.params as { userId: string };
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, kycStatus: true, role: true, totpEnabled: true, accounts: true } });
    if (!user || user.role !== 'ACCOUNT_HOLDER') return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    return res.status(200).json({ user });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function resetUserTotp(req: Request, res: Response) {
  try {
    const { userId } = req.params as { userId: string };
    const prisma = getPrisma();
    const user = await prisma.user.update({ where: { id: userId }, data: { totpEnabled: false, totpSecret: null }, select: { id: true, email: true, totpEnabled: true } });
    return res.status(200).json({ user, reset: true });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}


