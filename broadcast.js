/* ══════════════════════════════════════════════════════════
   MAILPILOT — Broadcast Logic
   ══════════════════════════════════════════════════════════ */

// Hardened security: Removed local plaintext credentials. All SMTP details managed server-side.

let broadcastTimer = null;
// Tracks IDs of members successfully delivered to in the current broadcast run
let sentMemberIds = [];

function saveSMTPConfigs() {
  try {
    const metaStr = localStorage.getItem('mf_composer_meta') || '{}';
    const meta = JSON.parse(metaStr);
    
    // Do NOT write sensitive SMTP credentials to client-side localStorage!
    meta.audienceFilter = STATE.broadcastAudience || 'all';
    meta.audienceGroup = STATE.broadcastGroup || '';

    localStorage.setItem('mf_composer_meta', JSON.stringify(meta));

    if (STATE.activeCampaign) {
      mapMetaToCampaign(meta, STATE.activeCampaign);
      saveCampaign(STATE.activeCampaign);
    }
  } catch (e) {
    console.error("Error saving configs: ", e);
  }
}

async function loadSMTPConfigs() {
  load(); // call shared load
  
  // Clean up legacy local credentials from storage
  localStorage.removeItem('mf_smtp_pass');
  localStorage.removeItem('mf_smtp_user');

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${window.API_BASE_URL}/api/settings`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        if (document.getElementById('smtp-from-email')) document.getElementById('smtp-from-email').value = s.fromEmail || '';
        if (document.getElementById('smtp-from-name')) document.getElementById('smtp-from-name').value = s.fromName || '';
        if (document.getElementById('smtp-host')) document.getElementById('smtp-host').value = s.smtpHost || '';
        if (document.getElementById('smtp-port')) document.getElementById('smtp-port').value = s.smtpPort || '587';
        if (document.getElementById('smtp-secure')) document.getElementById('smtp-secure').value = s.smtpEncryption || 'tls';
        if (document.getElementById('smtp-user')) document.getElementById('smtp-user').value = s.smtpUser || '';
        if (document.getElementById('smtp-pass')) document.getElementById('smtp-pass').value = s.smtpPass || '';
        if (document.getElementById('smtp-delay')) document.getElementById('smtp-delay').value = s.sendDelay || '300';
        if (document.getElementById('smtp-batch-size')) document.getElementById('smtp-batch-size').value = s.batchSize || '50';
        if (document.getElementById('smtp-batch-pause')) document.getElementById('smtp-batch-pause').value = s.batchPause || '10';
      }
    }
  } catch (e) {
    console.error("Error loading SMTP settings from server: ", e);
  }
}

function buildEmailHTML(member) {
  const meta = JSON.parse(localStorage.getItem('mf_composer_meta') || '{}');
  if (meta.codeEdited && meta.customHtml) {
    return mergeTags(meta.customHtml, member);
  }

  const v = (key, fallback = '') => meta[key] !== undefined ? meta[key] : fallback;
  const bannerSel = v('banner', 'none');
  const banner = bannerSel === 'custom' ? v('bannerUrl') : bannerSel;
  const hasBanner = banner && banner !== 'none';

  const subject = mergeTags(v('subject'), member);
  const greeting = mergeTags(v('greeting'), member);
  const body = mergeTags(v('body'), member).replace(/\n/g, '<br>');
  const title = mergeTags(v('title'), member);
  const btnText = mergeTags(v('btnText'), member);
  const btnUrl = mergeTags(v('btnUrl'), member);
  const sig = mergeTags(v('signature'), member);
  const footer = mergeTags(v('footer'), member);
  const orgName = mergeTags(v('orgName'), member) || 'MailPilot Studio';
  const orgUrl = mergeTags(v('orgUrl'), member) || '#';

  const showEvent = !!v('showEventDetails', false);
  const eDate = v('eventDate');
  const eTime = v('eventTime');
  const eLoc = v('eventLoc');
  const eAgenda = v('eventAgenda', '');
  const agendaItems = eAgenda.split('\n').filter(x => x.trim()).map(a =>
    `<tr><td style="padding:5px 0;color:#555;font-size:14px;border-bottom:1px solid #f0f0f0">• ${esc(a.trim())}</td></tr>`
  ).join('');

  const bg = v('bgColor', '#ffffff');
  const btn = v('btnColor', '#1f6feb');
  const accent = v('accentColor', '#1f6feb');
  const font = v('fontFamily', 'Arial, sans-serif');
  const width = v('emailWidth', 600);
  const isDark = bg === '#0d1117';
  const textMain = isDark ? '#e6edf3' : '#1a1a2e';
  const textSub = isDark ? '#8b949e' : '#555';
  const cardBg = isDark ? '#161b22' : '#f8f9fc';
  const borderC = isDark ? '#30363d' : '#e8ecf0';

  const styleClose = '</' + 'style>';
  const msoStyle = `<!--[if mso]><style>body,table,td,p,a{font-family:${esc(font)}!important}${styleClose}<![endif]-->`;

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${esc(subject)}</title>`,
    msoStyle,
    '</' + 'head>',
    `<body style="margin:0;padding:0;background:#e8ecf0;font-family:${esc(font)}">`,
    `<div style="display:none;font-size:1px;color:#e8ecf0;max-height:0;overflow:hidden">${esc(footer)}</div>`,
    `<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8ecf0;padding:20px 0">`,
    '<tr><td align="center">',
    `<table width="${width}" cellpadding="0" cellspacing="0" style="max-width:${width}px;width:100%;background:${bg};border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)">`,
    `<tr><td style="background:linear-gradient(90deg,${accent},${btn});height:4px;line-height:4px;font-size:4px">&nbsp;</td></tr>`,
    hasBanner ? `<tr><td style="padding:0;line-height:0"><img src="${esc(banner)}" width="${width}" alt="Banner" style="display:block;width:100%;max-height:240px;object-fit:cover"></td></tr>` : '',
    `<tr><td style="padding:36px 40px 28px;background:${bg}">`,
    `<h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:${textMain};line-height:1.2">${esc(title)}</h1>`,
    `<p style="margin:0 0 14px;font-size:16px;color:${textMain};font-weight:600">${esc(greeting)}</p>`,
    `<p style="margin:0 0 24px;font-size:15px;color:${textSub};line-height:1.7">${body}</p>`,
    showEvent && (eDate || eLoc || eTime) ? [
      `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:${cardBg};border-radius:8px;border:1px solid ${borderC}">`,
      `<tr><td style="padding:18px 20px">`,
      `<p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${accent}">Event Details</p>`,
      eDate ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px"><tr><td width="24" style="vertical-align:top;padding-top:2px"><span style="color:${accent};font-size:15px">&#128197;</span></td><td style="font-size:14px;color:${textMain};font-weight:600">${esc(eDate)}${eTime ? ` &nbsp;&middot;&nbsp; <span style="font-weight:400;color:${textSub}">${esc(eTime)}</span>` : ''}</td></tr></table>` : '',
      eLoc ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px"><tr><td width="24" style="vertical-align:top;padding-top:2px"><span style="color:${accent};font-size:15px">&#128205;</span></td><td style="font-size:14px;color:${textMain}">${esc(eLoc)}</td></tr></table>` : '',
      agendaItems ? `<p style="margin:12px 0 6px;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:${textSub}">Agenda</p><table width="100%" cellpadding="0" cellspacing="0">${agendaItems}</table>` : '',
      '</td></tr></table>',
    ].join('') : '',
    btnUrl ? [
      `<table cellpadding="0" cellspacing="0" style="margin-bottom:28px">`,
      `<tr><td style="border-radius:8px;background:${btn}">`,
      `<a href="${esc(btnUrl)}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.02em">${esc(btnText)}</a>`,
      `</td></tr></table>`,
    ].join('') : '',
    `<p style="margin:0 0 4px;font-size:14px;color:${textSub}">${esc(sig)}</p>`,
    '</td></tr>',
    `<tr><td style="background:${cardBg};border-top:1px solid ${borderC};padding:20px 40px;text-align:center">`,
    `<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${textMain}"><a href="${esc(orgUrl)}" style="color:${accent};text-decoration:none">${esc(orgName)}</a></p>`,
    `<p style="margin:0;font-size:11px;color:${textSub};line-height:1.6">${footer.replace(/\n/g, '<br>')}</p>`,
    `<p style="margin:8px 0 0;font-size:10px;color:${textSub}"><a href="#" style="color:${textSub}">Unsubscribe</a> &nbsp;&middot;&nbsp; <a href="${esc(orgUrl)}" style="color:${textSub}">${esc(orgName)}</a></p>`,
    '</td></tr>',
    `<tr><td style="background:linear-gradient(90deg,${btn},${accent});height:3px;line-height:3px;font-size:3px">&nbsp;</td></tr>`,
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('\n');
}

