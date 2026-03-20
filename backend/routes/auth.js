const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const auth     = require('../middleware/auth');
const { sendOtpEmail } = require('../utils/mailer');


const JWT_SECRET = process.env.JWT_SECRET || 'streaksquad_secret_key';
const makeToken  = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

const otpStore   = new Map();
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const code      = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore.set(email.toLowerCase(), { code, expiresAt, verified: false });

    try {
      await sendOtpEmail(email, code);
      console.log(`OTP sent to ${email}: ${code}`);
      res.json({ message: 'OTP sent to your email' });
    } catch (mailErr) {
      console.error('Mail error:', mailErr.message);
      // Fall back to dev mode if mail not configured
      res.json({ message: 'OTP sent', devCode: code, warning: 'Email failed — using dev fallback' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
    const entry = otpStore.get(email.toLowerCase());
    if (!entry)                       return res.status(400).json({ error: 'No OTP found for this email' });
    if (Date.now() > entry.expiresAt) return res.status(400).json({ error: 'OTP expired. Request a new one.' });
    if (entry.code !== String(code))  return res.status(400).json({ error: 'Incorrect code' });
    entry.verified = true;
    otpStore.set(email.toLowerCase(), entry);
    res.json({ message: 'Email verified' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, timezone } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });
    const entry = otpStore.get(email.toLowerCase());
    if (!entry || !entry.verified)
      return res.status(400).json({ error: 'Email not verified. Complete OTP step first.' });
    const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (exists) return res.status(400).json({ error: 'Username or email already taken' });
    const user = await User.create({ username, email: email.toLowerCase(), password, photoUrl: '', timezone: timezone || 'UTC' });
    otpStore.delete(email.toLowerCase());
    res.status(201).json({ token: makeToken(user._id), user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login  — accepts email OR username
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ error: 'Login and password required' });
    // Check if it looks like an email
    const isEmail = login.includes('@');
    const user = await User.findOne(
      isEmail ? { email: login.toLowerCase() } : { username: login }
    ).populate('squads', 'name icon goal');
    if (!user || !(await user.comparePassword(password)))
      return res.status(400).json({ error: 'Invalid credentials' });
    res.json({ token: makeToken(user._id), user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('squads', 'name icon goal category goalType goalUnit goalTarget members');
  res.json(user.toPublic());
});

module.exports = router;
