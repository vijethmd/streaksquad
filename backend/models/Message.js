const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  squad:   { type: mongoose.Schema.Types.ObjectId, ref: 'Squad', required: true },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  text:    { type: String, default: '', maxlength: 1000 },
  // special message types
  type:    { type: String, enum: ['text','badge'], default: 'text' },
  badge:   { badgeId: String, badgeName: String, badgeIcon: String },
  createdAt: { type: Date, default: Date.now }
});

messageSchema.index({ squad: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
