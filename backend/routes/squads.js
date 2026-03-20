const express = require('express');
const router  = express.Router();
const Squad   = require('../models/Squad');
const User    = require('../models/User');
const Checkin = require('../models/Checkin');
const auth    = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = { isPublic: true };
    if (category) query.category = category;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { goal: { $regex: search, $options: 'i' } }
    ];
    const squads = await Squad.find(query)
      .populate('creator', 'username photoUrl')
      .populate('members.user', 'username photoUrl')
      .sort({ createdAt: -1 }).limit(30);
    res.json(squads);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, icon, goal, goalType, goalUnit, goalTarget,
            category, frequency, targetDays, isPublic, maxMembers } = req.body;
    if (!name || !goal) return res.status(400).json({ error: 'Name and goal required' });

    const squad = await Squad.create({
      name, description, icon: icon || 'target', goal,
      goalType: goalType || 'boolean',
      goalUnit: goalUnit || '',
      goalTarget: goalTarget || null,
      category, frequency,
      targetDays: targetDays || 30,
      isPublic: isPublic !== false,
      maxMembers: maxMembers || 10,
      creator: req.user._id,
      members: [{ user: req.user._id, joinedAt: new Date() }]
    });
    await User.findByIdAndUpdate(req.user._id, { $push: { squads: squad._id } });
    const populated = await squad.populate(['creator', 'members.user']);
    req.io.emit('squad_created', { squad: populated });
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const squad = await Squad.findById(req.params.id)
      .populate('creator', 'username photoUrl')
      .populate('members.user', 'username photoUrl totalStreakDays badges');
    if (!squad) return res.status(404).json({ error: 'Squad not found' });
    const checkins = await Checkin.find({ squad: squad._id })
      .populate('user', 'username photoUrl')
      .sort({ date: -1 }).limit(20);
    res.json({ squad, checkins });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/join/:inviteCode', auth, async (req, res) => {
  try {
    const squad = await Squad.findOne({ inviteCode: req.params.inviteCode.toUpperCase() });
    if (!squad) return res.status(404).json({ error: 'Invalid invite code' });

    const existingIdx = squad.members.findIndex(m => m.user.toString() === req.user._id.toString());

    if (existingIdx > -1) {
      if (squad.members[existingIdx].isActive) return res.status(400).json({ error: 'Already a member' });
      // Rejoin — restore isActive, preserve all streak data
      squad.members[existingIdx].isActive = true;
      await squad.save();
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { squads: squad._id } });
    } else {
      if (squad.members.filter(m=>m.isActive).length >= squad.maxMembers)
        return res.status(400).json({ error: 'Squad is full' });
      squad.members.push({ user: req.user._id });
      await squad.save();
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { squads: squad._id } });
    }

    const populated = await squad.populate(['creator', 'members.user']);
    req.io.to(`squad_${squad._id}`).emit('member_joined', {
      squadId: squad._id, user: { _id: req.user._id, username: req.user.username }
    });
    res.json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/leaderboard', auth, async (req, res) => {
  try {
    const squad = await Squad.findById(req.params.id)
      .populate('members.user', 'username photoUrl totalStreakDays badges');
    if (!squad) return res.status(404).json({ error: 'Squad not found' });
    const leaderboard = squad.members
      .filter(m => m.isActive)
      .map(m => ({
        user: m.user, currentStreak: m.currentStreak,
        longestStreak: m.longestStreak, totalCheckins: m.totalCheckins,
        lastCheckin: m.lastCheckin,
        isOnStreak: m.lastCheckin && (new Date() - new Date(m.lastCheckin)) < 48 * 60 * 60 * 1000
      }))
      .sort((a, b) => b.currentStreak - a.currentStreak);
    res.json(leaderboard);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

// POST /api/squads/:id/leave — soft leave (keep data, set isActive=false)
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const squad = await Squad.findById(req.params.id);
    if (!squad) return res.status(404).json({ error: 'Squad not found' });

    const memberIdx = squad.members.findIndex(m => m.user.toString() === req.user._id.toString());
    if (memberIdx === -1) return res.status(400).json({ error: 'Not a member' });

    // Prevent creator from leaving (they must delete instead)
    if (squad.creator.toString() === req.user._id.toString())
      return res.status(400).json({ error: 'As the creator, you cannot leave. You can delete the squad instead.' });

    // Soft delete — preserve streak data
    squad.members[memberIdx].isActive = false;
    await squad.save();

    // Remove from user's squads array
    await User.findByIdAndUpdate(req.user._id, { $pull: { squads: squad._id } });

    req.io.to(`squad_${squad._id}`).emit('member_left', {
      squadId: squad._id, userId: req.user._id, username: req.user.username
    });
    res.json({ message: 'Left squad successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/squads/:id — creator only, deletes squad entirely
router.delete('/:id', auth, async (req, res) => {
  try {
    const squad = await Squad.findById(req.params.id);
    if (!squad) return res.status(404).json({ error: 'Squad not found' });

    if (squad.creator.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only the squad creator can delete it' });

    // Remove squad from all members' squads arrays
    const memberIds = squad.members.map(m => m.user);
    await User.updateMany({ _id: { $in: memberIds } }, { $pull: { squads: squad._id } });

    await squad.deleteOne();

    req.io.emit('squad_deleted', { squadId: req.params.id });
    res.json({ message: 'Squad deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/squads/join/:inviteCode — if previously member, restore isActive
// (override the existing join route to handle rejoin)