function getAudience() {
  const activeMembers = (STATE.members || []).filter(m => !m.is_deleted);
  if (STATE.broadcastAudience === 'all') return activeMembers;
  if (STATE.broadcastAudience === 'group') return activeMembers.filter(m => m.group === STATE.broadcastGroup);
  if (STATE.broadcastAudience === 'selected') {
    const selectedIds = new Set(JSON.parse(localStorage.getItem('mf_selected_ids') || '[]'));
    return activeMembers.filter(m => selectedIds.has(m.id));
  }
  return activeMembers;
}

function updateBroadcastAudience() {
  const activeMembers = (STATE.members || []).filter(m => !m.is_deleted);
  const aud = getAudience();
  const bcTotalEl = document.getElementById('bc-total');
  if (bcTotalEl) bcTotalEl.textContent = aud.length;
  
  const allCountEl = document.getElementById('aud-count-all');
  if (allCountEl) allCountEl.textContent = activeMembers.length;

  const selCountEl = document.getElementById('aud-count-selected');
  if (selCountEl) {
    const selectedIds = JSON.parse(localStorage.getItem('mf_selected_ids') || '[]');
    selCountEl.textContent = selectedIds.length;
  }
}

function renderGroups() {
  const bcSel = document.getElementById('bc-group-select');
  if (bcSel) {
    bcSel.innerHTML = `<option value="">— Select group —</option>${STATE.groups.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('')}`;
    if (STATE.broadcastGroup) bcSel.value = STATE.broadcastGroup;
  }
}

