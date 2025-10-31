import { Router } from 'express';
import { router as auth } from './auth';
import { router as kyc } from './kyc';
import { router as accounts } from './accounts';
import { router as admin } from './admin';
import { router as mfa } from './mfa';

export const router = Router();

router.use('/auth', auth);
router.use('/kyc', kyc);
router.use('/accounts', accounts);
router.use('/admin', admin);
router.use('/mfa', mfa);


