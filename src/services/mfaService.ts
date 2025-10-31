import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { getPrisma } from '../libs/prisma';
import { AppError } from '../utils/errors';

export const MfaService = {
  async createTotpSetup(userId: string) {
    const secret = speakeasy.generateSecret({ length: 20, name: `DigitalBank (${userId})` });
    const otpauth_url = secret.otpauth_url as string;
    const qrcodeDataUrl = await QRCode.toDataURL(otpauth_url);
    const prisma = getPrisma();
    await prisma.user.update({ where: { id: userId }, data: { totpSecret: secret.base32 } });
    return { otpauth_url, qrcodeDataUrl };
  },

  async enableTotp(userId: string, token: string) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpSecret: true } });
    if (!user?.totpSecret) throw new AppError('TOTP_NOT_INITIATED', 'TOTP setup not initiated', 400);
    const ok = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token, window: 1 });
    if (!ok) throw new AppError('OTP_INVALID', 'Invalid OTP code', 400);
    await prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
    return { enabled: true };
  },

  async verifyToken(userId: string, token: string) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpEnabled: true, totpSecret: true } });
    if (!user?.totpEnabled || !user.totpSecret) throw new AppError('OTP_SETUP_REQUIRED', 'TOTP setup required', 403);
    if (!token || token.trim().length === 0) throw new AppError('OTP_REQUIRED', 'OTP code required', 400);
    const ok = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token, window: 1 });
    if (!ok) throw new AppError('OTP_INVALID', 'Invalid OTP code', 400);
    return true;
  },
};


