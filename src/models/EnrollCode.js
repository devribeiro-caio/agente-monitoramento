const { Schema, model } = require('mongoose');
module.exports = model('EnrollCode', new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  codeHash: { type: String, required: true, unique: true },
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL
}));