function addLog(msg, type = 'info') {
  const terminal = document.getElementById('logs-terminal');
  if (!terminal) return;
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.innerHTML = `<span class="log-ts">[${ts()}]</span> ${msg}`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;

  // Persist logs to localStorage
  try {
    const logs = JSON.parse(localStorage.getItem('mf_broadcast_logs') || '[]');
    logs.push({ msg, type, time: ts() });
    if (logs.length > 500) logs.splice(0, logs.length - 500);
    localStorage.setItem('mf_broadcast_logs', JSON.stringify(logs));
  } catch (e) { }
}

function deleteInvalidMember(id, email) {
  STATE.members = STATE.members.filter(x => x.id !== id);
  if (STATE.previewMemberId === id) STATE.previewMemberId = null;
  deleteMemberFromDatabase(id);
  save();
  updateBroadcastAudience();
  addLog(`🗑️ Removed invalid email <${email}> from member database.`, 'sys');
}

function handleSMTPFailure(result, member) {
  const errorMsg = result.error || 'SMTP Relay Error';
  addLog(`✗ Failed   → ${member.email} | ${errorMsg}`, 'err');

  const failedEl = document.getElementById('bc-failed');
  if (failedEl) {
    failedEl.textContent = parseInt(failedEl.textContent || '0') + 1;
  }

  // Determine if it is a permanent failure or transient
  let shouldDelete = false;
  const msg = errorMsg.toLowerCase();

  const isRateLimitOrQuota =
    msg.includes('limit') ||
    msg.includes('quota') ||
    msg.includes('exceed') ||
    msg.includes('throttled') ||
    msg.includes('too many messages') ||
    msg.includes('temp') ||
    msg.includes('try again') ||
    msg.includes('later') ||
    msg.includes('max');

  const isSpamOrBlock =
    msg.includes('spam') ||
    msg.includes('suspicious') ||
    msg.includes('blocked') ||
    msg.includes('blocklist') ||
    msg.includes('blacklist') ||
    msg.includes('reputation') ||
    msg.includes('policy') ||
    msg.includes('abuse') ||
    msg.includes('rbl') ||
    msg.includes('dnsbl');

  const isAuthOrConnError =
    result.code === 'EAUTH' ||
    result.code === 'CONNECTION' ||
    result.code === 'ESOCKET' ||
    result.code === 'ETIMEOUT' ||
    result.code === 'ENOTFOUND' ||
    result.code === 'ECONNREFUSED' ||
    result.code === 'ECONNRESET' ||
    result.command === 'CONN' ||
    result.command === 'AUTH' ||
    result.command === 'HELO' ||
    result.command === 'EHLO' ||
    result.command === 'MAIL FROM' ||
    msg.includes('auth') ||
    msg.includes('login') ||
    msg.includes('credential') ||
    msg.includes('password') ||
    msg.includes('username') ||
    msg.includes('connect') ||
    msg.includes('timeout') ||
    msg.includes('port') ||
    msg.includes('dns') ||
    msg.includes('socket') ||
    msg.includes('tls') ||
    msg.includes('ssl') ||
    msg.includes('network') ||
    msg.includes('offline') ||
    msg.includes('refused') ||
    msg.includes('reset');

  const isTransientResponseCode =
    result.responseCode >= 400 && result.responseCode < 500;

  const isTransient = isRateLimitOrQuota || isSpamOrBlock || isAuthOrConnError || isTransientResponseCode;

  if (!isTransient) {
    const hasRecipientCommandOrCode =
      result.command === 'RCPT TO' ||
      result.code === 'EENVELOPE' ||
      [550, 553, 551, 501, 521, 554].includes(result.responseCode);

    const isRecipientError =
      msg.includes('recipient') ||
      msg.includes('mailbox') ||
      msg.includes('address') ||
      msg.includes('user unknown') ||
      msg.includes('no such user') ||
      msg.includes('does not exist') ||
      msg.includes('rejected') ||
      msg.includes('unreachable') ||
      msg.includes('invalid') ||
      msg.includes('not found') ||
      msg.includes('550') ||
      msg.includes('553') ||
      msg.includes('551') ||
      msg.includes('501') ||
      msg.includes('521') ||
      msg.includes('554');

    if (hasRecipientCommandOrCode || isRecipientError) {
      shouldDelete = true;
    }
  }

  if (shouldDelete) {
    deleteInvalidMember(member.id, member.email);
  } else {
    let reason = 'transient error';
    if (isAuthOrConnError) reason = 'authentication / connection error';
    else if (isRateLimitOrQuota) reason = 'rate limit / quota error';
    else if (isSpamOrBlock) reason = 'spam / reputation block';
    else if (isTransientResponseCode) reason = `transient response code ${result.responseCode}`;

    addLog(`ℹ️ Kept <${member.email}> in database (${reason}).`, 'info');
  }
}

