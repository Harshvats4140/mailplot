const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables
require('dotenv').config();

const app = express();
const os = require('os');
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';
const LOGS_FILE = path.join(os.tmpdir(), 'mailpilot_campaign_logs.json');

// ── SECURITY MIDDLEWARE ────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts in HTML pages
  crossOriginEmbedderPolicy: false
}));

// CORS — restrict to known origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [];
// Always allow same-origin and localhost in development
if (NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
}
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (same-origin, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { success: false, error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
const sendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { success: false, error: 'Send rate limit exceeded. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ── SAFE STATIC FILE SERVING ───────────────────────────────
// Block access to sensitive server-side files
const BLOCKED_FILES = ['.env', '.env.example', 'server.js', 'package.json', 'package-lock.json',
  'alter_table.js', 'create_smtp_table.js', 'find_region.js', 'supabase_schema.sql',
  'campaign_logs.json', 'ip-ranges.json', 'diff.txt', '.gitignore'];
app.use((req, res, next) => {
  const filename = path.basename(req.path);
  if (BLOCKED_FILES.includes(filename) || req.path.startsWith('/.') || req.path.includes('node_modules')) {
    return res.status(403).send('Forbidden');
  }
  next();
});
app.use(express.static(__dirname));

// ── PUBLIC CONFIG ENDPOINT (safe — no secrets) ─────────────
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  });
});

// ── PERSISTENCE ENGINE ─────────────────────────────────────
function getLogs() {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading logs file:', e);
  }
  return [];
}

function saveLogs(logs) {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing logs file:', e);
  }
}

function recordEvent(event) {
  const logs = getLogs();
  logs.push({
    ...event,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2)
  });
  saveLogs(logs);
}

