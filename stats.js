/* ══════════════════════════════════════════════════════════
   MAILPILOT — Stats & Analytics Logic (Delivery-only)
   ══════════════════════════════════════════════════════════ */

let allDeliveryLogs = [];
let currentFilter = 'all';

// ── FETCH STATS FROM SERVER ────────────────────────────────
async function fetchStats() {
  const refreshBtn = document.getElementById('btn-refresh-stats');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing...';
  }

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${window.API_BASE_URL}/stats`, { headers });
    if (!response.ok) throw new Error('Server unavailable');

    const data = await response.json();
    if (data.success) {
      // Filter to only sent/failed events — ignore any opens/clicks stored server-side
      allDeliveryLogs = (data.logs || []).filter(l => l.type === 'sent' || l.type === 'failed');
      updateStatsCards();
      renderDeliveryFeed();
    } else {
      throw new Error('Bad response');
    }
  } catch (error) {
    console.warn('Stats server unavailable, loading from campaign state:', error.message);
    loadFromCampaignState();
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Refresh';
    }
  }
}

// ── FALLBACK: BUILD STATS FROM LOCAL CAMPAIGN STATE ────────
function loadFromCampaignState() {
  // Pull delivery numbers directly from the active campaign in STATE
  allDeliveryLogs = [];
  const campaign = STATE.activeCampaign || null;

  if (campaign) {
    const sent = campaign.sent_count || 0;
    const failed = campaign.failed_count || 0;

    // Build synthetic log rows from aggregate counts (no per-email tracking)
    for (let i = 0; i < sent; i++) {
      allDeliveryLogs.push({ type: 'sent', email: '—', subject: campaign.subject || campaign.name || '—', timestamp: campaign.updated_at });
    }
    for (let i = 0; i < failed; i++) {
      allDeliveryLogs.push({ type: 'failed', email: '—', subject: campaign.subject || campaign.name || '—', timestamp: campaign.updated_at });
    }
  }

  updateStatsCards();
  renderDeliveryFeed();
}

// ── UPDATE SUMMARY CARDS ───────────────────────────────────
function updateStatsCards() {
  const sent   = allDeliveryLogs.filter(l => l.type === 'sent').length;
  const failed = allDeliveryLogs.filter(l => l.type === 'failed').length;
  const total  = sent + failed;
  const rate   = total > 0 ? Math.round((sent / total) * 100) : null;

  const el = id => document.getElementById(id);
  if (el('stat-sent'))         el('stat-sent').textContent         = sent;
  if (el('stat-failed'))       el('stat-failed').textContent       = failed;
  if (el('stat-total'))        el('stat-total').textContent        = total;
  if (el('stat-success-rate')) el('stat-success-rate').textContent = rate !== null ? rate + '%' : '—';

  // Progress bars
  const sentPct   = total > 0 ? Math.round((sent / total) * 100) : 0;
  const failedPct = total > 0 ? Math.round((failed / total) * 100) : 0;

  if (el('bar-sent'))        el('bar-sent').style.width        = sentPct + '%';
  if (el('bar-failed'))      el('bar-failed').style.width      = failedPct + '%';
  if (el('lbl-sent-pct'))    el('lbl-sent-pct').textContent    = sentPct + '%';
  if (el('lbl-failed-pct'))  el('lbl-failed-pct').textContent  = failedPct + '%';
}

// ── RENDER DELIVERY LOG TABLE ──────────────────────────────
function renderDeliveryFeed() {
  const tbody = document.getElementById('activity-feed-body');
  if (!tbody) return;

  const searchQuery = (document.getElementById('activity-search')?.value || '').toLowerCase().trim();

  const filtered = allDeliveryLogs.filter(log => {
    if (currentFilter !== 'all' && log.type !== currentFilter) return false;
    if (searchQuery) {
      return (log.email || '').toLowerCase().includes(searchQuery) ||
             (log.subject || '').toLowerCase().includes(searchQuery);
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;color:var(--text2);padding:2rem">
          <i class="fa-solid fa-clipboard-question"></i> No delivery activity matching filter.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(log => {
    const badge = log.type === 'sent'
      ? '<span class="badge badge-blue"><i class="fa-solid fa-paper-plane"></i> Sent</span>'
      : '<span class="badge badge-red"><i class="fa-solid fa-circle-xmark"></i> Failed</span>';

    const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : '—';

    return `
      <tr>
        <td style="font-weight:600;color:var(--text)">${esc(log.email || '—')}</td>
        <td>${badge}</td>
        <td style="color:var(--text2);font-size:0.82rem">${esc(log.subject || '—')}</td>
        <td style="color:var(--text2);font-size:0.8rem">${dateStr}</td>
      </tr>`;
  }).join('');
}

// ── CLEAR STATS ────────────────────────────────────────────
async function clearAllStats() {
  if (!confirm('Clear all delivery statistics? This cannot be undone.')) return;

  try {
    const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch(`${window.API_BASE_URL}/clear-stats`, {
      method: 'POST',
      headers
    });
    if (response.ok) {
      showToast('Statistics cleared.');
      allDeliveryLogs = [];
      updateStatsCards();
      renderDeliveryFeed();
    } else {
      throw new Error();
    }
  } catch {
    // Clear locally even if server is offline
    allDeliveryLogs = [];
    updateStatsCards();
    renderDeliveryFeed();
    showToast('Cleared locally (server offline).', 'warn');
  }
}

// ── INITIALIZE ─────────────────────────────────────────────
function initStats() {
  load();
  fetchStats();

  document.getElementById('btn-refresh-stats')?.addEventListener('click', fetchStats);
  document.getElementById('btn-clear-stats')?.addEventListener('click', clearAllStats);

  document.querySelectorAll('.feed-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.feed-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderDeliveryFeed();
    });
  });

  document.getElementById('activity-search')?.addEventListener('input', renderDeliveryFeed);
}

document.addEventListener('DOMContentLoaded', initStats);