async function tick(audience) {
  if (!STATE.broadcasting || STATE.broadcastPaused) return;
  if (STATE.broadcastIndex >= audience.length) { finishBroadcast(audience.length); return; }

  const m = audience[STATE.broadcastIndex];

  // Syntax check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(m.email || '')) {
    addLog(`✗ Invalid Email Syntax → ${m.email}`, 'err');
    deleteInvalidMember(m.id, m.email);

    STATE.broadcastIndex++;
    if (STATE.activeCampaign) {
      STATE.activeCampaign.progress_index = STATE.broadcastIndex;
      STATE.activeCampaign.failed_count = (STATE.activeCampaign.failed_count || 0) + 1;
      saveCampaign(STATE.activeCampaign);
    }
    const pct = Math.round((STATE.broadcastIndex / audience.length) * 100);
    document.getElementById('bc-progress-fill').style.width = pct + '%';
    document.getElementById('bc-pct').textContent = pct + '%';
    document.getElementById('bc-progress-label').textContent = `${STATE.broadcastIndex} / ${audience.length}`;
    broadcastTimer = setTimeout(() => tick(audience), 50);
    return;
  }

  const delay = parseInt(document.getElementById('smtp-delay')?.value || '300');
  const composerMeta = JSON.parse(localStorage.getItem('mf_composer_meta') || '{}');
  const subject = mergeTags(composerMeta.subject || 'Broadcast Subject', m);

  const htmlContent = buildEmailHTML(m);

  // Check backend SMTP sending
  const smtpHost = document.getElementById('smtp-host')?.value || '';
  const smtpPort = parseInt(document.getElementById('smtp-port')?.value || '587');
  const smtpUser = document.getElementById('smtp-user')?.value || '';
  const smtpPass = document.getElementById('smtp-pass')?.value || '';
  const fromName = document.getElementById('smtp-from-name')?.value || '';
  const fromEmail = document.getElementById('smtp-from-email')?.value || '';

  if (smtpPass) {
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch(`${window.API_BASE_URL}/send`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          pass: smtpPass,
          fromName: fromName,
          fromEmail: fromEmail,
          to: m.email,
          subject: subject,
          html: htmlContent,
          campaignId: STATE.activeCampaign?.id,
          table: getSupabaseTableName()
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        addLog(`✓ Delivered → ${m.name} <${m.email}> | "${subject}" (Real SMTP)`, 'ok');
        const deliveredEl = document.getElementById('bc-delivered');
        if (deliveredEl) deliveredEl.textContent = parseInt(deliveredEl.textContent || '0') + 1;
        sentMemberIds.push(m.id); // ✔ track for post-broadcast modal
      } else {
        handleSMTPFailure(result, m);
      }
    } catch (err) {
      handleSMTPFailure({ error: err.message }, m);
    }
  } else {
    // Simulated Mode
    const success = Math.random() > 0.03;
    if (success) {
      addLog(`✓ Delivered → ${m.name} <${m.email}> | "${subject}" (Simulated)`, 'ok');
      const deliveredEl = document.getElementById('bc-delivered');
      if (deliveredEl) deliveredEl.textContent = parseInt(deliveredEl.textContent || '0') + 1;
      sentMemberIds.push(m.id); // ✔ track for post-broadcast modal
    } else {
      addLog(`✗ Failed   → ${m.email} | SMTP timeout (Simulated)`, 'err');
      const failedEl = document.getElementById('bc-failed');
      if (failedEl) failedEl.textContent = parseInt(failedEl.textContent || '0') + 1;
    }
  }

  STATE.broadcastIndex++;
  if (STATE.activeCampaign) {
    STATE.activeCampaign.progress_index = STATE.broadcastIndex;
    STATE.activeCampaign.sent_count = parseInt(document.getElementById('bc-delivered')?.textContent || '0');
    STATE.activeCampaign.failed_count = parseInt(document.getElementById('bc-failed')?.textContent || '0');
    saveCampaign(STATE.activeCampaign);
  }
  const pct = Math.round((STATE.broadcastIndex / audience.length) * 100);
  const fillEl = document.getElementById('bc-progress-fill');
  if (fillEl) fillEl.style.width = pct + '%';
  const pctText = document.getElementById('bc-pct');
  if (pctText) pctText.textContent = pct + '%';
  const labelEl = document.getElementById('bc-progress-label');
  if (labelEl) labelEl.textContent = `${STATE.broadcastIndex} / ${audience.length}`;
  const animText = document.getElementById('send-anim-text');
  if (animText) animText.textContent = `Sending to ${m.name}…`;

  const batchSize = parseInt(document.getElementById('smtp-batch-size')?.value || '50');
  const batchPauseSec = parseInt(document.getElementById('smtp-batch-pause')?.value || '10');
  if (STATE.broadcastIndex % batchSize === 0 && STATE.broadcastIndex < audience.length) {
    const batchNum = Math.floor(STATE.broadcastIndex / batchSize);
    const totalBatches = Math.ceil(audience.length / batchSize);
    addLog(`📦 Batch ${batchNum}/${totalBatches} complete. Pausing ${batchPauseSec}s to avoid rate limits...`, 'warn');
    if (animText) animText.textContent = `Batch ${batchNum} done — cooling down ${batchPauseSec}s…`;
    broadcastTimer = setTimeout(() => tick(audience), batchPauseSec * 1000);
  } else {
    broadcastTimer = setTimeout(() => tick(audience), delay);
  }
}

