const { Schema, model } = require('mongoose');
module.exports = model('DomainCategory', new Schema({
  domain: { type: String, required: true, unique: true, lowercase: true },
  category: { type: String, required: true },
  productivity: { type: String, enum: ['productive', 'neutral', 'unproductive'], default: 'neutral' },
}));
