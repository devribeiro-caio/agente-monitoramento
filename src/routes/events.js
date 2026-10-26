const router = require('express').Router();
const Event = require('../models/Event');
const { deviceAuth } = require('../middleware/auth');
const { categorize } = require('../categorizer');
const { excludedDomains, excludedApps, matchesDomain } = require('../config');

const MAX_BATCH = 500;
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

router.post('/', deviceAuth, wrap(async (req, res) => {
  const list = Array.isArray(req.body.events) ? req.body.events.slice(0, MAX_BATCH) : [];
  const now = Date.now();
  const docs = [];

  for (const e of list) {
    const ts = new Date(e.timestamp);
    const dur = Number(e.durationSec);
    if (isNaN(ts) || ts.getTime() > now + 60_000 || now - ts.getTime() > MAX_AGE_MS) continue;
    if (!(dur >= 0 && dur <= 86400)) continue;

    const base = {
      timestamp: ts,
      meta: { employeeId: req.device.employeeId, deviceId: req.device._id },
      durationSec: Math.round(dur),
      ip: req.device.currentIp,
    };

    if (e.kind === 'web' && typeof e.domain === 'string') {
      const domain = e.domain.toLowerCase().slice(0, 253);
      if (matchesDomain(domain, excludedDomains)) continue; // defesa em profundidade
      docs.push({ ...base, kind: 'web', domain, ...(await categorize(domain)) });
    } else if (e.kind === 'app' && typeof e.app === 'string') {
      const app = e.app.slice(0, 120);
      if (excludedApps.includes(app.toLowerCase())) continue;
      docs.push({ ...base, kind: 'app', app });
    }
  }

  if (docs.length) await Event.insertMany(docs, { ordered: false });
  res.json({ accepted: docs.length, received: list.length });
}));

module.exports = router;
