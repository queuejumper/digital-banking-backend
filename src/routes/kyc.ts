import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { submitKyc, getKycStatus, adminSetKycStatus } from '../controllers/kycController';

export const router = Router();

router.post('/submit', requireAuth, requireRole('ACCOUNT_HOLDER'), submitKyc);
router.get('/status', requireAuth, getKycStatus);
router.patch('/admin/:userId/status', requireAuth, requireRole('STAFF', 'ADMIN'), adminSetKycStatus);


