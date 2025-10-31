import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService';
import { toErrorResponse } from '../utils/errors';

const signupSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const loginSchema = signupSchema;

export async function signup(req: Request, res: Response) {
  const parse = signupSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parse.error.message } });
  try {
    const { user, tokens } = await AuthService.signup(parse.data.email, parse.data.password);
    return res.status(201).json({ user: { id: user.id, email: user.email, role: user.role, kycStatus: user.kycStatus }, tokens });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function login(req: Request, res: Response) {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parse.error.message } });
  try {
    const { user, tokens } = await AuthService.login(parse.data.email, parse.data.password);
    return res.status(200).json({ user: { id: user.id, email: user.email, role: user.role, kycStatus: user.kycStatus }, tokens });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function refresh(req: Request, res: Response) {
  const token = (req.body?.refreshToken as string) || '';
  if (!token) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing refreshToken' } });
  try {
    const { accessToken } = await AuthService.refresh(token);
    return res.status(200).json({ accessToken });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function logout(req: Request, res: Response) {
  const token = (req.body?.refreshToken as string) || '';
  if (!token) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing refreshToken' } });
  try {
    const result = await AuthService.logout(token);
    return res.status(200).json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}


