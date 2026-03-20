const https = require('https');

const sendOtpEmail = async (to, code) => {
  const data = JSON.stringify({
    sender: { name: 'StreakSquad', email: process.env.MAIL_USER },
    to: [{ email: to }],
    subject: `${code} is your StreakSquad verification code`,
    htmlContent: `<div style="font-family:sans-serif;padding:32px;background:#0e0e10;color:#f0eff4;border-radius:12px;">
      <h2 style="color:#ff5e1a;">StreakSquad</h2>
      <p>Your verification code:</p>
      <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#ff5e1a;padding:20px 0;">${code}</div>
      <p style="color:#a0a0b0;font-size:12px;">Expires in 10 minutes. Do not share this.</p>
    </div>`,
    textContent: `Your StreakSquad code: ${code}. Expires in 10 minutes.`
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(body);
        else reject(new Error(`Brevo error: ${res.statusCode} ${body}`));
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

module.exports = { sendOtpEmail };