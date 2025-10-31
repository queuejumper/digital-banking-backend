import { KycStatus } from '@prisma/client';
import { getPrisma } from '../libs/prisma';
import { AppError } from '../utils/errors';
import { AuditService } from './auditService';

export const KycService = {
  async submit(userId: string, payload: { fullName: string; country: string }) {
    // In a real implementation, persist payload and send to provider.
    const prisma = getPrisma();
    const user = await prisma.user.update({ where: { id: userId }, data: { kycStatus: KycStatus.PENDING }, select: { id: true, email: true, kycStatus: true } });
    await AuditService.log(userId, 'KYC_SUBMIT', `user:${userId}`);
    return { user };
  },
  async status(userId: string) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, kycStatus: true } });
    if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    return { user };
  },
  async adminSetStatus(userId: string, status: KycStatus) {
    const prisma = getPrisma();
    const user = await prisma.user.update({ where: { id: userId }, data: { kycStatus: status }, select: { id: true, email: true, kycStatus: true } });
    await AuditService.log(undefined, 'KYC_SET_STATUS', `user:${userId}`, { status });
    return { user };
  },
};


