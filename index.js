/* ══════════════════════════════════════════════════════════
   MAILPILOT — Composer Page Logic
   ══════════════════════════════════════════════════════════ */

// ── COMPOSER DATA & PREVIEW STATE ──────────────────────────
let updateTimer;

function saveComposerState() {
  const getVal = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  };
  const getChecked = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? el.checked : fallback;
  };

  const currentMeta = JSON.parse(localStorage.getItem('mf_composer_meta') || '{}');

  const meta = {
    subject: getVal('input-subject', currentMeta.subject || ''),
    title: getVal('input-title', currentMeta.title || ''),
    greeting: getVal('input-greeting', currentMeta.greeting || ''),
    body: getVal('input-body', currentMeta.body || ''),
    btnText: getVal('input-btn-text', currentMeta.btnText || ''),
    btnUrl: getVal('input-btn-url', currentMeta.btnUrl || ''),
    signature: getVal('input-signature', currentMeta.signature || ''),
    footer: getVal('input-footer-text', currentMeta.footer || ''),
    orgName: getVal('input-org-name', currentMeta.orgName || ''),
    orgUrl: getVal('input-org-url', currentMeta.orgUrl || ''),
    banner: getVal('select-banner', currentMeta.banner || 'none'),
    bannerUrl: getVal('input-banner-url', currentMeta.bannerUrl || ''),
    showEventDetails: getChecked('toggle-event-details', currentMeta.showEventDetails || false),
    eventDate: getVal('input-event-date', currentMeta.eventDate || ''),
    eventTime: getVal('input-event-time', currentMeta.eventTime || ''),
    eventLoc: getVal('input-event-location', currentMeta.eventLoc || ''),
    eventAgenda: getVal('input-event-agenda', currentMeta.eventAgenda || ''),

    // SMTP fields
    smtpHost: getVal('smtp-host', currentMeta.smtpHost || ''),
    smtpPort: getVal('smtp-port', currentMeta.smtpPort || ''),
    smtpSecure: getVal('smtp-secure', currentMeta.smtpSecure || ''),
    smtpFromName: getVal('smtp-from-name', currentMeta.smtpFromName || ''),
    smtpFromEmail: getVal('smtp-from-email', currentMeta.smtpFromEmail || ''),
    smtpUser: getVal('smtp-user', currentMeta.smtpUser || ''),
    smtpPass: getVal('smtp-pass', currentMeta.smtpPass || ''),
    smtpDelay: getVal('smtp-delay', currentMeta.smtpDelay || '300'),
    smtpBatchSize: getVal('smtp-batch-size', currentMeta.smtpBatchSize || '50'),
    smtpBatchPause: getVal('smtp-batch-pause', currentMeta.smtpBatchPause || '10'),

    // STATE values
    codeEdited: STATE.codeEdited,
    template: STATE.template,
    btnColor: STATE.btnColor,
    accentColor: STATE.accentColor,
    bgColor: STATE.bgColor,
    fontFamily: STATE.fontFamily,
    emailWidth: STATE.emailWidth,

    // Custom Code Value
    customHtml: getVal('code-textarea', currentMeta.customHtml || ''),
  };
  localStorage.setItem('mf_composer_meta', JSON.stringify(meta));

  if (STATE.activeCampaign) {
    mapMetaToCampaign(meta, STATE.activeCampaign);
    saveCampaign(STATE.activeCampaign);
  }
}

