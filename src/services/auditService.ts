import { Prisma } from '@prisma/client';
import { getPrisma } from '../libs/prisma';

export const AuditService = {
  async log(actorId: string | undefined, action: string, resource: string, metadata?: Record<string, unknown>) {
    const prisma = getPrisma();
    await prisma.auditLog.create({ data: { actorId, action, resource, metadata: (metadata as unknown as Prisma.InputJsonValue) ?? null } });
  },
};


