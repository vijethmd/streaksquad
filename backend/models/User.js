const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  photoUrl: { type: String, default: '' }, // base64 or URL — empty = show placeholder
  bio:      { type: String, default: '', maxlength: 160 },
  timezone: { type: String, default: 'UTC' },
  website:  { type: String, default: '', maxlength: 100 },
  // Social handles — store just the username/handle, not the full URL
  socials: {
    instagram: { type: String, default: '', maxlength: 60 },
    linkedin:  { type: String, default: '', maxlength: 100 },
    twitter:   { type: String, default: '', maxlength: 60 },
    github:    { type: String, default: '', maxlength: 60 },
    youtube:   { type: String, default: '', maxlength: 100 },
  },
  squads:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Squad' }],
  totalStreakDays: { type: Number, default: 0 },
  longestStreak:  { type: Number, default: 0 },
  badges: [{ id: String, name: String, icon: String, earnedAt: { type: Date, default: Date.now } }],
  privacy: {
    profilePublic:  { type: Boolean, default: true },
    activityPublic: { type: Boolean, default: true },
    badgesPublic:   { type: Boolean, default: true },
    squadsPublic:   { type: Boolean, default: true },
    statsPublic:    { type: Boolean, default: true },
  },
  squadPrivacy: { type: Map, of: Boolean, default: {} },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = async function(c) { return bcrypt.compare(c, this.password); };
userSchema.methods.toPublic = function() { const o = this.toObject(); delete o.password; return o; };
userSchema.methods.toProfileView = function(viewerId) {
  const obj = this.toObject(); delete obj.password; delete obj.email;
  const isOwner = viewerId && viewerId.toString() === this._id.toString();
  if (isOwner) return { ...obj, isOwner: true };
  if (!this.privacy.profilePublic) return { _id: this._id, username: this.username, photoUrl: this.photoUrl, isPrivate: true };
  if (!this.privacy.badgesPublic) obj.badges = [];
  if (!this.privacy.squadsPublic) obj.squads = [];
  if (!this.privacy.statsPublic)  { obj.totalStreakDays = null; obj.longestStreak = null; }
  return { ...obj, isOwner: false };
};
module.exports = mongoose.model('User', userSchema);
