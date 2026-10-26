const router = require('express').Router();
const crypto = require('crypto');
const Device = require('../models/Device');
const EnrollCode = require('../models/EnrollCode');
const { deviceAuth, sha256 } = require('../middleware/auth');
const { agentConfig } = require('../config');

const str = (v, max = 100) => (typeof v === 'string' ? v.slice(0, max) : undefined);
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// O agente troca o código de ativação (gerado no painel) por um token de dispositivo.
router.post('/enroll', wrap(async (req, res) => {
  const code = str(req.body.code, 32);
  if (!code) return res.status(400).json({ error: 'código obrigatório' });

  const rec = await EnrollCode.findOneAndUpdate(
    { codeHash: sha256(code.trim().toUpperCase()), used: false, expiresAt: { $gt: new Date() } },
    { used: true }
  );
  if (!rec) return res.status(400).json({ error: 'código inválido ou expirado' });

  const token = crypto.randomBytes(32).toString('hex');
  await Device.create({
    employeeId: rec.employeeId,
    hostname: str(req.body.hostname),
    osUser: str(req.body.osUser),
    mac: str(req.body.mac, 40),
    currentIp: str(req.body.ip, 64),
    lastSeen: new Date(),
    tokenHash: sha256(token),
  });
  res.json({ token, config: agentConfig() });
}));

// Atualiza IP/MAC/hostname e devolve a configuração atual (listas de exclusão etc.).
router.post('/heartbeat', deviceAuth, wrap(async (req, res) => {
  const d = req.device;
  d.currentIp = str(req.body.ip, 64) || d.currentIp;
  d.mac = str(req.body.mac, 40) || d.mac;
  d.hostname = str(req.body.hostname) || d.hostname;
  d.lastSeen = new Date();
  await d.save();
  res.json({ ok: true, config: agentConfig() });
}));

module.exports = router;
