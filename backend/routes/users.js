const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Checkin = require('../models/Checkin');
const Squad   = require('../models/Squad');
const auth    = require('../middleware/auth');

// GET /api/users/search?q=term
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);
    const users = await User.find({
      username: { $regex: q.trim(), $options: 'i' },
      'privacy.profilePublic': { $ne: false }
    }).select('username photoUrl bio totalStreakDays longestStreak badges').limit(20);
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users/browse — paginated public users for discover
router.get('/browse', auth, async (req, res) => {
  try {
    const { page = 1, limit = 24 } = req.query;
    const users = await User.find({ 'privacy.profilePublic': { $ne: false } })
      .select('username photoUrl bio totalStreakDays longestStreak badges squads createdAt')
      .sort({ totalStreakDays: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users/:username
router.get('/:username', auth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password')
      .populate('squads', 'name icon goal category isPublic goalType goalUnit goalTarget');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const profileView = user.toProfileView(req.user._id);
    if (profileView.isPrivate) return res.json({ user: profileView });

    const isOwner = req.user._id.toString() === user._id.toString();
    let recentCheckins = [];
    if (isOwner || user.privacy.activityPublic) {
      recentCheckins = await Checkin.find({ user: user._id })
        .populate('squad', 'name icon goalType goalUnit')
        .sort({ date: -1 }).limit(15);
      if (!isOwner) {
        recentCheckins = recentCheckins.filter(c => {
          const sid = c.squad?._id?.toString();
          const sqPriv = user.squadPrivacy;
          return sqPriv?.get ? sqPriv.get(sid) !== false : true;
        });
      }
    }

    // Also return squads where this user is a member (for public squads)
    const publicSquads = (profileView.squads || []).filter(s => s.isPublic || isOwner);

    res.json({ user: profileView, recentCheckins, publicSquads });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/users/me/privacy
router.patch('/me/privacy', auth, async (req, res) => {
  try {
    const { privacy, squadPrivacy } = req.body;
    const update = {};
    if (privacy) {
      ['profilePublic','activityPublic','badgesPublic','squadsPublic','statsPublic'].forEach(k => {
        if (privacy[k] !== undefined) update[`privacy.${k}`] = privacy[k];
      });
    }
    if (squadPrivacy && typeof squadPrivacy === 'object') {
      Object.entries(squadPrivacy).forEach(([id, val]) => {
        update[`squadPrivacy.${id}`] = val;
      });
    }
    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true }).select('-password');
    res.json(user.toPublic());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/users/me
router.patch('/me', auth, async (req, res) => {
  try {
    const { bio, avatar, timezone, website } = req.body;
    const update = {};
    if (bio      !== undefined) update.bio      = bio;
    if (avatar   !== undefined) update.avatar   = avatar;
    if (timezone !== undefined) update.timezone = timezone;
    if (website  !== undefined) update.website  = website;
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-password');
    res.json(user.toPublic());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

// POST /api/users/me/recalculate — fixes totalStreakDays for existing users
// Call this once after deploying the fix
router.post('/me/recalculate', auth, async (req, res) => {
  try {
    // Count unique days this user has any check-in
    const mongoose = require('mongoose');
    const Checkin  = require('../models/Checkin');

    const result = await Checkin.aggregate([
      { $match: { user: mongoose.Types.ObjectId(req.user._id) } },
      { $group: { _id: '$dateKey' } },
      { $count: 'uniqueDays' }
    ]);

    const uniqueDays = result[0]?.uniqueDays || 0;

    // Also recalculate longestStreak across all squads
    const Squad = require('../models/Squad');
    const squads = await Squad.find({ 'members.user': req.user._id });
    let longestStreak = 0;
    squads.forEach(sq => {
      const m = sq.members.find(m => m.user.toString() === req.user._id.toString());
      if (m) longestStreak = Math.max(longestStreak, m.longestStreak);
    });

    await User.findByIdAndUpdate(req.user._id, { totalStreakDays: uniqueDays, longestStreak });
    const user = await User.findById(req.user._id).select('-password');
    res.json({ message: 'Recalculated', totalStreakDays: uniqueDays, longestStreak, user: user.toPublic() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
