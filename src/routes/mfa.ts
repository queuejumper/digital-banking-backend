import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { totpSetup, totpEnable } from '../controllers/mfaController';

export const router = Router();

router.post('/totp/setup', requireAuth, totpSetup);
router.post('/totp/enable', requireAuth, totpEnable);


