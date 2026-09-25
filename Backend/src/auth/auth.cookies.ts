import { Response } from 'express';

const isProduction = () => process.env.NODE_ENV === 'production';

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number },
): void {
  const secure = isProduction();
  const maxAgeAccess = (tokens.expiresIn || 900) * 1000;
  const maxAgeRefresh = 7 * 24 * 60 * 60 * 1000;

  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    maxAge: maxAgeAccess,
  });

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    maxAge: maxAgeRefresh,
  });
}

export function clearAuthCookies(res: Response): void {
  const secure = isProduction();
  const options = {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' as const : 'lax' as const,
    path: '/',
  } as const;

  res.clearCookie('accessToken', options);
  res.clearCookie('refreshToken', options);
}
