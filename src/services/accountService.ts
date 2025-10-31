import { AccountStatus } from '@prisma/client';
import { getPrisma } from '../libs/prisma';
import { AppError } from '../utils/errors';
import { AuditService } from './auditService';

export const AccountService = {
  async create(forUserId: string, currency: string) {
    const prisma = getPrisma();
    const account = await prisma.account.create({ data: { userId: forUserId, currency: currency.toUpperCase() } });
    await AuditService.log(forUserId, 'ACCOUNT_CREATE', `account:${account.id}`, { currency: account.currency });
    return { account };
  },
  async list(userId?: string) {
    const prisma = getPrisma();
    const where = userId ? { userId } : {};
    const accounts = await prisma.account.findMany({ where, orderBy: { createdAt: 'desc' } });
    return { accounts };
  },
  async get(accountId: string) {
    const prisma = getPrisma();
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new AppError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
    return { account };
  },
  async adminUpdate(accountId: string, data: Partial<{ status: AccountStatus }>) {
    const prisma = getPrisma();
    const account = await prisma.account.update({ where: { id: accountId }, data });
    return { account };
  },
  async close(accountId: string) {
    const prisma = getPrisma();
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new AppError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
    if (account.balanceMinor !== BigInt(0)) throw new AppError('NON_ZERO_BALANCE', 'Account balance must be zero to close', 400);
    const updated = await prisma.account.update({ where: { id: accountId }, data: { status: AccountStatus.CLOSED } });
    await AuditService.log(account.userId, 'ACCOUNT_CLOSE', `account:${accountId}`);
    return { account: updated };
  },
};