// ── MAILERCLOUD REST HELPER ───────────────────────────────
function sendMailercloudREST(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(payload);

    const options = {
      hostname: 'api.mailercloud.com',
      port: 443,
      path: '/v1/transactional/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'Content-Length': dataString.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const errDetail = parsed.errors || parsed.message || JSON.stringify(parsed);
            reject(new Error(`Mailercloud API Error: ${errDetail}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Mailercloud response: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(dataString);
    req.end();
  });
}

// ── OPEN TRACKING ENDPOINT ─────────────────────────────────
app.get('/track/open', (req, res) => {
  const { email, subject } = req.query;
  if (email) {
    recordEvent({
      type: 'open',
      email: email,
      subject: subject || 'Untitled',
      timestamp: new Date().toISOString(),
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown Client'
    });
    console.log(`[TRACK] Email opened by ${email} (Subject: "${subject}")`);
  }

  // 1x1 Transparent Pixel GIF
  const trackingPixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': trackingPixel.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(trackingPixel);
});

// ── LINK CLICK TRACKING ENDPOINT ───────────────────────────
app.get('/track/click', (req, res) => {
  const { url, email, subject } = req.query;
  if (email && url) {
    recordEvent({
      type: 'click',
      email: email,
      subject: subject || 'Untitled',
      url: url,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown Client'
    });
    console.log(`[TRACK] Link clicked by ${email} -> ${url} (Subject: "${subject}")`);
  }
  if (url) {
    res.redirect(url);
  } else {
    res.status(404).send('Click tracking redirect URL not specified.');
  }
});

// ── STATS ENDPOINT ─────────────────────────────────────────
app.get('/stats', requireAuth, (req, res) => {
  const logs = getLogs();

  const sends = logs.filter(l => l.type === 'sent');
  const opens = logs.filter(l => l.type === 'open');
  const clicks = logs.filter(l => l.type === 'click');

  const totalSent = sends.length;
  const totalOpens = opens.length;
  const totalClicks = clicks.length;

  const uniqueOpenEmails = new Set(opens.map(o => o.email.toLowerCase()));
  const uniqueOpens = uniqueOpenEmails.size;

  res.status(200).json({
    success: true,
    summary: {
      totalSent,
      totalOpens,
      uniqueOpens,
      totalClicks,
      openRate: totalSent > 0 ? Math.round((uniqueOpens / totalSent) * 100) : 0
    },
    logs: logs.slice().reverse() // Newest logs first
  });
});

// ── CLEAR STATS ENDPOINT ───────────────────────────────────
app.post('/clear-stats', requireAuth, (req, res) => {
  saveLogs([]);
  res.status(200).json({ success: true, message: 'All statistics cleared.' });
});

// ── SEND ROUTE (INJECTS TRACKING PIXEL & WRAPS LINKS) ──────
app.post('/send', requireAuth, async (req, res) => {
  const { host, port, user, pass, fromName, fromEmail, to, subject, html, trackingBaseUrl, campaignId, table = 'users' } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, error: 'Missing parameters or recipient details.' });
  }

  let hostVal = host;
  let portVal = port;
  let userVal = user;
  let passVal = pass;
  let fromNameVal = fromName;
  let fromEmailVal = fromEmail;

  // 1. Fetch user's global settings as fallback
  let globalSmtp = {};
  try {
    const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(req.user.id)}&select=custom`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    if (userRes.ok) {
      const users = await userRes.json();
      if (users && users.length > 0 && users[0].custom && users[0].custom.settings) {
        const settings = users[0].custom.settings;
        globalSmtp = {
          host: settings.smtpHost,
          port: settings.smtpPort,
          user: settings.smtpUser,
          pass: settings.smtpPass ? decrypt(settings.smtpPass) : '',
          fromName: settings.fromName,
          fromEmail: settings.fromEmail
        };
      }
    }
  } catch (err) {
    console.error('Error fetching global SMTP settings:', err);
  }

  // 2. Fetch campaign settings if campaignId is provided
  let campaignSmtp = {};
  if (campaignId) {
    try {
      const campResponse = await fetch(`${SUPABASE_URL}/rest/v1/campaigns?id=eq.${encodeURIComponent(campaignId)}&select=*`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      if (campResponse.ok) {
        const campaigns = await campResponse.json();
        if (campaigns && campaigns.length > 0) {
          const campaign = campaigns[0];
          campaignSmtp = {
            host: campaign.smtp_host,
            port: campaign.smtp_port,
            user: campaign.smtp_user,
            pass: campaign.smtp_pass ? decrypt(campaign.smtp_pass) : '',
            fromName: campaign.smtp_from_name,
            fromEmail: campaign.smtp_from_email
          };
        }
      }
    } catch (err) {
      console.error('Error fetching campaign SMTP settings from database:', err);
    }
  }

  // Determine final credentials to use
  if (campaignSmtp.pass && campaignSmtp.pass !== '••••••••') {
    passVal = campaignSmtp.pass;
    hostVal = campaignSmtp.host || hostVal;
    portVal = campaignSmtp.port || portVal;
    userVal = campaignSmtp.user || userVal;
    fromNameVal = campaignSmtp.fromName || fromNameVal;
    fromEmailVal = campaignSmtp.fromEmail || fromEmailVal;
  } else if (globalSmtp.pass) {
    passVal = globalSmtp.pass;
    hostVal = globalSmtp.host || hostVal;
    portVal = globalSmtp.port || portVal;
    userVal = globalSmtp.user || userVal;
    fromNameVal = globalSmtp.fromName || fromNameVal;
    fromEmailVal = globalSmtp.fromEmail || fromEmailVal;
  }

  // If client-provided password is valid and NOT masked, use it (override)
  if (pass && pass !== '••••••••') {
    passVal = pass;
    hostVal = host || hostVal;
    portVal = port || portVal;
    userVal = user || userVal;
    fromNameVal = fromName || fromNameVal;
    fromEmailVal = fromEmail || fromEmailVal;
  }

  // Decrypt if passVal is encrypted
  if (passVal && passVal.startsWith('enc:')) {
    passVal = decrypt(passVal);
  }

  if (!passVal || passVal === '••••••••') {
    return res.status(400).json({ success: false, error: 'Missing SMTP password. Ensure credentials are set on campaign or global settings.' });
  }

  // Server-side audience filter enforcement
  if (campaignId) {
    try {
      const campResponse = await fetch(`${SUPABASE_URL}/rest/v1/campaigns?id=eq.${encodeURIComponent(campaignId)}&select=*`, {
        headers: getSupabaseHeaders(req)
      });
      if (campResponse.ok) {
        const campaigns = await campResponse.json();
        if (campaigns && campaigns.length > 0) {
          const campaign = campaigns[0];
          const filter = campaign.audience_filter || 'all';
          const group = campaign.audience_group || '';
          
          if (filter === 'group') {
            const memberResponse = await fetch(`${SUPABASE_URL}/rest/v1/${table}?email=eq.${encodeURIComponent(to)}&select=*`, {
              headers: getSupabaseHeaders(req)
            });
            if (memberResponse.ok) {
              const members = await memberResponse.json();
              if (members && members.length > 0) {
                const m = members[0];
                if (m.group !== group) {
                  return res.status(400).json({ success: false, error: `Recipient ${to} is not in the campaign's target audience group: ${group}` });
                }
              } else {
                return res.status(400).json({ success: false, error: `Recipient ${to} not found in database and campaign group filter is active.` });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error enforcing server-side campaign filtering:', err);
    }
  }

  // Use provided public tracking URL, environment variable, request host, or fall back to localhost
  const determinedHost = req.get('host') ? `${req.protocol}://${req.get('host')}` : '';
  const baseUrl = (trackingBaseUrl || process.env.TRACKING_BASE_URL || determinedHost || 'http://localhost:3000').replace(/\/$/, '');

  // Inject 1×1 invisible tracking pixel to detect email opens
  const trackingPixelUrl = `${baseUrl}/track/open?email=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&t=${Date.now()}`;
  const trackingPixelTag = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;width:1px;height:1px;" alt="" />`;

  // Inject pixel just before </body> (or append) — links are NOT wrapped so they work on all devices
  let trackedHtml = html;
  if (html.includes('</body>')) {
    trackedHtml = html.replace('</body>', `${trackingPixelTag}</body>`);
  } else {
    trackedHtml = html + trackingPixelTag;
  }

  // 1. Check for Mailercloud API Key (starts with uFUEB-)
  if (passVal.startsWith('uFUEB-')) {
    try {
      const payload = {
        from: fromEmailVal || userVal,
        from_name: fromNameVal || 'MailPilot Studio',
        sender_email: fromEmailVal || userVal,
        sender_id: fromEmailVal || userVal,
        to: to,
        email: to,
        subject: subject,
        body: trackedHtml,
        html: trackedHtml
      };
      console.log(`Attempting Mailercloud REST API dispatch to ${to}...`);
      const info = await sendMailercloudREST(passVal, payload);
      console.log(`Email successfully sent to ${to} via Mailercloud REST API:`, info);

      recordEvent({ type: 'sent', email: to, subject, timestamp: new Date().toISOString() });
      return res.status(200).json({ success: true, messageId: info.message_id || 'Mailercloud-REST-API' });
    } catch (error) {
      console.warn(`Mailercloud REST API failed (${error.message}), falling back to Mailercloud SMTP relay...`);

      const mailercloudHost = 'smtp.mailercloud.com';
      const mailercloudPort = 587;

      try {
        const transporter = nodemailer.createTransport({
          host: mailercloudHost,
          port: mailercloudPort,
          secure: false,
          auth: {
            user: userVal,
            pass: passVal
          }
        });

        const info = await transporter.sendMail({
          from: `"${fromNameVal || 'MailPilot Studio'}" <${fromEmailVal || userVal}>`,
          to: to,
          subject: subject,
          html: trackedHtml
        });

        console.log(`Email successfully sent to ${to} via Mailercloud SMTP fallback: ${info.messageId}`);
        recordEvent({ type: 'sent', email: to, subject, timestamp: new Date().toISOString() });
        return res.status(200).json({ success: true, messageId: info.messageId });
      } catch (smtpError) {
        console.error(`Mailercloud SMTP fallback also failed:`, smtpError.message);
        return res.status(500).json({
          success: false,
          error: `Mailercloud API & SMTP fallback both failed. SMTP Error: ${smtpError.message}`,
          code: smtpError.code,
          command: smtpError.command,
          responseCode: smtpError.responseCode
        });
      }
    }
  }

  // 2. Fallback to standard SMTP connection
  if (!hostVal || !userVal) {
    return res.status(400).json({ success: false, error: 'Missing host or username parameters for standard SMTP.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: hostVal,
      port: parseInt(portVal) || 587,
      secure: parseInt(portVal) === 465,
      auth: {
        user: userVal,
        pass: passVal
      }
    });

    const info = await transporter.sendMail({
      from: `"${fromNameVal || 'MailPilot Studio'}" <${fromEmailVal || userVal}>`,
      to: to,
      subject: subject,
      html: trackedHtml
    });

    console.log(`Email successfully sent to ${to}: ${info.messageId}`);
    recordEvent({ type: 'sent', email: to, subject, timestamp: new Date().toISOString() });
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode
    });
  }
});



// ── SUPABASE REST PROXY ENDPOINTS ──────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing Supabase environment variables. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.');
}

// ── SYMMETRIC ENCRYPTION HELPERS FOR SMTP CREDENTIALS ──────
function encrypt(text) {
  if (!text) return '';
  try {
    const key = crypto.createHash('sha256').update(SUPABASE_SERVICE_ROLE_KEY).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return 'enc:' + iv.toString('hex') + ':' + encrypted;
  } catch (err) {
    console.error('Encryption failed:', err);
    return '';
  }
}

function decrypt(text) {
  if (!text || !text.startsWith('enc:')) return text;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const key = crypto.createHash('sha256').update(SUPABASE_SERVICE_ROLE_KEY).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    return '';
  }
}

// ── AUTHENTICATION ENGINE (SUPABASE JWT VERIFICATION) ──────
async function authenticateUser(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': authHeader
      }
    });
    if (!response.ok) return null;
    const userData = await response.json();
    return userData;
  } catch (e) {
    console.error('Error authenticating user:', e);
    return null;
  }
}

