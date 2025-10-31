import { Request, Response } from 'express';
import { MfaService } from '../services/mfaService';
import { toErrorResponse } from '../utils/errors';

export async function totpSetup(_req: Request, res: Response) {
  try {
    if (!res.req.auth) return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not authenticated' } });
    const data = await MfaService.createTotpSetup(res.req.auth.userId);
    return res.status(200).json(data);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function totpEnable(req: Request, res: Response) {
  try {
    if (!req.auth) return res.status(401).json({ error: { code: 'AUTH_FORBIDDEN', message: 'Not authenticated' } });
    const token = (req.body?.otp_code as string) || '';
    const data = await MfaService.enableTotp(req.auth.userId, token);
    return res.status(200).json(data);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}


