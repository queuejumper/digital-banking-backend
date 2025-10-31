import { Request, Response } from 'express';
import { AccountStatus } from '@prisma/client';
import { z } from 'zod';
import { AccountService } from '../services/accountService';
import { toErrorResponse } from '../utils/errors';
import { getPrisma } from '../libs/prisma';

const ISO_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];
const createSchema = z.object({ currency: z.enum(ISO_CURRENCIES as [string, ...string[]]) });
const adminUpdateSchema = z.object({ status: z.enum(['OPEN', 'CLOSED']).optional() });

export async function createAccount(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not authenticated' } });
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parse.error.message } });
  const forUserId = (req.query.userId as string) || req.auth.userId;
  if (req.auth.role === 'ACCOUNT_HOLDER' && forUserId !== req.auth.userId) return res.status(403).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Cannot create for another user' } });
  try {
    // Enforce KYC for holders
    if (req.auth.role === 'ACCOUNT_HOLDER') {
      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { id: req.auth.userId }, select: { kycStatus: true } });
      if (!user || user.kycStatus !== 'VERIFIED') return res.status(403).json({ error: { code: 'KYC_REQUIRED', message: 'KYC verification required' } });
    }
    const result = await AccountService.create(forUserId, parse.data.currency);
    return res.status(201).json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function listAccounts(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not authenticated' } });
  const userId = req.auth.role === 'ACCOUNT_HOLDER' ? req.auth.userId : (req.query.userId as string) || undefined;
  if (req.auth.role === 'ADMIN' && !userId) return res.status(400).json({ error: { code: 'ADMIN_USERID_REQUIRED', message: 'Admin must provide userId to list accounts' } });
  try {
    const result = await AccountService.list(userId);
    return res.status(200).json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function getAccount(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not authenticated' } });
  const { accountId } = req.params as { accountId: string };
  try {
    const { account } = await AccountService.get(accountId);
    if (req.auth.role === 'ACCOUNT_HOLDER' && account.userId !== req.auth.userId) return res.status(403).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not your account' } });
    return res.status(200).json({ account });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function adminUpdateAccount(req: Request, res: Response) {
  const { accountId } = req.params as { accountId: string };
  const parse = adminUpdateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parse.error.message } });
  try {
    const result = await AccountService.adminUpdate(accountId, parse.data as Partial<{ status: AccountStatus }>);
    return res.status(200).json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function closeAccount(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not authenticated' } });
  const { accountId } = req.params as { accountId: string };
  try {
    const { account } = await AccountService.get(accountId);
    if (req.auth.role === 'ACCOUNT_HOLDER' && account.userId !== req.auth.userId) return res.status(403).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not your account' } });
    const result = await AccountService.close(accountId);
    return res.status(200).json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}


