const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.MAIL_PORT || '587'),
  secure: process.env.MAIL_PORT === '465',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendOtpEmail = async (to, code) => {
  const html = `
    <div style="font-family:'Helvetica Neue',sans-serif;max-width:480px;margin:0 auto;background:#0e0e10;color:#f0eff4;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#ff5e1a,#ff8c42);padding:32px 40px 24px;">
        <div style="font-size:24px;font-weight:800;letter-spacing:-1px;">StreakSquad</div>
        <div style="font-size:14px;opacity:0.85;margin-top:4px;">Email Verification</div>
      </div>
      <div style="padding:32px 40px;">
        <p style="font-size:15px;color:#a0a0b0;margin:0 0 24px;">Use this code to verify your email. It expires in <strong style="color:#f0eff4;">10 minutes</strong>.</p>
        <div style="background:#1a1a1e;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
          <div style="font-size:42px;font-weight:800;letter-spacing:10px;color:#ff5e1a;font-family:monospace;">${code}</div>
        </div>
        <p style="font-size:12px;color:#5a5a72;margin:0;">If you did not request this, ignore this email. Never share this code.</p>
      </div>
    </div>
  `;
  await transporter.sendMail({
    from:    process.env.MAIL_FROM || `StreakSquad <${process.env.MAIL_USER}>`,
    to,
    subject: `${code} is your StreakSquad verification code`,
    html,
    text: `Your StreakSquad code: ${code}\n\nExpires in 10 minutes.`,
  });
};

module.exports = { sendOtpEmail };