function startBroadcast() {
  const audience = getAudience();
  if (!audience.length) { showToast('No members in selected audience', 'warn'); return; }
  
  if (!STATE.broadcasting) {
    if (STATE.broadcastIndex >= audience.length) {
      STATE.broadcastIndex = 0;
      const devEl = document.getElementById('bc-delivered');
      if (devEl) devEl.textContent = '0';
      const failEl = document.getElementById('bc-failed');
      if (failEl) failEl.textContent = '0';
    }
    
    sentMemberIds = []; // reset tracking for new run
    const batchSize = parseInt(document.getElementById('smtp-batch-size')?.value || '50');
    addLog(`Starting broadcast to ${audience.length} members (batches of ${batchSize})...`, 'sys');
    addLog(`SMTP: ${document.getElementById('smtp-host')?.value}:${document.getElementById('smtp-port')?.value}`, 'info');
    addLog(`From: ${document.getElementById('smtp-from-name')?.value} <${document.getElementById('smtp-from-email')?.value}>`, 'info');
  }

  STATE.broadcasting = true;
  STATE.broadcastPaused = false;
  
  if (STATE.activeCampaign) {
    STATE.activeCampaign.status = 'sending';
    STATE.activeCampaign.total_members = audience.length;
    STATE.activeCampaign.progress_index = STATE.broadcastIndex;
    saveCampaign(STATE.activeCampaign);
  }

  const statsRow = document.getElementById('bc-stats-row');
  if (statsRow) statsRow.style.display = '';
  
  const progEl = document.getElementById('bc-progress-wrap');
  if (progEl) progEl.style.display = '';
  
  const startBtn = document.getElementById('btn-start-broadcast');
  if (startBtn) startBtn.style.display = 'none';
  
  const pauseBtn = document.getElementById('btn-pause-broadcast');
  if (pauseBtn) pauseBtn.style.display = 'inline-flex';
  
  const stopBtn = document.getElementById('btn-stop-broadcast');
  if (stopBtn) stopBtn.style.display = 'inline-flex';
  
  const animEl = document.getElementById('send-anim');
  if (animEl) animEl.style.display = 'flex';
  
  tick(audience);
}

