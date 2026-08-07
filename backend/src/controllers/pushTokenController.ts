import { Request, Response } from 'express';
import { getReqLang, t } from '../utils/i18n';
import { registerUserPushToken, unregisterUserPushToken } from '../utils/expoPush';

export async function register(req: Request, res: Response) {
  const user = (req as any).user as { id: string };
  const lang = getReqLang(req);
  const { token, platform, deviceId } = req.body as { token?: string; platform?: 'ios' | 'android'; deviceId?: string };
  if (!token || (platform !== 'ios' && platform !== 'android')) {
    res.status(400).json({ message: t(lang, 'common.internalError') });
    return;
  }
  try {
    const saved = await registerUserPushToken({ userId: user.id, token, platform, deviceId });
    res.json({ ok: true, token: saved?.token });
  } catch (e) {
    console.error('register push token error', e);
    res.status(500).json({ message: t(lang, 'common.internalError') });
  }
}

export async function unregister(req: Request, res: Response) {
  const lang = getReqLang(req);
  const { token } = req.body as { token?: string };
  if (!token) { res.status(400).json({ message: t(lang, 'common.internalError') }); return; }
  try {
    await unregisterUserPushToken(token);
    res.json({ ok: true });
  } catch (e) {
    console.error('unregister push token error', e);
    res.status(500).json({ message: t(lang, 'common.internalError') });
  }
}
