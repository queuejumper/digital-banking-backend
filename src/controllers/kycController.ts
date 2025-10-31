import { Request, Response } from 'express';
import { KycStatus } from '@prisma/client';
import { z } from 'zod';
import { KycService } from '../services/kycService';
import { toErrorResponse } from '../utils/errors';

const kycSubmitSchema = z.object({ fullName: z.string().min(2), country: z.string().min(2) });
const kycStatusUpdateSchema = z.object({ status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']) });

export async function submitKyc(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not authenticated' } });
  const parse = kycSubmitSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parse.error.message } });
  try {
    const result = await KycService.submit(req.auth.userId, parse.data);
    return res.status(200).json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function getKycStatus(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not authenticated' } });
  try {
    const result = await KycService.status(req.auth.userId);
    return res.status(200).json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function adminSetKycStatus(req: Request, res: Response) {
  const parse = kycStatusUpdateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parse.error.message } });
  const { userId } = req.params as { userId: string };
  try {
    const result = await KycService.adminSetStatus(userId, parse.data.status as KycStatus);
    return res.status(200).json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}


