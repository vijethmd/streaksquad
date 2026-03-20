const mongoose = require('mongoose');

const squadSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxlength: 50 },
  description: { type: String, default: '', maxlength: 200 },
  icon:        { type: String, default: 'fire' },
  goal:        { type: String, required: true, maxlength: 100 },

  // Goal type: boolean = did you do it (yes/no), amount = numeric target
  goalType:    { type: String, enum: ['boolean', 'amount'], default: 'boolean' },
  goalUnit:    { type: String, default: '', maxlength: 30 },  // e.g. "pages", "km", "minutes"
  goalTarget:  { type: Number, default: null },               // e.g. 20 (pages), 5 (km)

  category: {
    type: String,
    enum: ['fitness','learning','mindfulness','creativity','health','career','social','other'],
    default: 'other'
  },
  frequency:   { type: String, enum: ['daily', 'weekly'], default: 'daily' },
  targetDays:  { type: Number, default: null }, // null = no end date
  inviteCode:  { type: String, unique: true },
  isPublic:    { type: Boolean, default: true },
  maxMembers:  { type: Number, default: 10 },
  creator:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt:      { type: Date, default: Date.now },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalCheckins: { type: Number, default: 0 },
    lastCheckin:   { type: Date, default: null },
    isActive:      { type: Boolean, default: true }
  }],
  startDate: { type: Date, default: Date.now },
  endDate:   { type: Date },
  createdAt: { type: Date, default: Date.now }
});

squadSchema.pre('save', function(next) {
  if (!this.inviteCode) {
    this.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  if (!this.endDate && this.targetDays) {
    this.endDate = new Date(this.startDate.getTime() + this.targetDays * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Squad', squadSchema);
