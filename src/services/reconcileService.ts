import { getPrisma } from '../libs/prisma';

type AccountMismatch = {
  accountId: string;
  currency: string;
  balanceMinor: bigint;
  computedMinor: bigint;
  deltaMinor: bigint;
};

export const ReconcileService = {
  async run(): Promise<{ mismatches: AccountMismatch[]; checked: number }> {
    const prisma = getPrisma();
    const accounts = await prisma.account.findMany({ select: { id: true, currency: true, balanceMinor: true } });
    const mismatches: AccountMismatch[] = [];
    for (const a of accounts) {
      const txs = await prisma.transaction.findMany({ where: { accountId: a.id }, select: { type: true, amountMinor: true, relatedTransactionId: true } });
      let computed = BigInt(0);
      for (const t of txs) {
        if (t.type === 'DEPOSIT') computed += t.amountMinor as bigint;
        else if (t.type === 'WITHDRAW') computed -= t.amountMinor as bigint;
        else if (t.type === 'FX_CONVERT') {
          // Outgoing if it references the other leg, incoming otherwise
          if (t.relatedTransactionId) computed -= t.amountMinor as bigint;
          else computed += t.amountMinor as bigint;
        } else if (t.type === 'ADJUSTMENT') {
          computed += t.amountMinor as bigint;
        }
      }
      const delta = (a.balanceMinor as bigint) - computed;
      if (delta !== BigInt(0)) {
        mismatches.push({ accountId: a.id, currency: a.currency, balanceMinor: a.balanceMinor as bigint, computedMinor: computed, deltaMinor: delta });
      }
    }
    return { mismatches, checked: accounts.length };
  },
};


