import { Request, Response } from 'express';
import { ReconcileService } from '../services/reconcileService';
import { toErrorResponse } from '../utils/errors';

export async function runReconcile(_req: Request, res: Response) {
  try {
    const result = await ReconcileService.run();
    return res.status(200).json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return res.status(status).json(body);
  }
}

export async function statusReconcile(_req: Request, res: Response) {
  // For MVP, compute on demand (same as run)
  return runReconcile(_req, res);
}


