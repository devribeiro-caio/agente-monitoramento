const crypto = require('crypto');
const Device = require('../models/Device');

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

async function deviceAuth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'token ausente' });
    const device = await Device.findOne({ tokenHash: sha256(token), revoked: false });
    if (!device) return res.status(401).json({ error: 'token inválido ou revogado' });
    req.device = device;
    next();
  } catch (err) { next(err); }
}

function adminAuth(req, res, next) {
  const address = req.socket.remoteAddress || '';
  const hostname = String(req.hostname || '').toLowerCase();
  const isLoopback = ['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(address);
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  if (isLoopback && isLocalHost) return next();
  const key = String(req.headers['x-admin-key'] || '');
  const expected = process.env.ADMIN_API_KEY || '';
  const ok = expected.length >= 16 &&
    key.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(key), Buffer.from(expected));
  if (!ok) return res.status(401).json({ error: 'não autorizado' });
  next();
}

module.exports = { deviceAuth, adminAuth, sha256 };
