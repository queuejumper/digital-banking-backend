import { Request, Response } from 'express';
import { getPrisma } from '../libs/prisma';
import { toErrorResponse } from '../utils/errors';

export async function listAudit(req: Request, res: Response) {
  try {
    const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt((req.query.pageSize as string) || '20', 10), 1), 100);
    const actorId = (req.query.actorId as string) || undefined;
    const action = (req.query.action as string) || undefined;
    const from = (req.query.from as string) || undefined;
    const to = (req.query.to as string) || undefined;

    const prisma = getPrisma();
    const where: any = {};
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return res.status(200).json({ items, total, page, pageSize });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}