function pauseBroadcast() {
  STATE.broadcastPaused = true;
  clearTimeout(broadcastTimer);
  
  if (STATE.activeCampaign) {
    STATE.activeCampaign.status = 'paused';
    STATE.activeCampaign.progress_index = STATE.broadcastIndex;
    saveCampaign(STATE.activeCampaign);
  }

  const pauseBtn = document.getElementById('btn-pause-broadcast');
  if (pauseBtn) pauseBtn.style.display = 'none';
  const startBtn = document.getElementById('btn-start-broadcast');
  if (startBtn) {
    startBtn.innerHTML = '<i class="fa-solid fa-play"></i> Resume Campaign';
    startBtn.style.display = 'inline-flex';
  }
  addLog('Broadcast paused.', 'warn');
}

function stopBroadcast() {
  STATE.broadcasting = false; 
  STATE.broadcastPaused = false;
  clearTimeout(broadcastTimer);
  
  if (STATE.activeCampaign) {
    STATE.activeCampaign.status = 'paused';
    STATE.activeCampaign.progress_index = STATE.broadcastIndex;
    saveCampaign(STATE.activeCampaign);
  }

  const startBtn = document.getElementById('btn-start-broadcast');
  if (startBtn) {
    startBtn.style.display = 'inline-flex';
    startBtn.innerHTML = '<i class="fa-solid fa-play"></i> Resume Campaign';
  }
  const pauseBtn = document.getElementById('btn-pause-broadcast');
  if (pauseBtn) pauseBtn.style.display = 'none';
  const stopBtn = document.getElementById('btn-stop-broadcast');
  if (stopBtn) stopBtn.style.display = 'none';
  const animEl = document.getElementById('send-anim');
  if (animEl) animEl.style.display = 'none';
  addLog('Broadcast stopped by user.', 'warn');
}

