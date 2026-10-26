const { Schema, model } = require('mongoose');
module.exports = model('Employee', new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  department: String,
  active: { type: Boolean, default: true },
}, { timestamps: true }));
