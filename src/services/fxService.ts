import { getPrisma } from '../libs/prisma';
import { AppError } from '../utils/errors';

export const FxService = {
  async getRate(base: string, quote: string): Promise<number> {
    const prisma = getPrisma();
    if (base.toUpperCase() === quote.toUpperCase()) return 1;
    const latest = await prisma.fXRate.findFirst({
      where: { base: base.toUpperCase(), quote: quote.toUpperCase() },
      orderBy: { effectiveAt: 'desc' },
    });
    if (latest) return latest.rate;
    throw new AppError('FX_RATE_UNAVAILABLE', 'FX rate not available for requested pair', 400);
  },
};


