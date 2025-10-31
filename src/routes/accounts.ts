import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { createAccount, listAccounts, getAccount, adminUpdateAccount, closeAccount } from '../controllers/accountController';

export const router = Router();

router.post('/', requireAuth, requireRole('ACCOUNT_HOLDER', 'STAFF', 'ADMIN'), createAccount);
router.get('/', requireAuth, listAccounts);
router.get('/:accountId', requireAuth, getAccount);
router.patch('/:accountId', requireAuth, requireRole('STAFF', 'ADMIN'), adminUpdateAccount);
router.delete('/:accountId', requireAuth, closeAccount);