async function requireAuth(req, res, next) {
  const user = await authenticateUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Valid authentication session required.' });
  }
  req.user = user;
  next();
}

function getSupabaseHeaders(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader) {
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': authHeader
    };
  }
  return {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  };
}

async function isAdminUser(req) {
  if (!req.user || !req.user.email) return false;
  const email = req.user.email.toLowerCase();
  const ADMIN_EMAILS = ['harsh@ascentcircle.in', 'ascentcircle.community@gmail.com', 'admin@mailpilot.app'];
  if (ADMIN_EMAILS.includes(email)) return true;
  
  try {
    const usersResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=role`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    if (usersResponse.ok) {
      const dbUsers = await usersResponse.json();
      if (dbUsers && dbUsers.length > 0 && dbUsers[0].role === 'admin') {
        return true;
      }
    }
  } catch (e) {
    console.error('Error checking admin status in DB:', e.message);
  }
  return false;
}

async function insertAuditLog(req, actionType, details) {
  try {
    const user = req.user;
    if (!user) return;
    let userName = user.email.split('@')[0];
    let userRole = 'user';
    const usersResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(user.email)}&select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      if (users && users.length > 0) {
        userName = users[0].name || userName;
        userRole = users[0].role || userRole;
      }
    }

    const payload = {
      userId: user.id,
      userName: userName,
      userRole: userRole,
      actionType: actionType || 'info',
      details: details || '',
      timestamp: new Date().toISOString()
    };

    await fetch(`${SUPABASE_URL}/rest/v1/auditLogs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error('Error inserting audit log:', e.message);
  }
}

