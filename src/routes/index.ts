import { Router } from 'express';
import { router as auth } from './auth';
import { router as kyc } from './kyc';
import { router as accounts } from './accounts';

export const router = Router();

router.use('/auth', auth);
router.use('/kyc', kyc);
router.use('/accounts', accounts);


