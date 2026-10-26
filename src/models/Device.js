const { Schema, model } = require('mongoose');
module.exports = model('Device', new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  hostname: String,
  osUser: String,
  mac: String,
  currentIp: String,
  lastSeen: Date,
  tokenHash: { type: String, required: true, unique: true },
  revoked: { type: Boolean, default: false },
}, { timestamps: true }));
