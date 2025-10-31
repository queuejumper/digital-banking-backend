import { Prisma, TransactionType, AccountStatus } from '@prisma/client';
import { getPrisma } from '../libs/prisma';
import { AppError } from '../utils/errors';
import { FxService } from './fxService';
import { AuditService } from './auditService';

type DepositWithdrawResult = {
  transaction: { id: string; type: TransactionType; amountMinor: bigint; currency: string; createdAt: Date };
  balanceMinor: bigint;
};

function makeRequestHash(op: string, data: Record<string, string>): string {
  const parts = [op, ...Object.entries(data).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}:${v}`)];
  return parts.join('|');
}

export const TransactionService = {
  async deposit(accountId: string, amountMinor: bigint, options?: { idempotencyKey?: string }) {
    if (amountMinor <= BigInt(0)) throw new AppError('VALIDATION_ERROR', 'Amount must be > 0', 400);
    const prisma = getPrisma();

    const requestHash = makeRequestHash('deposit', { accountId, amountMinor: amountMinor.toString() });
    if (options?.idempotencyKey) {
      const existing = await prisma.idempotencyKey.findUnique({ where: { key: `${accountId}:${options.idempotencyKey}` } });
      if (existing) {
        if (existing.requestHash !== requestHash) throw new AppError('IDEMPOTENCY_KEY_REPLAY', 'Idempotency key reuse with different request', 409);
        if (existing.response) return existing.response as unknown as DepositWithdrawResult;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account) throw new AppError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
      if (account.status !== AccountStatus.OPEN) throw new AppError('ACCOUNT_CLOSED', 'Account is closed', 400);

      const updated = await tx.account.update({
        where: { id: accountId },
        data: { balanceMinor: (account.balanceMinor as bigint) + amountMinor },
      });
      const txn = await tx.transaction.create({
        data: {
          accountId,
          type: TransactionType.DEPOSIT,
          amountMinor,
          currency: account.currency,
        },
      });
      const payload: DepositWithdrawResult = {
        transaction: { id: txn.id, type: txn.type, amountMinor: txn.amountMinor as bigint, currency: txn.currency, createdAt: txn.createdAt },
        balanceMinor: updated.balanceMinor as bigint,
      };
      await AuditService.log(account.userId, 'DEPOSIT', `account:${accountId}`, { amountMinor: amountMinor.toString(), currency: account.currency });
      return payload;
    });

    if (options?.idempotencyKey) {
      await prisma.idempotencyKey.upsert({
        where: { key: `${accountId}:${options.idempotencyKey}` },
        create: { key: `${accountId}:${options.idempotencyKey}`, requestHash, status: 'completed', response: result as unknown as Prisma.JsonObject },
        update: { status: 'completed', response: result as unknown as Prisma.JsonObject },
      });
    }
    return result;
  },

  async convert(
    accountId: string,
    toCurrency: string,
    amountMinor: bigint,
    options?: { idempotencyKey?: string; clientRate?: number; clientRateTimestamp?: string }
  ) {
    if (amountMinor <= BigInt(0)) throw new AppError('VALIDATION_ERROR', 'Amount must be > 0', 400);
    const prisma = getPrisma();

    const requestHash = makeRequestHash('convert', {
      accountId,
      toCurrency: toCurrency.toUpperCase(),
      amountMinor: amountMinor.toString(),
      ...(options?.clientRate ? { clientRate: String(options.clientRate) } : {}),
      ...(options?.clientRateTimestamp ? { clientRateTimestamp: options.clientRateTimestamp } : {}),
    });
    if (options?.idempotencyKey) {
      const existing = await prisma.idempotencyKey.findUnique({ where: { key: `${accountId}:${options.idempotencyKey}` } });
      if (existing) {
        if (existing.requestHash !== requestHash) throw new AppError('IDEMPOTENCY_KEY_REPLAY', 'Idempotency key reuse with different request', 409);
        if (existing.response) return existing.response as unknown as DepositWithdrawResult;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const from = await tx.account.findUnique({ where: { id: accountId } });
      if (!from) throw new AppError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
      if (from.status !== AccountStatus.OPEN) throw new AppError('ACCOUNT_CLOSED', 'Account is closed', 400);
      if ((from.balanceMinor as bigint) < amountMinor) throw new AppError('INSUFFICIENT_FUNDS', 'Amount exceeds balance', 400);

      let rate: number;
      try {
        rate = await FxService.getRate(from.currency, toCurrency.toUpperCase());
      } catch {
        if (options?.clientRate && options.clientRate > 0) {
          // Optionally validate staleness of provided timestamp
          if (options.clientRateTimestamp) {
            const ts = new Date(options.clientRateTimestamp);
            if (Number.isNaN(ts.getTime())) throw new AppError('FX_RATE_INVALID', 'Provided rate timestamp invalid', 400);
            // Accept if within 48h for now (can be tightened in prod)
            const maxAgeMs = 48 * 60 * 60 * 1000;
            if (Date.now() - ts.getTime() > maxAgeMs) throw new AppError('FX_RATE_STALE', 'Provided rate is too old', 400);
          }
          rate = options.clientRate;
        } else {
          throw new AppError('FX_RATE_UNAVAILABLE', 'FX rate not available for requested pair', 400);
        }
      }
      const converted = BigInt(Math.floor(Number(amountMinor) * rate));

      // Destination account must exist for same user with target currency
      const to = await tx.account.findFirst({ where: { userId: from.userId, currency: toCurrency.toUpperCase(), status: AccountStatus.OPEN } });
      if (!to) throw new AppError('TARGET_ACCOUNT_NOT_FOUND', 'Destination account in target currency not found', 404);

      const updatedFrom = await tx.account.update({ where: { id: from.id }, data: { balanceMinor: (from.balanceMinor as bigint) - amountMinor } });
      const updatedTo = await tx.account.update({ where: { id: to.id }, data: { balanceMinor: (to.balanceMinor as bigint) + converted } });

      const outTx = await tx.transaction.create({
        data: { accountId: to.id, type: TransactionType.FX_CONVERT, amountMinor: converted, currency: to.currency, fxRateUsed: rate },
      });
      const inTx = await tx.transaction.create({
        data: { accountId: from.id, type: TransactionType.FX_CONVERT, amountMinor, currency: from.currency, fxRateUsed: rate, relatedTransactionId: outTx.id },
      });

      const payload: DepositWithdrawResult = {
        transaction: { id: inTx.id, type: inTx.type, amountMinor: inTx.amountMinor as bigint, currency: inTx.currency, createdAt: inTx.createdAt },
        balanceMinor: updatedFrom.balanceMinor as bigint,
      };
      await AuditService.log(from.userId, 'FX_CONVERT', `account:${from.id}->${to.id}`, { from: from.currency, to: to.currency, amountMinor: amountMinor.toString(), convertedMinor: converted.toString(), rate });
      return payload;
    });

    if (options?.idempotencyKey) {
      await prisma.idempotencyKey.upsert({
        where: { key: `${accountId}:${options.idempotencyKey}` },
        create: { key: `${accountId}:${options.idempotencyKey}`, requestHash, status: 'completed', response: result as unknown as Prisma.JsonObject },
        update: { status: 'completed', response: result as unknown as Prisma.JsonObject },
      });
    }
    return result;
  },

  async withdraw(accountId: string, amountMinor: bigint, options?: { idempotencyKey?: string }) {
    if (amountMinor <= BigInt(0)) throw new AppError('VALIDATION_ERROR', 'Amount must be > 0', 400);
    const prisma = getPrisma();

    const requestHash = makeRequestHash('withdraw', { accountId, amountMinor: amountMinor.toString() });
    if (options?.idempotencyKey) {
      const existing = await prisma.idempotencyKey.findUnique({ where: { key: `${accountId}:${options.idempotencyKey}` } });
      if (existing) {
        if (existing.requestHash !== requestHash) throw new AppError('IDEMPOTENCY_KEY_REPLAY', 'Idempotency key reuse with different request', 409);
        if (existing.response) return existing.response as unknown as DepositWithdrawResult;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account) throw new AppError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
      if (account.status !== AccountStatus.OPEN) throw new AppError('ACCOUNT_CLOSED', 'Account is closed', 400);
      if ((account.balanceMinor as bigint) < amountMinor) throw new AppError('INSUFFICIENT_FUNDS', 'Withdrawal amount exceeds available balance', 400);

      const updated = await tx.account.update({
        where: { id: accountId },
        data: { balanceMinor: (account.balanceMinor as bigint) - amountMinor },
      });
      const txn = await tx.transaction.create({
        data: {
          accountId,
          type: TransactionType.WITHDRAW,
          amountMinor,
          currency: account.currency,
        },
      });
      const payload: DepositWithdrawResult = {
        transaction: { id: txn.id, type: txn.type, amountMinor: txn.amountMinor as bigint, currency: txn.currency, createdAt: txn.createdAt },
        balanceMinor: updated.balanceMinor as bigint,
      };
      await AuditService.log(account.userId, 'WITHDRAW', `account:${accountId}`, { amountMinor: amountMinor.toString(), currency: account.currency });
      return payload;
    });

    if (options?.idempotencyKey) {
      await prisma.idempotencyKey.upsert({
        where: { key: `${accountId}:${options.idempotencyKey}` },
        create: { key: `${accountId}:${options.idempotencyKey}`, requestHash, status: 'completed', response: result as unknown as Prisma.JsonObject },
        update: { status: 'completed', response: result as unknown as Prisma.JsonObject },
      });
    }
    return result;
  },

  async list(accountId: string, page = 1, pageSize = 20) {
    const prisma = getPrisma();
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where: { accountId } }),
    ]);
    return { items, total, page, pageSize };
  },
};


