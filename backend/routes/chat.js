const express = require('express');
const router  = express.Router();
const Message = require('../models/Message');
const Squad   = require('../models/Squad');
const auth    = require('../middleware/auth');

// GET /api/chat/:squadId — fetch last 100 messages
router.get('/:squadId', auth, async (req, res) => {
  try {
    const squad = await Squad.findById(req.params.squadId);
    if (!squad) return res.status(404).json({ error: 'Squad not found' });
    const isMember = squad.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ error: 'Not a member' });

    const messages = await Message.find({ squad: req.params.squadId })
      .populate('user', 'username photoUrl badges')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(messages.reverse()); // oldest first
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/chat/:squadId — send a message (REST fallback; primary is socket)
router.post('/:squadId', auth, async (req, res) => {
  try {
    const { text, type, badge } = req.body;
    if (!text?.trim() && type !== 'badge') return res.status(400).json({ error: 'Message required' });

    const squad = await Squad.findById(req.params.squadId);
    if (!squad) return res.status(404).json({ error: 'Squad not found' });
    const isMember = squad.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ error: 'Not a member' });

    const msg = await Message.create({
      squad: req.params.squadId,
      user:  req.user._id,
      text:  text?.trim() || '',
      type:  type || 'text',
      badge: type === 'badge' ? badge : undefined
    });
    const populated = await msg.populate('user', 'username photoUrl badges');

    req.io.to(`squad_${req.params.squadId}`).emit('new_message', populated);
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