function finishBroadcast(total) {
  STATE.broadcasting = false;
  clearTimeout(broadcastTimer);
  
  if (STATE.activeCampaign) {
    STATE.activeCampaign.status = 'completed';
    STATE.activeCampaign.progress_index = STATE.broadcastIndex;
    saveCampaign(STATE.activeCampaign);
  }

  const startBtn = document.getElementById('btn-start-broadcast');
  if (startBtn) {
    startBtn.style.display = 'inline-flex';
    startBtn.innerHTML = '<i class="fa-solid fa-circle-play"></i> Start Broadcasting';
  }
  const pauseBtn = document.getElementById('btn-pause-broadcast');
  if (pauseBtn) pauseBtn.style.display = 'none';
  const stopBtn = document.getElementById('btn-stop-broadcast');
  if (stopBtn) stopBtn.style.display = 'none';
  const animEl = document.getElementById('send-anim');
  if (animEl) animEl.style.display = 'none';
  addLog(`✅ Broadcast complete! ${total} emails processed.`, 'ok');

  // Show post-broadcast modal
  const delivered = sentMemberIds.length;
  const failed = total - delivered;
  const summaryEl = document.getElementById('post-bc-summary');
  if (summaryEl) summaryEl.textContent = `✔ ${delivered} delivered, ✖ ${failed} failed. What do you want to do next?`;
  const overlay = document.getElementById('post-broadcast-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function resetBroadcast() {
  stopBroadcast();
  STATE.broadcastIndex = 0;
  if (STATE.activeCampaign) {
    STATE.activeCampaign.progress_index = 0;
    STATE.activeCampaign.sent_count = 0;
    STATE.activeCampaign.failed_count = 0;
    STATE.activeCampaign.status = 'draft';
    saveCampaign(STATE.activeCampaign);
  }
  const startBtn = document.getElementById('btn-start-broadcast');
  if (startBtn) {
    startBtn.innerHTML = '<i class="fa-solid fa-circle-play"></i> Start Broadcasting';
  }
  const devEl = document.getElementById('bc-delivered');
  if (devEl) devEl.textContent = '0';
  const failEl = document.getElementById('bc-failed');
  if (failEl) failEl.textContent = '0';
  const pctEl = document.getElementById('bc-pct');
  if (pctEl) pctEl.textContent = '0%';
  const fillEl = document.getElementById('bc-progress-fill');
  if (fillEl) fillEl.style.width = '0%';
  const labelEl = document.getElementById('bc-progress-label');
  if (labelEl) labelEl.textContent = '0 / 0';
  addLog('Broadcast reset.', 'sys');
}

// ── INITIALIZE BROADCAST PANEL ─────────────────────────────
function initBroadcast() {
  loadSMTPConfigs();
  updateBroadcastAudience();
  renderGroups();

  // Sync audience tab UI from active campaign state
  document.querySelectorAll('.aud-opt').forEach(opt => {
    const isActive = opt.dataset.aud === STATE.broadcastAudience;
    opt.classList.toggle('active', isActive);
  });
  const groupRow = document.getElementById('group-select-row');
  if (groupRow) {
    groupRow.style.display = STATE.broadcastAudience === 'group' ? 'block' : 'none';
  }

  // Set saved progress state UI if resumed
  const audience = getAudience();
  if (STATE.broadcastIndex > 0 && audience.length > 0) {
    const pct = Math.round((STATE.broadcastIndex / audience.length) * 100);
    const fillEl = document.getElementById('bc-progress-fill');
    if (fillEl) fillEl.style.width = pct + '%';
    const pctText = document.getElementById('bc-pct');
    if (pctText) pctText.textContent = pct + '%';
    const labelEl = document.getElementById('bc-progress-label');
    if (labelEl) labelEl.textContent = `${STATE.broadcastIndex} / ${audience.length}`;
    
    const startBtn = document.getElementById('btn-start-broadcast');
    if (startBtn) {
      startBtn.innerHTML = '<i class="fa-solid fa-play"></i> Resume Campaign';
    }
    
    const statsRow = document.getElementById('bc-stats-row');
    if (statsRow) statsRow.style.display = '';
    const progEl = document.getElementById('bc-progress-wrap');
    if (progEl) progEl.style.display = '';

    const deliveredEl = document.getElementById('bc-delivered');
    if (deliveredEl && STATE.activeCampaign) deliveredEl.textContent = STATE.activeCampaign.sent_count || '0';
    const failedEl = document.getElementById('bc-failed');
    if (failedEl && STATE.activeCampaign) failedEl.textContent = STATE.activeCampaign.failed_count || '0';
  } else {
    const fillEl = document.getElementById('bc-progress-fill');
    if (fillEl) fillEl.style.width = '0%';
    const pctText = document.getElementById('bc-pct');
    if (pctText) pctText.textContent = '0%';
    const labelEl = document.getElementById('bc-progress-label');
    if (labelEl) labelEl.textContent = `0 / ${audience.length}`;
    
    const startBtn = document.getElementById('btn-start-broadcast');
    if (startBtn) {
      startBtn.innerHTML = '<i class="fa-solid fa-circle-play"></i> Start Broadcasting';
    }
    const statsRow = document.getElementById('bc-stats-row');
    if (statsRow) statsRow.style.display = 'none';
    const progEl = document.getElementById('bc-progress-wrap');
    if (progEl) progEl.style.display = 'none';
  }

  if (window.broadcastInitialized) {
    return;
  }
  window.broadcastInitialized = true;

  // ── SMTP Visibility & Toggle Controls ────────────────────
  const toggleBtn = document.getElementById('btn-toggle-smtp-visibility');
  const fieldsWrapper = document.getElementById('smtp-fields-wrapper');
  const toggleText = document.getElementById('toggle-smtp-visibility-text');
  
  if (toggleBtn && fieldsWrapper) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = fieldsWrapper.style.display === 'none';
      fieldsWrapper.style.display = isHidden ? 'block' : 'none';
      toggleBtn.querySelector('i').className = `fa-solid fa-eye${isHidden ? '-slash' : ''}`;
      if (toggleText) toggleText.textContent = isHidden ? 'Hide Details' : 'Show Details';
    });
  }

  const passToggleBtn = document.getElementById('toggle-broadcast-smtp-pass');
  const passInput = document.getElementById('smtp-pass');
  if (passToggleBtn && passInput) {
    passToggleBtn.addEventListener('click', () => {
      const isPw = passInput.type === 'password';
      passInput.type = isPw ? 'text' : 'password';
      passToggleBtn.querySelector('i').className = `fa-solid fa-eye${isPw ? '-slash' : ''}`;
    });
  }

  // Load existing logs if present
  try {
    const savedLogs = JSON.parse(localStorage.getItem('mf_broadcast_logs') || '[]');
    if (savedLogs.length) {
      const terminal = document.getElementById('logs-terminal');
      if (terminal) {
        terminal.innerHTML = '';
        savedLogs.forEach(l => {
          const line = document.createElement('div');
          line.className = `log-line ${l.type}`;
          line.innerHTML = `<span class="log-ts">[${l.time}]</span> ${l.msg}`;
          terminal.appendChild(line);
        });
        terminal.scrollTop = terminal.scrollHeight;
      }
    }
  } catch (e) { }

  // Bind change listeners to SMTP inputs
  document.querySelectorAll('#smtp-host, #smtp-port, #smtp-secure, #smtp-from-name, #smtp-from-email, #smtp-user, #smtp-pass, #smtp-delay, #smtp-batch-size, #smtp-batch-pause').forEach(el => {
    el.addEventListener('input', saveSMTPConfigs);
    el.addEventListener('change', saveSMTPConfigs);
  });

  // Audience options tabs
  document.querySelectorAll('.aud-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.aud-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      STATE.broadcastAudience = opt.dataset.aud;
      const groupRow = document.getElementById('group-select-row');
      if (groupRow) groupRow.style.display = opt.dataset.aud === 'group' ? 'block' : 'none';
      updateBroadcastAudience();
      saveSMTPConfigs();
    });
  });

  // Group filter dropdown
  document.getElementById('bc-group-select')?.addEventListener('change', function () {
    STATE.broadcastGroup = this.value;
    updateBroadcastAudience();
    saveSMTPConfigs();
  });

  // Button actions
  document.getElementById('btn-start-broadcast')?.addEventListener('click', startBroadcast);
  document.getElementById('btn-pause-broadcast')?.addEventListener('click', pauseBroadcast);
  document.getElementById('btn-stop-broadcast')?.addEventListener('click', stopBroadcast);
  document.getElementById('btn-reset-broadcast')?.addEventListener('click', resetBroadcast);

  document.getElementById('btn-clear-logs')?.addEventListener('click', () => {
    const terminal = document.getElementById('logs-terminal');
    if (terminal) terminal.innerHTML = '';
    localStorage.removeItem('mf_broadcast_logs');
  });

  document.getElementById('btn-export-logs')?.addEventListener('click', () => {
    const lines = [...document.querySelectorAll('.log-line')].map(l => l.textContent).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines], { type: 'text/plain' }));
    a.download = 'broadcast-logs.txt'; a.click();
  });

  // ── Post-broadcast modal buttons ─────────────────────────────
  const overlay = document.getElementById('post-broadcast-overlay');
  function closePostModal() {
    if (overlay) overlay.style.display = 'none';
    sentMemberIds = []; // clear for next run
    showToast('Done — ready for next broadcast.');
  }

  document.getElementById('post-bc-keep')?.addEventListener('click', () => {
    addLog(`💾 Kept all ${sentMemberIds.length} sent members in database.`, 'sys');
    closePostModal();
  });

  document.getElementById('post-bc-delete')?.addEventListener('click', () => {
    const ids = new Set(sentMemberIds);
    const removedCount = ids.size;
    STATE.members = STATE.members.filter(m => !ids.has(m.id));
    save();
    updateBroadcastAudience();
    addLog(`🗑️ Removed ${removedCount} sent members from database.`, 'sys');
    closePostModal();
  });
}

document.addEventListener('DOMContentLoaded', initBroadcast);

window.updateBroadcastAudience = updateBroadcastAudience;
window.renderGroups = renderGroups;
window.initBroadcast = initBroadcast;
