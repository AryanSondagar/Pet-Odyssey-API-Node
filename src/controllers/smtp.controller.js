const nodemailer = require('nodemailer');
require('dotenv').config();

const host = process.env.EMAIL_HOST === 'localhost' ? '127.0.0.1' : (process.env.EMAIL_HOST || null);
const port = parseInt(process.env.EMAIL_PORT) || 587;
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

if (!host || !user || !pass) {
  console.log('⚠️ SMTP Warning: host:', !!host, 'user:', !!user, 'pass:', !!pass ? 'set' : 'missing');
  console.log('Use .env.sample for config');
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: false,
  tls: {
    rejectUnauthorized: false
  },
  logger: true,
  debug: true,
  auth: {
    user,
    pass,
  },
});

// Test transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Error:', error);
  } else {
    console.log('✅ SMTP Server ready');
  }
});

exports.sendEmail = async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ message: 'To and subject required' });
    }

    const mailOptions = {
      from: `"Pet Odyssey" <${user}>`,
      to,
      subject,
      html: html || text,
      text,
    };

    const info = await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Email Error:', error.stack || error);
    const errorMsg = process.env.NODE_ENV !== 'production' ? (error.message + '\\nStack: ' + (error.stack || 'no stack')) : error.message;
    res.status(500).json({ message: 'Failed to send email', error: errorMsg });
  }
};