function loadComposer() {
  load(); // call shared load first
  try {
    const metaStr = localStorage.getItem('mf_composer_meta');
    if (metaStr) {
      const meta = JSON.parse(metaStr);

      // Assign values back to inputs
      if (meta.subject !== undefined && document.getElementById('input-subject')) document.getElementById('input-subject').value = meta.subject;
      if (meta.title !== undefined && document.getElementById('input-title')) document.getElementById('input-title').value = meta.title;
      if (meta.greeting !== undefined && document.getElementById('input-greeting')) document.getElementById('input-greeting').value = meta.greeting;
      if (meta.body !== undefined && document.getElementById('input-body')) document.getElementById('input-body').value = meta.body;
      if (meta.btnText !== undefined && document.getElementById('input-btn-text')) document.getElementById('input-btn-text').value = meta.btnText;
      if (meta.btnUrl !== undefined && document.getElementById('input-btn-url')) document.getElementById('input-btn-url').value = meta.btnUrl;
      if (meta.signature !== undefined && document.getElementById('input-signature')) document.getElementById('input-signature').value = meta.signature;
      if (meta.footer !== undefined && document.getElementById('input-footer-text')) document.getElementById('input-footer-text').value = meta.footer;
      if (meta.orgName !== undefined && document.getElementById('input-org-name')) document.getElementById('input-org-name').value = meta.orgName;
      if (meta.orgUrl !== undefined && document.getElementById('input-org-url')) document.getElementById('input-org-url').value = meta.orgUrl;

      if (meta.banner !== undefined && document.getElementById('select-banner')) {
        document.getElementById('select-banner').value = meta.banner;
        document.getElementById('custom-banner-field').style.display = meta.banner === 'custom' ? 'block' : 'none';
      }
      if (meta.bannerUrl !== undefined && document.getElementById('input-banner-url')) document.getElementById('input-banner-url').value = meta.bannerUrl;

      if (meta.showEventDetails !== undefined && document.getElementById('toggle-event-details')) {
        document.getElementById('toggle-event-details').checked = !!meta.showEventDetails;
        document.getElementById('event-details-fields').style.display = meta.showEventDetails ? 'block' : 'none';
      }
      if (meta.eventDate !== undefined && document.getElementById('input-event-date')) document.getElementById('input-event-date').value = meta.eventDate;
      if (meta.eventTime !== undefined && document.getElementById('input-event-time')) document.getElementById('input-event-time').value = meta.eventTime;
      if (meta.eventLoc !== undefined && document.getElementById('input-event-location')) document.getElementById('input-event-location').value = meta.eventLoc;
      if (meta.eventAgenda !== undefined && document.getElementById('input-event-agenda')) document.getElementById('input-event-agenda').value = meta.eventAgenda;

      // Assign back to STATE
      STATE.codeEdited = !!meta.codeEdited;
      STATE.template = meta.template || 'event';
      STATE.btnColor = meta.btnColor || '#1f6feb';
      STATE.accentColor = meta.accentColor || '#1f6feb';
      STATE.bgColor = meta.bgColor || '#ffffff';
      STATE.fontFamily = meta.fontFamily || 'Arial, sans-serif';
      STATE.emailWidth = meta.emailWidth || 600;
      STATE.showEventDetails = !!meta.showEventDetails;

      if (document.getElementById('code-textarea')) {
        document.getElementById('code-textarea').value = meta.customHtml || '';
      }

      // Update UI displays to match loaded STATE
      document.querySelectorAll('.tpl-card').forEach(c => {
        c.classList.toggle('active', c.dataset.template === STATE.template);
      });
      document.querySelectorAll('.c-dot:not(.accent-dot)').forEach(d => {
        d.classList.toggle('active', d.dataset.color === STATE.btnColor);
      });
      document.querySelectorAll('.accent-dot').forEach(d => {
        d.classList.toggle('active', d.dataset.color === STATE.accentColor);
      });
      if (document.getElementById('custom-btn-color')) document.getElementById('custom-btn-color').value = STATE.btnColor;
      if (document.getElementById('custom-accent-color')) document.getElementById('custom-accent-color').value = STATE.accentColor;

      document.querySelectorAll('#bg-color-opts .radio-opt').forEach(o => {
        o.classList.toggle('active', o.dataset.bg === STATE.bgColor);
      });
      document.querySelectorAll('#font-opts .radio-opt').forEach(o => {
        o.classList.toggle('active', o.dataset.font === STATE.fontFamily);
      });
      document.querySelectorAll('#width-opts .radio-opt').forEach(o => {
        o.classList.toggle('active', parseInt(o.dataset.width) === STATE.emailWidth);
      });
    }
  } catch (e) {
    console.error("Error loading saved composer: ", e);
  }
}

