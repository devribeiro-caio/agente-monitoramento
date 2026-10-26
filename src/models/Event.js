const { Schema, model } = require('mongoose');
const { retentionDays } = require('../config');

// Time series collection (MongoDB 5.0+) com expiração automática.
const schema = new Schema({
  timestamp: { type: Date, required: true },
  meta: {
    employeeId: { type: Schema.Types.ObjectId, required: true },
    deviceId: { type: Schema.Types.ObjectId, required: true },
  },
  kind: { type: String, enum: ['app', 'web'], required: true },
  app: String,          // ex.: "chrome.exe" (kind = app)
  domain: String,       // ex.: "youtube.com" (kind = web)
  category: String,
  productivity: String,
  durationSec: { type: Number, default: 0 },
  ip: String,
}, {
  timeseries: { timeField: 'timestamp', metaField: 'meta', granularity: 'minutes' },
  expireAfterSeconds: retentionDays * 24 * 3600,
  autoCreate: true,
  versionKey: false,
});

module.exports = model('Event', schema);
