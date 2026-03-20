const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

const sendOtpEmail = async (to, code) => {
  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to,
    subject: `${code} is your StreakSquad verification code`,
    text: `Your StreakSquad verification code is: ${code}\n\nExpires in 10 minutes.`,
    html: `<div style="font-family:sans-serif;padding:32px;background:#0e0e10;color:#f0eff4;border-radius:12px;">
      <h2 style="color:#ff5e1a;">StreakSquad</h2>
      <p>Your verification code is:</p>
      <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#ff5e1a;padding:20px 0;">${code}</div>
      <p style="color:#a0a0b0;font-size:12px;">Expires in 10 minutes. Do not share this code.</p>
    </div>`
  });
};

module.exports = { sendOtpEmail };