// ── HTML TEMPLATE ENGINE ──────────────────────────────────
function buildEmailHTML(member) {
  const v = (id) => (document.getElementById(id) || {}).value || '';
  const bannerSel = v('select-banner');
  const banner = bannerSel === 'custom' ? v('input-banner-url') : bannerSel;
  const hasBanner = banner && banner !== 'none';

  const subject = mergeTags(v('input-subject'), member);
  const greeting = mergeTags(v('input-greeting'), member);
  const body = mergeTags(v('input-body'), member).replace(/\n/g, '<br>');
  const title = mergeTags(v('input-title'), member);
  const btnText = mergeTags(v('input-btn-text'), member);
  const btnUrl = mergeTags(v('input-btn-url'), member);
  const sig = mergeTags(v('input-signature'), member);
  const footer = mergeTags(v('input-footer-text'), member);
  const orgName = mergeTags(v('input-org-name'), member) || 'MailPilot Studio';
  const orgUrl = mergeTags(v('input-org-url'), member) || '#';

  const showEvent = STATE.showEventDetails;
  const eDate = v('input-event-date');
  const eTime = v('input-event-time');
  const eLoc = v('input-event-location');
  const eAgenda = v('input-event-agenda');
  const agendaItems = eAgenda.split('\n').filter(x => x.trim()).map(a =>
    `<tr><td style="padding:5px 0;color:#555;font-size:14px;border-bottom:1px solid #f0f0f0">• ${esc(a.trim())}</td></tr>`
  ).join('');

  const bg = STATE.bgColor;
  const btn = STATE.btnColor;
  const accent = STATE.accentColor;
  const font = STATE.fontFamily;
  const width = STATE.emailWidth;
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

function scheduleUpdate() {
  clearTimeout(updateTimer);
  updateTimer = setTimeout(updatePreview, 120);
}

function updatePreview() {
  const member = STATE.members.find(m => m.id === STATE.previewMemberId) || STATE.members[0] || null;

  let html = "";
  if (STATE.codeEdited) {
    const rawHtml = document.getElementById('code-textarea').value;
    html = mergeTags(rawHtml, member);
  } else {
    html = buildEmailHTML(member);
    const codeArea = document.getElementById('code-textarea');
    if (codeArea && document.activeElement !== codeArea) {
      codeArea.value = html;
    }
  }

  const iframe = document.getElementById('email-preview-iframe');
  if (iframe) {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
  }

  const subj = document.getElementById('input-subject');
  if (subj && document.getElementById('preview-subject')) {
    document.getElementById('preview-subject').textContent = mergeTags(subj.value, member);
  }
  const toPreview = document.getElementById('preview-to');
  if (toPreview) {
    toPreview.textContent = member ? `${member.name} <${member.email}>` : '(select a member)';
  }

  saveComposerState();
}

function renderComposerMembers(filter = '') {
  const list = document.getElementById('composer-member-list');
  if (!list) return;

  const filtered = STATE.members.filter(m => {
    if (m.is_deleted) return false;
    const q = filter.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-list"><i class="fa-solid fa-users-slash"></i>No members yet.</div>`;
    return;
  }

  list.innerHTML = filtered.map(m => `
    <div class="member-item ${STATE.previewMemberId === m.id ? 'selected' : ''}" data-id="${m.id}">
      <div class="member-avatar" style="background:${avatarColor(m.name)}">${initials(m.name)}</div>
      <div class="member-info">
        <div class="member-name">${esc(m.name)}</div>
        <div class="member-email">${esc(m.email)}</div>
      </div>
      ${m.group ? `<span class="member-tag">${esc(m.group)}</span>` : ''}
    </div>`).join('');

  // Bind click event to each item dynamically
  list.querySelectorAll('.member-item').forEach(item => {
    item.addEventListener('click', () => {
      selectPreviewMember(item.dataset.id);
    });
  });
}

function selectPreviewMember(id) {
  STATE.previewMemberId = id;
  const searchInput = document.getElementById('composer-member-search');
  renderComposerMembers(searchInput ? searchInput.value : '');
  scheduleUpdate();
}

function applyTemplateDefaults(t) {
  const defaults = {
    event: { title: 'You\'re Invited to Something Special', btn: 'Reserve Your Spot Now', greeting: 'Hi {{Name}},' },
    newsletter: { title: 'This Month at {{College}}', btn: 'Read More Online', greeting: 'Hello {{Name}},' },
    announcement: { title: 'Important Announcement for Our Community', btn: 'Learn More', greeting: 'Dear {{Name}},' },
    welcome: { title: 'Welcome to the Community, {{Name}}!', btn: 'Explore Now', greeting: 'Hi {{Name}}! 👋' },
    promotion: { title: 'Exclusive Offer Just for You, {{Name}}', btn: 'Claim Your Offer', greeting: 'Hey {{Name}},' },
    reminder: { title: 'Friendly Reminder: Don\'t Miss Out!', btn: 'Take Action Now', greeting: 'Hi {{Name}},' },
  };
  const d = defaults[t];
  if (!d) return;
  if (d.title && document.getElementById('input-title')) document.getElementById('input-title').value = d.title;
  if (d.btn && document.getElementById('input-btn-text')) document.getElementById('input-btn-text').value = d.btn;
  if (d.greeting && document.getElementById('input-greeting')) document.getElementById('input-greeting').value = d.greeting;
}

// ── VIEWPORT CONTROLS ─────────────────────────────────────
const previewArea = document.getElementById('preview-area');
const codeView = document.getElementById('code-view');
const previewShell = document.getElementById('preview-shell');

function setViewport(mode) {
  document.querySelectorAll('.vp-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('vp-' + mode)?.classList.add('active');
  
  if (mode === 'code') {
    previewArea?.classList.add('hidden');
    codeView?.classList.add('visible');
    if (!STATE.codeEdited && document.getElementById('code-textarea')) {
      const activeMember = STATE.members.find(m => m.id === STATE.previewMemberId) || STATE.members[0] || null;
      document.getElementById('code-textarea').value = buildEmailHTML(activeMember);
    }
  } else {
    previewArea?.classList.remove('hidden');
    codeView?.classList.remove('visible');
    previewShell?.classList.toggle('mobile', mode === 'mobile');
    if (STATE.codeEdited) {
      updatePreview();
    }
  }
}

function getHTML() {
  const activeMember = STATE.members.find(m => m.id === STATE.previewMemberId) || STATE.members[0] || null;
  return buildEmailHTML(activeMember);
}

function downloadFile(name, content) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/html' }));
  a.download = name; a.click();
}

// ── EXPORT CSV ALL MEMBERS ─────────────────────────────────
function exportToCSV() {
  if (!STATE.members.length) {
    showToast('No members to export!', 'warn');
    return;
  }
  let csv = 'name,email,college,phone,group,customKey,customValue\n';
  STATE.members.forEach(m => {
    const customKey = m.custom ? Object.keys(m.custom)[0] : '';
    const customVal = m.custom && customKey ? m.custom[customKey] : '';
    csv += `"${m.name.replace(/"/g, '""')}","${m.email.replace(/"/g, '""')}","${(m.college || '').replace(/"/g, '""')}","${(m.phone || '').replace(/"/g, '""')}","${(m.group || '').replace(/"/g, '""')}","${customKey.replace(/"/g, '""')}","${customVal.replace(/"/g, '""')}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mailpilot_members.csv';
  a.click();
}

// ── INITIALIZE COMPOSER ────────────────────────────────────
function initComposer() {
  loadComposer();
  
  // Render sidebar search/members list
  renderComposerMembers();
  
  // Select first member for preview if available
  if (STATE.members.length && !STATE.previewMemberId) {
    STATE.previewMemberId = STATE.members[0].id;
  }
  
  // Initial preview draw
  updatePreview();

  if (window.composerInitialized) {
    return;
  }
  window.composerInitialized = true;

  // Sidebar design/content/style tabs
  document.querySelectorAll('.stab').forEach(stab => {
    stab.addEventListener('click', () => {
      document.querySelectorAll('.stab').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.stab-panel').forEach(p => p.classList.remove('active'));
      stab.classList.add('active');
      document.getElementById('stab-' + stab.dataset.stab)?.classList.add('active');
    });
  });

  // Viewport buttons
  document.getElementById('vp-desktop')?.addEventListener('click', () => setViewport('desktop'));
  document.getElementById('vp-mobile')?.addEventListener('click', () => setViewport('mobile'));
  document.getElementById('vp-code')?.addEventListener('click', () => setViewport('code'));

  // Live input change watchers
  document.querySelectorAll('.composer-sidebar input, .composer-sidebar textarea, .composer-sidebar select').forEach(el => {
    el.addEventListener('input', () => {
      STATE.codeEdited = false;
      scheduleUpdate();
    });
    el.addEventListener('change', () => {
      STATE.codeEdited = false;
      scheduleUpdate();
    });
  });

  // Manual code editor editing
  document.getElementById('code-textarea')?.addEventListener('input', () => {
    STATE.codeEdited = true;
    scheduleUpdate();
  });

  // Template cards
  document.querySelectorAll('.tpl-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.tpl-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      STATE.template = card.dataset.template;
      applyTemplateDefaults(card.dataset.template);
      scheduleUpdate();
    });
  });

  // Banner dropdown
  document.getElementById('select-banner')?.addEventListener('change', function () {
    const customField = document.getElementById('custom-banner-field');
    if (customField) customField.style.display = this.value === 'custom' ? 'block' : 'none';
    scheduleUpdate();
  });

  // Event details toggle
  document.getElementById('toggle-event-details')?.addEventListener('change', function () {
    STATE.showEventDetails = this.checked;
    const details = document.getElementById('event-details-fields');
    if (details) details.style.display = this.checked ? 'block' : 'none';
    scheduleUpdate();
  });

  // Color selection
  document.querySelectorAll('.c-dot:not(.accent-dot)').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.c-dot:not(.accent-dot)').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      STATE.btnColor = dot.dataset.color;
      const customColorInput = document.getElementById('custom-btn-color');
      if (customColorInput) customColorInput.value = dot.dataset.color;
      scheduleUpdate();
    });
  });
  document.getElementById('custom-btn-color')?.addEventListener('input', function () {
    STATE.btnColor = this.value;
    document.querySelectorAll('.c-dot:not(.accent-dot)').forEach(d => d.classList.remove('active'));
    scheduleUpdate();
  });

  // Accent selector
  document.querySelectorAll('.accent-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.accent-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      STATE.accentColor = dot.dataset.color;
      const customAccentInput = document.getElementById('custom-accent-color');
      if (customAccentInput) customAccentInput.value = dot.dataset.color;
      scheduleUpdate();
    });
  });
  document.getElementById('custom-accent-color')?.addEventListener('input', function () {
    STATE.accentColor = this.value;
    document.querySelectorAll('.accent-dot').forEach(d => d.classList.remove('active'));
    scheduleUpdate();
  });

  // Background selection options
  document.querySelectorAll('#bg-color-opts .radio-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('#bg-color-opts .radio-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      STATE.bgColor = opt.dataset.bg;
      scheduleUpdate();
    });
  });

  // Font options selection
  document.querySelectorAll('#font-opts .radio-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('#font-opts .radio-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      STATE.fontFamily = opt.dataset.font;
      scheduleUpdate();
    });
  });

  // Width selection options
  document.querySelectorAll('#width-opts .radio-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('#width-opts .radio-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      STATE.emailWidth = parseInt(opt.dataset.width);
      scheduleUpdate();
    });
  });

  // Action button events
  document.getElementById('btn-copy-html')?.addEventListener('click', () => {
    navigator.clipboard.writeText(getHTML()).then(() => showToast('HTML copied to clipboard!'));
  });
  document.getElementById('btn-download-html')?.addEventListener('click', () => {
    downloadFile('email-template.html', getHTML());
  });
  document.getElementById('btn-copy-code')?.addEventListener('click', () => {
    const textarea = document.getElementById('code-textarea');
    if (textarea) {
      navigator.clipboard.writeText(textarea.value).then(() => showToast('HTML copied!'));
    }
  });
  document.getElementById('btn-dl-code')?.addEventListener('click', () => {
    const textarea = document.getElementById('code-textarea');
    if (textarea) {
      downloadFile('email-template.html', textarea.value);
    }
  });
  document.getElementById('btn-apply-code')?.addEventListener('click', () => {
    STATE.codeEdited = true;
    const textarea = document.getElementById('code-textarea');
    if (textarea) {
      const html = textarea.value;
      const iframe = document.getElementById('email-preview-iframe');
      if (iframe) {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open(); doc.write(html); doc.close();
      }
      showToast('Custom HTML applied to preview!', 'ok');
    }
  });

  // Topbar export CSV click handler
  document.getElementById('btn-export-csv')?.addEventListener('click', exportToCSV);

  // Search input in sidebar member switcher
  document.getElementById('composer-member-search')?.addEventListener('input', function () {
    renderComposerMembers(this.value);
  });

  // Quick navigation block
  document.getElementById('btn-open-broadcast-from-composer')?.addEventListener('click', () => {
    window.location.href = 'broadcast.html';
  });
  document.getElementById('btn-quick-send')?.addEventListener('click', () => {
    window.location.href = 'broadcast.html';
  });
}

document.addEventListener('DOMContentLoaded', initComposer);
