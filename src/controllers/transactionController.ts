import { Request, Response } from 'express';
import { z } from 'zod';
import { TransactionService } from '../services/transactionService';
import { toErrorResponse } from '../utils/errors';
import { AccountService } from '../services/accountService';
import { getPrisma } from '../libs/prisma';
import { MfaService } from '../services/mfaService';

const moneySchema = z.object({ amount_minor: z.string().regex(/^\d+$/, 'amount_minor must be digits') });
const convertSchema = z.object({
  to_currency: z.string().min(3).max(3),
  amount_minor: z.string().regex(/^\d+$/),
  rate: z.number().positive().optional(),
  rate_timestamp: z.string().datetime().optional(),
});

export async function deposit(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not authenticated' } });
  const { accountId } = req.params as { accountId: string };
  const parse = moneySchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parse.error.message } });
  const idk = (req.headers['idempotency-key'] as string) || undefined;
  try {
    const { account } = await AccountService.get(accountId);
    if (req.auth.role === 'ACCOUNT_HOLDER' && account.userId !== req.auth.userId) return res.status(403).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not your account' } });
    // Enforce KYC VERIFIED for holders
    if (req.auth.role === 'ACCOUNT_HOLDER') {
      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { id: req.auth.userId }, select: { kycStatus: true } });
      if (!user || user.kycStatus !== 'VERIFIED') return res.status(403).json({ error: { code: 'KYC_REQUIRED', message: 'KYC verification required' } });
      // If TOTP enabled, require otp_code
      const otp = (req.body?.otp_code as string) || '';
      await MfaService.verifyToken(req.auth.userId, otp);
    }
    const result = await TransactionService.deposit(accountId, BigInt(parse.data.amount_minor), { idempotencyKey: idk });
    return res.status(201).json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function withdraw(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not authenticated' } });
  const { accountId } = req.params as { accountId: string };
  const parse = moneySchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parse.error.message } });
  const idk = (req.headers['idempotency-key'] as string) || undefined;
  try {
    const { account } = await AccountService.get(accountId);
    if (req.auth.role === 'ACCOUNT_HOLDER' && account.userId !== req.auth.userId) return res.status(403).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not your account' } });
    if (req.auth.role === 'ACCOUNT_HOLDER') {
      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { id: req.auth.userId }, select: { kycStatus: true } });
      if (!user || user.kycStatus !== 'VERIFIED') return res.status(403).json({ error: { code: 'KYC_REQUIRED', message: 'KYC verification required' } });
      const otp = (req.body?.otp_code as string) || '';
      await MfaService.verifyToken(req.auth.userId, otp);
    }
    const result = await TransactionService.withdraw(accountId, BigInt(parse.data.amount_minor), { idempotencyKey: idk });
    return res.status(201).json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function listTransactions(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not authenticated' } });
  const { accountId } = req.params as { accountId: string };
  const page = parseInt((req.query.page as string) || '1', 10);
  const pageSize = parseInt((req.query.pageSize as string) || '20', 10);
  try {
    const { account } = await AccountService.get(accountId);
    if (req.auth.role === 'ACCOUNT_HOLDER' && account.userId !== req.auth.userId) return res.status(403).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not your account' } });
    const result = await TransactionService.list(accountId, page, pageSize);
    return res.status(200).json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function convert(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not authenticated' } });
  const { accountId } = req.params as { accountId: string };
  const convertParse = convertSchema.safeParse(req.body);
  if (!convertParse.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: convertParse.error.message } });
  const idk = (req.headers['idempotency-key'] as string) || undefined;
  try {
    const { account } = await AccountService.get(accountId);
    if (req.auth.role === 'ACCOUNT_HOLDER' && account.userId !== req.auth.userId) return res.status(403).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not your account' } });
    if (req.auth.role === 'ACCOUNT_HOLDER') {
      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { id: req.auth.userId }, select: { kycStatus: true } });
      if (!user || user.kycStatus !== 'VERIFIED') return res.status(403).json({ error: { code: 'KYC_REQUIRED', message: 'KYC verification required' } });
      const otp = (req.body?.otp_code as string) || '';
      await MfaService.verifyToken(req.auth.userId, otp);
    }
    const result = await TransactionService.convert(
      accountId,
      convertParse.data.to_currency,
      BigInt(convertParse.data.amount_minor),
      {
        idempotencyKey: idk,
        clientRate: convertParse.data.rate,
        clientRateTimestamp: convertParse.data.rate_timestamp,
      }
    );
    return res.status(201).json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}


