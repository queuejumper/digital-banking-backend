import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { runReconcile, statusReconcile } from '../controllers/reconcileController';
import { listAccountHolders, getAccountHolder, resetUserTotp } from '../controllers/adminUsersController';
import { listAudit } from '../controllers/auditController';

export const router = Router();

router.post('/reconcile/run', requireAuth, requireRole('ADMIN'), runReconcile);
router.get('/reconcile/status', requireAuth, requireRole('ADMIN'), statusReconcile);
router.get('/users', requireAuth, requireRole('ADMIN'), listAccountHolders);
router.get('/users/:userId', requireAuth, requireRole('ADMIN'), getAccountHolder);
router.post('/users/:userId/totp/reset', requireAuth, requireRole('ADMIN'), resetUserTotp);
router.get('/audit', requireAuth, requireRole('ADMIN'), listAudit);