app.get('/api/members', requireAuth, async (req, res) => {
  try {
    const table = req.query.table || 'users';
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: getSupabaseHeaders(req)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supabase REST error response: ${errorText}`);
      throw new Error(`Supabase REST error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    let data = await response.json();
    
    // Soft-delete filtering for non-admin users
    if (table === 'users') {
      const isAdmin = await isAdminUser(req);
      if (!isAdmin) {
        data = data.filter(m => !m.is_deleted);
      }
    }
    
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching members from Supabase:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/members', requireAuth, async (req, res) => {
  try {
    const table = req.query.table || 'users';
    const members = Array.isArray(req.body) ? req.body : [req.body];
    const payload = members.map(m => {
      const memberId = m.id || 'usr_' + Math.random().toString(36).substring(2, 11);
      return {
        id: memberId,
        name: m.name || m.email.split('@')[0],
        email: m.email,
        college: m.college || null,
        phone: m.phone || null,
        role: m.group === 'Admin' ? 'admin' : 'user',
        group: m.group || 'General',
        custom: m.custom || null,
        is_deleted: m.is_deleted || false
      };
    });

    const headers = {
      ...getSupabaseHeaders(req),
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=email`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase upsert error: ${errText}`);
    }

    const isAdmin = await isAdminUser(req);
    await insertAuditLog(req, 'member_upsert', `${isAdmin ? 'Admin' : 'User'} upserted/saved ${payload.length} member(s).`);

    res.json({ success: true, count: payload.length });
  } catch (err) {
    console.error('Error upserting members to Supabase:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/members/:idOrEmail', requireAuth, async (req, res) => {
  try {
    const table = req.query.table || 'users';
    const { idOrEmail } = req.params;
    const isAdmin = await isAdminUser(req);
    const hardDelete = req.query.hard === 'true';

    let queryParam = '';
    if (idOrEmail.includes('@')) {
      queryParam = `email=eq.${encodeURIComponent(idOrEmail)}`;
    } else {
      queryParam = `id=eq.${encodeURIComponent(idOrEmail)}`;
    }

    if (table === 'users') {
      if (hardDelete) {
        if (!isAdmin) {
          return res.status(403).json({ success: false, error: 'Access denied. Administrator privileges required for permanent deletion.' });
        }
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${queryParam}`, {
          method: 'DELETE',
          headers: getSupabaseHeaders(req)
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Supabase hard delete error: ${errText}`);
        }

        await insertAuditLog(req, 'member_hard_delete', `Admin permanently deleted member: ${idOrEmail}`);
        return res.json({ success: true, message: `Member ${idOrEmail} permanently deleted from database.` });
      } else {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${queryParam}`, {
          method: 'PATCH',
          headers: {
            ...getSupabaseHeaders(req),
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ is_deleted: true })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Supabase soft delete error: ${errText}`);
        }

        await insertAuditLog(req, 'member_soft_delete', `${isAdmin ? 'Admin' : 'User'} soft-deleted member: ${idOrEmail}`);
        return res.json({ success: true, message: `Member ${idOrEmail} soft-deleted.` });
      }
    } else {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${queryParam}`, {
        method: 'DELETE',
        headers: getSupabaseHeaders(req)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Supabase delete error: ${errText}`);
      }

      await insertAuditLog(req, 'delete', `Deleted row from ${table}: ${idOrEmail}`);
      return res.json({ success: true, message: `Row ${idOrEmail} deleted from ${table}.` });
    }
  } catch (err) {
    console.error('Error deleting member from Supabase:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SECURE AUDIT LOGS ENDPOINTS ──────────────────────────────
app.get('/api/logs', requireAuth, async (req, res) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/auditLogs?select=*&order=timestamp.desc&limit=100`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase select auditLogs error: ${errText}`);
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching audit logs from Supabase:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/logs', requireAuth, async (req, res) => {
  try {
    const { actionType, details } = req.body;
    const user = req.user; // populated by requireAuth
    
    // Find matching user details in the users database
    let userName = user.email.split('@')[0];
    let userRole = 'user';
    const usersResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      const matched = users.find(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
      if (matched) {
        userName = matched.name || userName;
        userRole = matched.role || userRole;
      }
    }

    const payload = {
      userId: user.id,
      userName: userName,
      userRole: userRole,
      actionType: actionType || 'info',
      details: details || '',
      timestamp: new Date().toISOString()
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/auditLogs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase insert auditLogs error: ${errText}`);
    }

    const data = await response.json();
    res.json({ success: true, data: data[0] });
  } catch (err) {
    console.error('Error inserting audit log to Supabase:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SECURE CAMPAIGNS ENDPOINTS ──────────────────────────────
app.get('/api/campaigns', requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const isAdmin = await isAdminUser(req);
    const getAll = req.query.all === 'true' && isAdmin;
    
    const headers = getAll ? {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    } : getSupabaseHeaders(req);
    
    let url = `${SUPABASE_URL}/rest/v1/campaigns?select=*&order=created_at.desc`;
    if (!getAll) {
      url += `&user_id=eq.${encodeURIComponent(user_id)}`;
    }
    
    const response = await fetch(url, {
      headers: headers
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supabase REST campaigns error response: ${errorText}`);
      throw new Error(`Supabase REST error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    
    // Mask passwords before sending to client
    if (Array.isArray(data)) {
      data.forEach(c => {
        if (c.smtp_pass) c.smtp_pass = '••••••••';
      });
    }
    
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching campaigns from Supabase:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/campaigns', requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const campaigns = Array.isArray(req.body) ? req.body : [req.body];
    
    // Fetch existing campaigns for this user to check for password persistence
    let existingCamps = [];
    try {
      const getRes = await fetch(`${SUPABASE_URL}/rest/v1/campaigns?user_id=eq.${encodeURIComponent(user_id)}`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      if (getRes.ok) {
        existingCamps = await getRes.json();
      }
    } catch (e) {
      console.error('Failed to fetch existing campaigns for update check:', e);
    }

    const payload = campaigns.map(c => {
      const id = c.id || 'camp_' + Math.random().toString(36).substring(2, 11);
      const existing = existingCamps.find(ex => ex.id === id);
      
      let passVal = c.smtp_pass;
      if (passVal === '••••••••' && existing) {
        passVal = existing.smtp_pass;
      } else if (passVal && passVal !== '••••••••') {
        passVal = encrypt(passVal);
      } else {
        passVal = passVal || '';
      }

      return {
        id: id,
        user_id: user_id,
        name: c.name || 'Untitled Campaign',
        subject: c.subject || '',
        title: c.title || '',
        greeting: c.greeting || '',
        body: c.body || '',
        btn_text: c.btn_text || '',
        btn_url: c.btn_url || '',
        signature: c.signature || '',
        footer: c.footer || '',
        org_name: c.org_name || '',
        org_url: c.org_url || '',
        banner: c.banner || 'none',
        banner_url: c.banner_url || '',
        show_event_details: c.show_event_details || false,
        event_date: c.event_date || '',
        event_time: c.event_time || '',
        event_location: c.event_location || '',
        event_agenda: c.event_agenda || '',
        btn_color: c.btn_color || '#1f6feb',
        accent_color: c.accent_color || '#1f6feb',
        bg_color: c.bg_color || '#ffffff',
        font_family: c.font_family || 'Arial, sans-serif',
        email_width: c.email_width || 600,
        custom_html: c.custom_html || '',
        template: c.template || 'event',
        code_edited: c.code_edited || false,
        smtp_host: c.smtp_host || '',
        smtp_port: c.smtp_port || '',
        smtp_secure: c.smtp_secure || '',
        smtp_from_name: c.smtp_from_name || '',
        smtp_from_email: c.smtp_from_email || '',
        smtp_user: c.smtp_user || '',
        smtp_pass: passVal,
        smtp_delay: c.smtp_delay || '300',
        smtp_batch_size: c.smtp_batch_size || '50',
        smtp_batch_pause: c.smtp_batch_pause || '10',
        audience_filter: c.audience_filter || 'all',
        audience_group: c.audience_group || '',
        audience_selected_ids: c.audience_selected_ids || [],
        status: c.status || 'draft',
        progress_index: c.progress_index || 0,
        total_members: c.total_members || 0,
        sent_count: c.sent_count || 0,
        failed_count: c.failed_count || 0,
        updated_at: new Date().toISOString()
      };
    });

    const headers = {
      ...getSupabaseHeaders(req),
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/campaigns`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase campaigns upsert error: ${errText}`);
    }

    res.json({ success: true, count: payload.length, data: payload });
  } catch (err) {
    console.error('Error saving campaign to Supabase:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/campaigns/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/campaigns?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user_id)}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders(req)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase campaign delete error: ${errText}`);
    }

    res.json({ success: true, message: `Campaign ${id} deleted.` });
  } catch (err) {
    console.error('Error deleting campaign from Supabase:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SECURE SETTINGS ENDPOINTS ───────────────────────────────
app.get('/api/settings', requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(user_id)}&select=custom`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    if (!response.ok) {
      throw new Error(`Supabase returned status ${response.status}`);
    }
    const data = await response.json();
    let settings = {};
    if (data && data.length > 0 && data[0].custom) {
      settings = data[0].custom.settings || {};
    }
    
    // Mask password if present
    if (settings.smtpPass) {
      settings.smtpPass = '••••••••';
    }
    
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Error fetching settings:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const newSettings = req.body.settings || {};
    
    // 1. Fetch existing settings from custom field
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(user_id)}&select=custom`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    let existingCustom = {};
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0 && data[0].custom) {
        existingCustom = data[0].custom;
      }
    }
    
    const existingSettings = existingCustom.settings || {};
    
    // 2. Determine password value (encrypt if changed, keep if masked)
    let passVal = newSettings.smtpPass;
    if (passVal === '••••••••') {
      passVal = existingSettings.smtpPass || '';
    } else if (passVal && passVal !== '••••••••') {
      passVal = encrypt(passVal);
    } else {
      passVal = '';
    }
    
    // 3. Construct updated custom field
    const updatedSettings = {
      ...newSettings,
      smtpPass: passVal
    };
    
    const updatedCustom = {
      ...existingCustom,
      settings: updatedSettings
    };
    
    // 4. Save to Supabase users table
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(user_id)}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ custom: updatedCustom })
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Supabase update failed: ${errorText}`);
    }
    
    // Return settings with password masked
    const returnSettings = { ...updatedSettings };
    if (returnSettings.smtpPass) {
      returnSettings.smtpPass = '••••••••';
    }
    
    res.json({ success: true, settings: returnSettings });
  } catch (err) {
    console.error('Error saving settings:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings/test', requireAuth, async (req, res) => {
  try {
    const { host, port, user, pass, secure } = req.body;
    let decryptedPass = pass;
    if (pass === '••••••••') {
      const user_id = req.user.id;
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(user_id)}&select=custom`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0 && data[0].custom && data[0].custom.settings) {
          decryptedPass = decrypt(data[0].custom.settings.smtpPass);
        }
      }
    }
    
    if (!host || !user || !decryptedPass) {
      return res.status(400).json({ success: false, error: 'Missing SMTP credentials' });
    }
    
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port) || 587,
      secure: secure === 'ssl',
      auth: {
        user,
        pass: decryptedPass
      }
    });
    
    transporter.verify((error, success) => {
      if (error) {
        console.error('SMTP test failed:', error);
        res.json({ success: false, error: error.message });
      } else {
        res.json({ success: true });
      }
    });
  } catch (err) {
    console.error('SMTP test route error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── STARTUP VALIDATION ─────────────────────────────────────
const REQUIRED_ENVS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = REQUIRED_ENVS.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Copy .env.example to .env and fill in your values.');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`✅ MailPilot SMTP Secure Relay running on http://localhost:${PORT}`);
  console.log(`   Environment: ${NODE_ENV}`);
});
