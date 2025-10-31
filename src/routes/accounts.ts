import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { createAccount, listAccounts, getAccount, adminUpdateAccount, closeAccount } from '../controllers/accountController';
import { deposit, withdraw, listTransactions, convert } from '../controllers/transactionController';

export const router = Router();

router.post('/', requireAuth, requireRole('ACCOUNT_HOLDER', 'STAFF', 'ADMIN'), createAccount);
router.get('/', requireAuth, listAccounts);
router.get('/:accountId', requireAuth, getAccount);
router.patch('/:accountId', requireAuth, requireRole('ADMIN'), adminUpdateAccount);
router.delete('/:accountId', requireAuth, closeAccount);

// Transactions
router.post('/:accountId/deposits', requireAuth, deposit);
router.post('/:accountId/withdrawals', requireAuth, withdraw);
router.get('/:accountId/transactions', requireAuth, listTransactions);
router.post('/:accountId/convert', requireAuth, convert);


