const mongoose = require('mongoose');

const checkinSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  squad:   { type: mongoose.Schema.Types.ObjectId, ref: 'Squad', required: true },
  note:    { type: String, default: '', maxlength: 280 },
  mood:    { type: Number, min: 1, max: 5, default: 3 },

  // For boolean squads: completed = true/false
  completed: { type: Boolean, default: true },

  // For amount squads: how much did you do today
  amountLogged: { type: Number, default: null },

  reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reaction: { type: String } }],
  streakDay: { type: Number, default: 1 },
  date:    { type: Date, default: Date.now },
  dateKey: { type: String }
});

checkinSchema.pre('save', function(next) {
  const d = this.date || new Date();
  this.dateKey = d.toISOString().slice(0, 10);
  next();
});

checkinSchema.index({ user: 1, squad: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('Checkin', checkinSchema);
