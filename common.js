/* ══════════════════════════════════════════════════════════
   MAILPILOT — Common Javascript Library
   ══════════════════════════════════════════════════════════ */

window.API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
  ? 'http://localhost:3000'
  : window.location.origin;

// ── SIDEBAR NAVIGATION SHELL ────────────────────────────────
// Determine current page for active state
const _currentPage = (() => {
  const p = window.location.pathname.split('/').pop() || '';
  if (p.includes('dashboard')) return 'dashboard';
  if (p.includes('composer') || p === '' || p === 'dashboard.html') return 'composer';
  if (p.includes('members')) return 'members';
  if (p.includes('broadcast')) return 'broadcast';
  if (p.includes('template')) return 'templates';
  if (p.includes('stats')) return 'analytics';
  if (p.includes('setting')) return 'settings';
  if (p.includes('profile')) return 'profile';
  if (p.includes('admin')) return 'admin';
  return 'dashboard';
})();

const _NAV_PAGES = {
  dashboard: 'dashboard.html',
  composer:  'composer.html',
  members:   'members.html',
  broadcast: 'broadcast.html',
  templates: 'template.html',
  analytics: 'stats.html',
  settings:  'setting.html',
  profile:   'profile.html',
  admin:     'admin.html',
};

// Auth pages that should NOT get the sidebar
const _AUTH_PAGES = ['login.html','register.html','reset.html','verify.html'];
const _isAuthPage = _AUTH_PAGES.some(p => window.location.pathname.includes(p));

function initSidebar() {
  if (_isAuthPage) return;

  // ── Build sidebar HTML ──
  const sidebarHTML = `
  <div class="sidebar-overlay" id="mp-sidebar-overlay"></div>
  <aside class="app-sidebar${localStorage.getItem('mf_sidebar_collapsed')==='true'?' collapsed':''}" id="mp-sidebar">
    <div class="sidebar-collapse-btn" id="mp-collapse-btn" title="Toggle sidebar">
      <i class="fa-solid fa-chevron-left"></i>
    </div>
    <a class="sidebar-brand" href="dashboard.html">
      <img src="logo.png" alt="MailPilot" onerror="this.style.display='none'">
      <div class="sidebar-brand-text">
        <span class="sidebar-brand-name">MailPilot</span>
        <span class="sidebar-brand-tag">Studio v2.0</span>
      </div>
    </a>
    <nav class="sidebar-nav">
      <div class="nav-group">
        <div class="nav-group-label">Main</div>
        <a class="nav-item" data-page="dashboard" href="dashboard.html">
          <i class="fa-solid fa-chart-pie"></i><span class="nav-label">Dashboard</span>
        </a>
        <a class="nav-item" data-page="composer" href="composer.html">
          <i class="fa-solid fa-pen-nib"></i><span class="nav-label">Composer</span>
        </a>
      </div>
      <div class="nav-group">
        <div class="nav-group-label">Outreach</div>
        <a class="nav-item" data-page="members" href="members.html">
          <i class="fa-solid fa-users"></i><span class="nav-label">Members</span>
          <span class="nav-count" id="sb-member-count">0</span>
        </a>
        <a class="nav-item" data-page="broadcast" href="broadcast.html">
          <i class="fa-solid fa-satellite-dish"></i><span class="nav-label">Broadcast</span>
        </a>
        <a class="nav-item" data-page="templates" href="template.html">
          <i class="fa-solid fa-layer-group"></i><span class="nav-label">Templates</span>
        </a>
      </div>
      <div class="nav-group">
        <div class="nav-group-label">Insights</div>
        <a class="nav-item" data-page="analytics" href="stats.html">
          <i class="fa-solid fa-chart-line"></i><span class="nav-label">Analytics</span>
        </a>
      </div>
      <div class="nav-group">
        <div class="nav-group-label">Account</div>
        <a class="nav-item" data-page="settings" href="setting.html">
          <i class="fa-solid fa-gear"></i><span class="nav-label">Settings</span>
        </a>
        <a class="nav-item" data-page="profile" href="profile.html">
          <i class="fa-solid fa-user"></i><span class="nav-label">Profile</span>
        </a>
      </div>
      <div class="nav-group" id="mp-admin-nav" style="display:none">
        <div class="nav-group-label">Administration</div>
        <a class="nav-item" data-page="admin" href="admin.html">
          <i class="fa-solid fa-shield-halved" style="color:var(--gold)"></i>
          <span class="nav-label">Admin Panel</span>
        </a>
      </div>
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user-dropdown" id="mp-user-dropdown">
        <a class="sud-item" href="profile.html"><i class="fa-solid fa-user"></i> My Profile</a>
        <a class="sud-item" href="setting.html"><i class="fa-solid fa-gear"></i> Settings</a>
        <div class="sud-sep"></div>
        <div class="sud-item" id="mp-sidebar-logout" style="color:var(--red)">
          <i class="fa-solid fa-right-from-bracket"></i> Log Out
        </div>
      </div>
      <div class="sidebar-user" id="mp-sidebar-user">
        <div class="sidebar-avatar" id="mp-sb-avatar">MP</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name" id="mp-sb-name">MailPilot User</div>
          <div class="sidebar-user-email" id="mp-sb-email">Loading…</div>
        </div>
        <i class="fa-solid fa-ellipsis-vertical sidebar-user-chevron" style="color:var(--text2);font-size:0.65rem;flex-shrink:0"></i>
      </div>
    </div>
  </aside>`;

  // Insert sidebar before body's first child
  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

  // Wrap existing body content (everything after the sidebar) in .main-content
  const sidebar = document.getElementById('mp-sidebar');
  const overlay = document.getElementById('mp-sidebar-overlay');

  // Collect all body children that aren't the sidebar/overlay
  const children = Array.from(document.body.children).filter(
    el => el !== sidebar && el !== overlay && el.id !== 'mp-sidebar' && el.id !== 'mp-sidebar-overlay'
  );

  const mainContent = document.createElement('div');
  mainContent.className = 'main-content';
  children.forEach(c => mainContent.appendChild(c));
  document.body.appendChild(mainContent);

  // Mark active nav item
  document.querySelectorAll('.nav-item[data-page]').forEach(link => {
    link.classList.toggle('active', link.dataset.page === _currentPage);
  });

  // Member count
  try {
    const cnt = JSON.parse(localStorage.getItem('mf_members') || '[]').length;
    const el = document.getElementById('sb-member-count');
    if (el) el.textContent = cnt;
  } catch(e){}

  // ── Collapse ──
  const collapseBtn = document.getElementById('mp-collapse-btn');
  collapseBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('mf_sidebar_collapsed', sidebar.classList.contains('collapsed'));
  });

  // ── Mobile ──
  const mobileBtn = document.getElementById('mp-mobile-menu');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('show');
    });
  }
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('show');
  });

  // ── User dropdown ──
  const userBtn = document.getElementById('mp-sidebar-user');
  const userDrop = document.getElementById('mp-user-dropdown');
  userBtn.addEventListener('click', e => { e.stopPropagation(); userDrop.classList.toggle('show'); });
  document.addEventListener('click', () => userDrop.classList.remove('show'));

  // ── Logout ──
  document.getElementById('mp-sidebar-logout').addEventListener('click', async () => {
    try {
      const client = getSupabaseClient && getSupabaseClient();
      if (client) await client.auth.signOut();
    } catch(e){}
    localStorage.removeItem('mf_session');
    window.location.href = 'login.html';
  });
}

function updateSidebarUser(user) {
  if (_isAuthPage) return;
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = name.substring(0,2).toUpperCase();

  const nameEl = document.getElementById('mp-sb-name');
  const emailEl = document.getElementById('mp-sb-email');
  const avatarEl = document.getElementById('mp-sb-avatar');

  if (nameEl) nameEl.textContent = name;
  if (emailEl) emailEl.textContent = email;
  if (avatarEl) {
    if (avatarUrl) avatarEl.innerHTML = `<img src="${avatarUrl}" alt="${name}">`;
    else avatarEl.textContent = initials;
  }

  // Show admin nav if owner
  const ownerEmails = ['harsh@ascentcircle.in','ascentcircle.community@gmail.com','admin@mailpilot.app'];
  if (email && ownerEmails.includes(email.toLowerCase())) {
    const adminNav = document.getElementById('mp-admin-nav');
    if (adminNav) adminNav.style.display = 'block';
  }
}

// Auto-init sidebar on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initSidebar);

function isCurrentUserAdmin() {
  try {
    const session = JSON.parse(localStorage.getItem('mf_session') || '{}');
    const email = session.user?.email || '';
    const ownerEmails = ['harsh@ascentcircle.in','ascentcircle.community@gmail.com','admin@mailpilot.app'];
    return !!(email && ownerEmails.includes(email.toLowerCase()));
  } catch(e) {
    return false;
  }
}
window.isCurrentUserAdmin = isCurrentUserAdmin;

// ── LEGACY COMPAT ────────────────────────────────────────────
const IS_EMBEDDED = false; // No longer used — sidebar is built-in
function hideEmbeddedChrome() {} // no-op kept for compatibility



// ── UTILITIES ──────────────────────────────────────────────
function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());
}

// ── STATE ──────────────────────────────────────────────────
const STATE = {
  members: [],
  groups: ['General'],
  selectedIds: new Set(JSON.parse(localStorage.getItem('mf_selected_ids') || '[]')),
  selectedMemberId: null,
  previewMemberId: null,
  template: 'event',
  btnColor: '#1f6feb',
  accentColor: '#1f6feb',
  bgColor: '#ffffff',
  fontFamily: 'Arial, sans-serif',
  emailWidth: 600,
  showEventDetails: true,
  broadcasting: false,
  broadcastPaused: false,
  broadcastIndex: 0,
  broadcastAudience: 'all',
  broadcastGroup: '',
  pendingCSVData: [],
  editingId: null,
  codeEdited: false,
};

// ── PERSISTENCE ────────────────────────────────────────────
function save() {
  try {
    // 1. Identify deleted IDs
    const oldM = localStorage.getItem('mf_members');
    if (oldM) {
      const oldMembers = JSON.parse(oldM);
      const newIds = new Set(STATE.members.map(m => m.id));
      const deletedIds = JSON.parse(localStorage.getItem('mf_deleted_ids') || '[]');
      const deletedSet = new Set(deletedIds);
      
      oldMembers.forEach(m => {
        if (m.id && !newIds.has(m.id)) {
          deletedSet.add(m.id);
        }
      });

      // If any of the new members has an ID that was marked as deleted, remove it
      STATE.members.forEach(m => {
        if (m.id && deletedSet.has(m.id)) {
          deletedSet.delete(m.id);
        }
      });
      
      localStorage.setItem('mf_deleted_ids', JSON.stringify(Array.from(deletedSet)));
    }
  } catch (e) {
    console.error("Error tracking deleted members: ", e);
  }

  // 2. Save current state to local storage cache
  localStorage.setItem('mf_members', JSON.stringify(STATE.members));
  localStorage.setItem('mf_groups', JSON.stringify(STATE.groups));
  localStorage.setItem('mf_last_modified', Date.now().toString());

  // 3. Asynchronously sync to remote database
  syncWithDatabase();
}

function saveSelectedIds() {
  localStorage.setItem('mf_selected_ids', JSON.stringify(Array.from(STATE.selectedIds)));
}

function load() {
  try {
    const m = localStorage.getItem('mf_members');
    const g = localStorage.getItem('mf_groups');
    if (m) {
      STATE.members = JSON.parse(m);
    } else {
      STATE.members = [];
    }
    if (g) {
      STATE.groups = JSON.parse(g);
    } else {
      STATE.groups = ['General'];
    }
  } catch (e) {
    console.error("Error loading common state: ", e);
  }

  // Initialize and load campaigns synchronously from local storage cache
  // Guard: don't re-init campaigns if we're already inside initActiveCampaign
  // (prevents the circular: load → loadCampaignsFromLocalStorage → initActiveCampaign → loadComposer → load)
  if (!_initActiveCampaignRunning) {
    STATE.campaigns = [];
    STATE.activeCampaign = null;
    loadCampaignsFromLocalStorage();
  }

  // Skip fetching members from database on auth pages (login/register)
  const path = window.location.pathname;
  const isAuthPage = path.includes('login.html') || path.includes('register.html');
  if (isAuthPage) return;

  // Background sync with remote Supabase database
  setTimeout(() => {
    fetchMembersFromSupabase();
  }, 100);
}

function getSupabaseTableName() {
  return 'users';
}

async function getAuthHeaders(customHeaders = {}) {
  const headers = { ...customHeaders };
  try {
    const client = initSupabaseClient();
    if (client) {
      const { data: { session } } = await client.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    }
  } catch (e) {
    console.error('Error getting auth headers:', e);
  }
  return headers;
}

async function syncWithDatabase() {
  if (!STATE.members || STATE.members.length === 0) return;
  try {
    const table = getSupabaseTableName();
    const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch(`${window.API_BASE_URL}/api/members?table=${encodeURIComponent(table)}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(STATE.members)
    });
    const result = await response.json();
    if (!result.success) {
      console.error('Database sync failed:', result.error);
    }
  } catch (e) {
    console.error('Network error during database sync:', e);
  }
}

async function fetchMembersFromSupabase() {
  try {
    const table = getSupabaseTableName();
    const headers = await getAuthHeaders();
    const response = await fetch(`${window.API_BASE_URL}/api/members?table=${encodeURIComponent(table)}`, {
      headers: headers
    });
    if (!response.ok) throw new Error(response.statusText);
    const result = await response.json();
    if (result.success && result.data) {
      const deletedIds = new Set(JSON.parse(localStorage.getItem('mf_deleted_ids') || '[]'));
      
      const remoteMembers = result.data.map(remote => ({
        id: remote.id || remote.email,
        name: remote.name || remote.email.split('@')[0],
        email: remote.email,
        college: remote.college || '',
        phone: remote.phone || '',
        group: remote.group || (remote.role === 'admin' ? 'Admin' : 'General'),
        custom: remote.custom || null,
        is_deleted: !!remote.is_deleted
      }));

      // Filter out deleted IDs
      const filteredRemote = remoteMembers.filter(m => !deletedIds.has(m.id));

      const localMembers = STATE.members || [];
      const mergedMap = new Map();

      // remote first
      filteredRemote.forEach(m => mergedMap.set(m.email.toLowerCase(), m));
      // local overrides
      localMembers.forEach(m => {
        if (!deletedIds.has(m.id)) {
          mergedMap.set(m.email.toLowerCase(), m);
        }
      });

      STATE.members = Array.from(mergedMap.values());

      const groups = Array.from(new Set(STATE.members.map(m => m.group || 'General')));
      if (!groups.includes('General')) groups.unshift('General');
      STATE.groups = groups;

      localStorage.setItem('mf_members', JSON.stringify(STATE.members));
      localStorage.setItem('mf_groups', JSON.stringify(STATE.groups));

      // Refresh UI if page functions exist
      if (typeof window.refreshAll === 'function') {
        window.refreshAll();
      } else if (typeof window.updateBroadcastAudience === 'function') {
        window.updateBroadcastAudience();
        if (typeof window.renderGroups === 'function') {
          window.renderGroups();
        }
      }
    }
  } catch (e) {
    console.error('Error fetching members from database:', e);
  }
}

async function deleteMemberFromDatabase(idOrEmail, hard = false) {
  try {
    const table = getSupabaseTableName();
    const headers = await getAuthHeaders();
    const response = await fetch(`${window.API_BASE_URL}/api/members/${encodeURIComponent(idOrEmail)}?table=${encodeURIComponent(table)}${hard ? '&hard=true' : ''}`, {
      method: 'DELETE',
      headers: headers
    });
    const result = await response.json();
    if (!result.success) {
      console.error('Database delete failed:', result.error);
    }
  } catch (e) {
    console.error('Network error during database delete:', e);
  }
}

// ── SUPABASE CONFIGURATION ─────────────────────────────────
// Credentials are fetched from the server's /api/config endpoint
let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';
let mpClient = null;
let currentClientUrl = null;
let currentClientKey = null;
let _configLoaded = false;
let _configPromise = null;

async function loadSupabaseConfig() {
  if (_configLoaded) return;
  if (_configPromise) return _configPromise;
  _configPromise = (async () => {
    try {
      const res = await fetch(`${window.API_BASE_URL || ''}/api/config`);
      if (!res.ok) throw new Error('Config endpoint failed');
      const cfg = await res.json();
      SUPABASE_URL = cfg.supabaseUrl || '';
      SUPABASE_ANON_KEY = cfg.supabaseAnonKey || '';
      _configLoaded = true;
    } catch (e) {
      console.warn('Failed to load Supabase config from server:', e.message);
    }
  })();
  return _configPromise;
}

// Auto-load config on page load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => loadSupabaseConfig());
}

function initSupabaseClient(forceRecreate = false) {
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    return null;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase config not yet loaded. Call loadSupabaseConfig() first.');
    return null;
  }
  let url = SUPABASE_URL;
  let key = SUPABASE_ANON_KEY;

  if (!mpClient || forceRecreate || currentClientUrl !== url || currentClientKey !== key) {
    mpClient = window.supabase.createClient(url, key);
    currentClientUrl = url;
    currentClientKey = key;
  }
  return mpClient;
}

// AUTH GUARD — redirects unauthenticated users to login, and authenticated
// users away from login/register back to the app.
let realtimeSubscribed = false;
function setupRealtime() {
  if (realtimeSubscribed) return;
  const client = initSupabaseClient();
  if (!client) return;
  
  const table = getSupabaseTableName();
  client
    .channel('public-users-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: table }, payload => {
      console.log('Realtime change in users:', payload);
      fetchMembersFromSupabase();
    })
    .subscribe();
    
  client
    .channel('public-audit-logs-sync')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auditLogs' }, payload => {
      console.log('Realtime change in auditLogs:', payload);
      if (typeof window.refreshAuditLogs === 'function') {
        window.refreshAuditLogs(payload.new);
      }
    })
    .subscribe();
    
  realtimeSubscribed = true;
}

async function logAudit(actionType, details) {
  try {
    const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch(`${window.API_BASE_URL}/api/logs`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ actionType, details })
    });
    const result = await response.json();
    if (!result.success) {
      console.error('Failed to log audit event:', result.error);
    }
  } catch (e) {
    console.error('Network error during audit logging:', e);
  }
}
window.logAudit = logAudit;

async function checkAuth() {
  // When embedded inside index.html (app shell), skip auth checks (parent handles it)
  if (IS_EMBEDDED) return;

  // Ensure Supabase config is loaded from server before proceeding
  await loadSupabaseConfig();

  const path = window.location.pathname;
  const isAuthPage = path.includes('login.html') || path.includes('register.html');
  const client = initSupabaseClient();
  if (!client) {
    // SDK not ready yet — retry after short delay
    setTimeout(checkAuth, 200);
    return;
  }
  try {
    let { data: { session } } = await client.auth.getSession();

    // ── DEV MOCK SESSION FALLBACK ──────────────────────────────────────
    // When logged in via the local dev credentials (admin@mailpilot.app),
    // the Supabase SDK doesn't know about the manually-stored mock token.
    // Read it directly and treat it as a valid session so the page loads.
    if (!session) {
      try {
        const storageKey = `sb-${SUPABASE_URL.split('://')[1].split('.')[0]}-auth-token`;
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const mock = JSON.parse(raw);
          if (mock && mock.access_token === 'mock-access-token' && mock.expires_at > Math.floor(Date.now() / 1000)) {
            session = mock; // use the mock object as a session stand-in
          }
        }
      } catch (e) {
        console.warn('Could not read mock session:', e);
      }
    }
    // ──────────────────────────────────────────────────────────────────

    const isRecovery = window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');

    if (isRecovery && !path.includes('login.html')) {
      console.log('Redirecting recovery flow to login.html');
      window.location.href = '/login.html' + window.location.hash + window.location.search;
      return;
    }

    if (!session && !isAuthPage) {
      // No active session outside auth pages → force login
      window.location.href = '/login.html';
      return;
    }
    if (session && isAuthPage) {
      // Already logged in → skip auth pages, unless we are in the recovery flow
      if (isRecovery) {
        console.log('Password recovery session detected. Skipping redirect to index.html.');
      } else {
        window.location.href = '/dashboard.html'; // Goes to dashboard
        return;
      }
    }
    if (session) {
      if (session.access_token !== 'mock-access-token') {
        // Only set up realtime for real Supabase sessions
        setupRealtime();
      }

      // Hardened security: Purge any legacy client-side SMTP credentials from local storage
      try {
        localStorage.removeItem('mf_smtp_pass');
        localStorage.removeItem('mf_smtp_user');
        
        // Remove password from mf_settings cache
        const rawSettings = localStorage.getItem('mf_settings');
        if (rawSettings) {
          const settingsObj = JSON.parse(rawSettings);
          if (settingsObj.smtpPass) {
            delete settingsObj.smtpPass;
            localStorage.setItem('mf_settings', JSON.stringify(settingsObj));
          }
        }
        
        // Remove password from mf_composer_meta cache
        const rawComposer = localStorage.getItem('mf_composer_meta');
        if (rawComposer) {
          const compMetaObj = JSON.parse(rawComposer);
          if (compMetaObj.smtpPass) {
            delete compMetaObj.smtpPass;
            localStorage.setItem('mf_composer_meta', JSON.stringify(compMetaObj));
          }
        }
      } catch (e) {
        console.warn('Error cleaning up legacy local storage SMTP keys:', e);
      }

      updateProfileDropdownWithUser(session.user);
      updateSidebarUser(session.user); // update sidebar with logged-in user
      
      // Check banner dismissal state in Supabase metadata
      if (session.user?.user_metadata?.dismissed_smtp_banner) {
        const banner = document.getElementById('smtp-info-banner');
        if (banner) banner.style.display = 'none';
      }
      
      fetchCampaignsFromSupabase();
    }
  } catch (e) {
    console.error('checkAuth error:', e);
    if (!isAuthPage) window.location.href = '/login.html';
  }
}

async function dismissSmtpInfoBanner() {
  const banner = document.getElementById('smtp-info-banner');
  if (banner) banner.style.display = 'none';
  const client = initSupabaseClient();
  if (client) {
    try {
      const { data: { session } } = await client.auth.getSession();
      if (session && session.user) {
        await client.auth.updateUser({
          data: { dismissed_smtp_banner: true }
        });
      }
    } catch(e) {
      console.warn('Failed to save banner dismissal to Supabase:', e);
    }
  }
}


function updateProfileDropdownWithUser(user) {
  const profileTrigger = document.getElementById('profile-trigger');
  const avatarLg = document.querySelector('.profile-avatar-lg');
  const infoH4 = document.querySelector('.profile-info h4');
  const infoP = document.querySelector('.profile-info p');
  
  const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
  const userInitials = displayName.substring(0, 2).toUpperCase();
  const avatarUrl = user.user_metadata?.avatar_url;

  if (profileTrigger) {
    if (avatarUrl) {
      profileTrigger.innerHTML = `<img src="${avatarUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;display:block;">`;
    } else {
      profileTrigger.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:600">${userInitials}</div>`;
    }
  }

  if (avatarLg) {
    if (avatarUrl) {
      avatarLg.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      avatarLg.style.background = 'transparent';
    } else {
      avatarLg.textContent = userInitials;
    }
  }

  if (infoH4) infoH4.textContent = displayName;
  if (infoP) infoP.textContent = user.email;

  const menu = document.querySelector('.profile-menu');
  if (menu) {
    const ownerEmails = ['harsh@ascentcircle.in', 'ascentcircle.community@gmail.com', 'admin@mailpilot.app'];
    const isOwner = ownerEmails.includes(user.email.toLowerCase());
    
    // Only show admin item if the user is the owner
    if (isOwner) {
      if (!document.getElementById('profile-admin-item')) {
        const adminItem = document.createElement('div');
        adminItem.id = 'profile-admin-item';
        adminItem.className = 'profile-menu-item';
        adminItem.style.cursor = 'pointer';
        adminItem.innerHTML = `
          <i class="fa-solid fa-shield-halved" style="color:var(--gold)"></i>
          <div>
            <span>Admin Dashboard</span>
            <small>Member directory, logs & stats</small>
          </div>
        `;
        adminItem.addEventListener('click', () => {
          window.location.href = 'admin.html';
        });
        
        const logoutItem = document.getElementById('profile-logout-item');
        if (logoutItem) {
          menu.insertBefore(adminItem, logoutItem);
        } else {
          menu.appendChild(adminItem);
        }
      }
    } else {
      // Remove it if it exists and user is not admin
      const adminItem = document.getElementById('profile-admin-item');
      if (adminItem) adminItem.remove();
    }

    if (!document.getElementById('profile-logout-item')) {
      const logoutItem = document.createElement('div');
      logoutItem.id = 'profile-logout-item';
      logoutItem.className = 'profile-menu-item';
      logoutItem.style.cursor = 'pointer';
      logoutItem.style.borderTop = '1px solid var(--border)';
      logoutItem.style.marginTop = '0.5rem';
      logoutItem.style.paddingTop = '0.75rem';
      logoutItem.innerHTML = `
        <i class="fa-solid fa-right-from-bracket" style="color:var(--red)"></i>
        <div>
          <span style="color:var(--red)">Log Out</span>
          <small>Sign out of session</small>
        </div>
      `;
      logoutItem.addEventListener('click', async () => {
        const client = initSupabaseClient();
        if (client) {
          await client.auth.signOut();
        }
        window.location.href = 'login.html';
      });
      menu.appendChild(logoutItem);
    }
  }
}

// ── UTILS ──────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function ts() { return new Date().toTimeString().slice(0, 8); }
function avatarColor(name) {
  const colors = ['#1f6feb', '#238636', '#d29922', '#a371f7', '#da3633', '#39c5cf', '#f76791', '#fb8500'];
  let h = 0; for (let c of (name || '?')) h = (h << 5) - h + c.charCodeAt(0);
  return colors[Math.abs(h) % colors.length];
}
function initials(name) {
  const p = (name || '?').trim().split(/\s+/);
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
}
function mergeTags(text, member) {
  if (!member) return text;
  let res = text
    .replace(/\{\{Name\}\}/gi, member.name || '')
    .replace(/\{\{Email\}\}/gi, member.email || '')
    .replace(/\{\{College\}\}/gi, member.college || '')
    .replace(/\{\{Phone\}\}/gi, member.phone || '')
    .replace(/\{\{Group\}\}/gi, member.group || '');

  if (member.custom) {
    Object.keys(member.custom).forEach(k => {
      // Escape any regex special chars in the key before building the pattern
      const safeK = String(k).replace(/[.\\*+?^${}()|[\]]/g, '\\$&');
      const regex = new RegExp('\\{\\{\\s*' + safeK + '\\s*\\}\\}', 'gi');
      res = res.replace(regex, member.custom[k] || '');
    });
  }
  return res;
}

function showToast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.querySelector('#toast-msg').textContent = msg;
  const icon = t.querySelector('i');
  if (icon) {
    icon.className = `fa-solid fa-${type === 'ok' ? 'circle-check' : type === 'err' ? 'circle-xmark' : 'triangle-exclamation'}`;
  }
  t.className = `toast show ${type}`;
  clearTimeout(t._t); t._t = setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ── SHARED NAVIGATION / HEADER LOGIC ──────────────────────
function initializeHeader() {
  load();

  // Inject campaign selector in the topbar
  const topbar = document.querySelector('.topbar');
  if (topbar && !document.getElementById('topbar-campaign-select-wrap')) {
    const topbarRight = topbar.querySelector('.topbar-right');
    const wrap = document.createElement('div');
    wrap.id = 'topbar-campaign-select-wrap';
    wrap.className = 'campaign-selector-wrap';
    wrap.style.cssText = 'display:flex;align-items:center;gap:0.5rem;margin-left:auto;margin-right:1rem;';
    wrap.innerHTML = `
      <i class="fa-solid fa-bullhorn" style="color:var(--accent)"></i>
      <span style="font-weight:600;font-size:0.85rem;color:var(--text2)">Campaign:</span>
      <select id="topbar-campaign-select" class="form-control" style="width:160px;padding:0.25rem 0.5rem;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text);font-size:0.85rem;cursor:pointer;">
        <option value="">Loading...</option>
      </select>
      <button class="icon-btn" id="btn-manage-campaigns" title="Manage Campaigns" style="padding:0.25rem;width:28px;height:28px;border-radius:4px;background:var(--bg3);border:1px solid var(--border);color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <i class="fa-solid fa-folder-gear"></i>
      </button>
    `;
    if (topbarRight) {
      topbar.insertBefore(wrap, topbarRight);
    } else {
      topbar.appendChild(wrap);
    }
  }

  // Inject campaign manager modal
  injectCampaignModal();
  
  const manageBtn = document.getElementById('btn-manage-campaigns');
  if (manageBtn) {
    manageBtn.addEventListener('click', () => {
      renderCampaignsList();
      document.getElementById('campaign-manager-modal').style.display = 'flex';
    });
  }

  // Update topbar campaign dropdown with local cached version instantly
  updateTopbarCampaignSelect();
  
  // Active Tab Highlight based on current pathname
  const path = window.location.pathname;
  let currentTab = 'composer';
  if (path.includes('composer.html')) currentTab = 'composer';
  else if (path.includes('members.html')) currentTab = 'members';
  else if (path.includes('broadcast.html')) currentTab = 'broadcast';
  else if (path.includes('stats.html')) currentTab = 'stats';
  else if (path.includes('template.html')) currentTab = 'templates';
  else if (path.includes('dashboard.html')) currentTab = 'dashboard';
  else if (path.includes('setting.html')) currentTab = 'settings';
  else if (path.includes('admin.html')) currentTab = 'admin';

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === currentTab);
    btn.addEventListener('click', (e) => {
      const tabName = btn.dataset.tab;
      // If embedded inside app shell, delegate navigation to parent
      if (IS_EMBEDDED && window.parent !== window) {
        const pageMap = { composer:'composer', members:'members', broadcast:'broadcast', stats:'analytics', templates:'templates', dashboard:'dashboard', settings:'settings', admin:'admin' };
        window.parent.postMessage({ type: 'mailpilot-navigate', page: pageMap[tabName] || tabName }, '*');
        return;
      }
      let targetPage = 'composer.html';
      if (tabName === 'members') targetPage = 'members.html';
      else if (tabName === 'broadcast') targetPage = 'broadcast.html';
      else if (tabName === 'stats') targetPage = 'stats.html';
      else if (tabName === 'templates') targetPage = 'template.html';
      else if (tabName === 'dashboard') targetPage = 'dashboard.html';
      else if (tabName === 'settings') targetPage = 'setting.html';
      else if (tabName === 'admin') targetPage = 'admin.html';
      window.location.href = targetPage;
    });
  });

  // Update Topbar member badge
  const badgeVal = document.getElementById('top-member-count');
  if (badgeVal) badgeVal.textContent = STATE.members.length;
  const badgeAlt = document.getElementById('members-count-badge');
  if (badgeAlt) badgeAlt.textContent = `${STATE.members.length} members`;

  // Theme support
  const activeTheme = localStorage.getItem('mf_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', activeTheme);
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.querySelector('i').className = `fa-solid fa-${activeTheme === 'dark' ? 'moon' : 'sun'}`;
    themeBtn.addEventListener('click', () => {
      const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('mf_theme', nextTheme);
      themeBtn.querySelector('i').className = `fa-solid fa-${nextTheme === 'dark' ? 'moon' : 'sun'}`;
    });
  }

  // Profile Dropdown Toggle
  const profileTrigger = document.getElementById('profile-trigger');
  const profileDropdown = document.getElementById('profile-dropdown');
  if (profileTrigger && profileDropdown) {
    profileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('show');
    });
    
    document.addEventListener('click', (e) => {
      if (!profileDropdown.contains(e.target) && e.target !== profileTrigger) {
        profileDropdown.classList.remove('show');
      }
    });

    // Populate profile information from state metadata
    const dbCount = document.getElementById('profile-db-count');
    if (dbCount) dbCount.textContent = `${STATE.members.length} members`;

    try {
      const meta = JSON.parse(localStorage.getItem('mf_composer_meta') || '{}');
      const smtpHost = document.getElementById('profile-smtp-host');
      const smtpFrom = document.getElementById('profile-smtp-from');
      if (smtpHost && meta.smtpHost) smtpHost.textContent = meta.smtpHost;
      if (smtpFrom && meta.smtpFromEmail) smtpFrom.textContent = meta.smtpFromEmail;
    } catch (e) {}

    const pdProfile = document.getElementById('pd-profile');
    if (pdProfile) {
      pdProfile.addEventListener('click', () => {
        window.location.href = 'profile.html';
      });
    }
    const pdSettings = document.getElementById('pd-settings');
    if (pdSettings) {
      pdSettings.addEventListener('click', () => {
        window.location.href = 'setting.html';
      });
    }
    const pdLogout = document.getElementById('pd-logout');
    if (pdLogout) {
      pdLogout.addEventListener('click', async () => {
        const client = initSupabaseClient();
        if (client) await client.auth.signOut();
        window.location.href = 'login.html';
      });
    }
  }
}

// ── CAMPAIGNS PERSISTENCE & HELPERS ─────────────────────────
async function fetchCampaignsFromSupabase() {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${window.API_BASE_URL}/api/campaigns`, { headers });
    
    if (!response.ok) {
      console.warn('Supabase campaign API failed. Falling back to local storage campaign cache.');
      loadCampaignsFromLocalStorage();
      return;
    }
    
    const result = await response.json();
    if (result.success && result.data) {
      STATE.campaigns = result.data;
      initActiveCampaign();
    } else {
      loadCampaignsFromLocalStorage();
    }
  } catch (e) {
    console.error('Error fetching campaigns:', e);
    loadCampaignsFromLocalStorage();
  }
}

function loadCampaignsFromLocalStorage() {
  try {
    const cached = localStorage.getItem('mf_campaigns_fallback');
    if (cached) {
      STATE.campaigns = JSON.parse(cached);
    } else {
      STATE.campaigns = [];
    }
    initActiveCampaign();
  } catch (e) {
    console.error('Error loading fallback campaigns:', e);
    STATE.campaigns = [];
    initActiveCampaign();
  }
}

function saveCampaignsToLocalStorage() {
  try {
    localStorage.setItem('mf_campaigns_fallback', JSON.stringify(STATE.campaigns));
  } catch (e) {
    console.error('Error saving fallback campaigns:', e);
  }
}

// Guard flag to prevent circular: initActiveCampaign → loadComposer → load → loadCampaignsFromLocalStorage → initActiveCampaign
let _initActiveCampaignRunning = false;

function initActiveCampaign() {
  if (_initActiveCampaignRunning) return; // prevent re-entrant call
  _initActiveCampaignRunning = true;
  try {
    const activeId = localStorage.getItem('mf_active_campaign_id');
    let active = STATE.campaigns.find(c => c.id === activeId);
    
    if (!active && STATE.campaigns.length > 0) {
      active = STATE.campaigns[0];
    }
    
    if (!active) {
      const defaultMeta = JSON.parse(localStorage.getItem('mf_composer_meta') || '{}');
      active = {
        id: 'camp_default',
        name: 'Default Campaign',
        status: 'draft',
        progress_index: 0,
        total_members: 0,
        sent_count: 0,
        failed_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mapMetaToCampaign(defaultMeta, active);
      STATE.campaigns.push(active);
      saveCampaignsToLocalStorage();
      saveCampaignRemote(active);
    }
    
    STATE.activeCampaign = active;
    localStorage.setItem('mf_active_campaign_id', active.id);
    
    const meta = mapCampaignToMeta(active);
    localStorage.setItem('mf_composer_meta', JSON.stringify(meta));
    
    STATE.broadcastAudience = active.audience_filter || 'all';
    STATE.broadcastGroup = active.audience_group || '';
    STATE.broadcastIndex = active.progress_index || 0;
    
    updateTopbarCampaignSelect();
    
    // Notify page-level handlers — these may call load() internally,
    // so the _initActiveCampaignRunning guard above prevents recursion.
    if (typeof window.loadComposer === 'function') {
      window.loadComposer();
    }
    if (typeof window.initBroadcast === 'function') {
      window.initBroadcast();
    }
  } finally {
    _initActiveCampaignRunning = false;
  }
}

function updateTopbarCampaignSelect() {
  const select = document.getElementById('topbar-campaign-select');
  if (!select) return;
  
  select.innerHTML = STATE.campaigns.map(c => `
    <option value="${c.id}" ${STATE.activeCampaign && STATE.activeCampaign.id === c.id ? 'selected' : ''}>
      \uD83D\uDCE3 ${esc(c.name)}
    </option>
  `).join('');
  
  select.onchange = (e) => {
    selectCampaignAndReload(e.target.value);
  };
}

async function selectCampaignAndReload(campaignId) {
  const active = STATE.campaigns.find(c => c.id === campaignId);
  if (!active) return;
  
  STATE.activeCampaign = active;
  localStorage.setItem('mf_active_campaign_id', active.id);
  
  const meta = mapCampaignToMeta(active);
  localStorage.setItem('mf_composer_meta', JSON.stringify(meta));
  
  window.location.reload();
}

let saveCampaignDebounceTimer = null;
async function saveCampaign(campaign) {
  const idx = STATE.campaigns.findIndex(c => c.id === campaign.id);
  if (idx !== -1) {
    STATE.campaigns[idx] = campaign;
  } else {
    STATE.campaigns.push(campaign);
  }
  saveCampaignsToLocalStorage();
  
  clearTimeout(saveCampaignDebounceTimer);
  saveCampaignDebounceTimer = setTimeout(async () => {
    await saveCampaignRemote(campaign);
  }, 1000);
}

async function saveCampaignRemote(campaign) {
  try {
    const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch(`${window.API_BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(campaign)
    });
    if (!response.ok) {
      console.warn('Remote campaign save failed:', await response.text());
    }
  } catch (e) {
    console.error('Remote campaign save network error:', e);
  }
}

function mapCampaignToMeta(c) {
  return {
    subject: c.subject || '',
    title: c.title || '',
    greeting: c.greeting || '',
    body: c.body || '',
    btnText: c.btn_text || '',
    btnUrl: c.btn_url || '',
    signature: c.signature || '',
    footer: c.footer || '',
    orgName: c.org_name || '',
    orgUrl: c.org_url || '',
    banner: c.banner || 'none',
    bannerUrl: c.banner_url || '',
    showEventDetails: c.show_event_details !== undefined ? c.show_event_details : false,
    eventDate: c.event_date || '',
    eventTime: c.event_time || '',
    eventLoc: c.event_location || '',
    eventAgenda: c.event_agenda || '',
    btnColor: c.btn_color || '#1f6feb',
    accentColor: c.accent_color || '#1f6feb',
    bgColor: c.bg_color || '#ffffff',
    fontFamily: c.font_family || 'Arial, sans-serif',
    emailWidth: c.email_width || 600,
    customHtml: c.custom_html || '',
    template: c.template || 'event',
    codeEdited: c.code_edited !== undefined ? c.code_edited : false,
    smtpHost: c.smtp_host || '',
    smtpPort: c.smtp_port || '',
    smtpSecure: c.smtp_secure || '',
    smtpFromName: c.smtp_from_name || '',
    smtpFromEmail: c.smtp_from_email || '',
    smtpUser: c.smtp_user || '',
    smtpPass: c.smtp_pass || '',
    smtpDelay: c.smtp_delay || '300',
    smtpBatchSize: c.smtp_batch_size || '50',
    smtpBatchPause: c.smtp_batch_pause || '10',
    audienceFilter: c.audience_filter || 'all',
    audienceGroup: c.audience_group || ''
  };
}

function mapMetaToCampaign(meta, campaign) {
  campaign.subject = meta.subject || '';
  campaign.title = meta.title || '';
  campaign.greeting = meta.greeting || '';
  campaign.body = meta.body || '';
  campaign.btn_text = meta.btnText || '';
  campaign.btn_url = meta.btnUrl || '';
  campaign.signature = meta.signature || '';
  campaign.footer = meta.footer || '';
  campaign.org_name = meta.orgName || '';
  campaign.org_url = meta.orgUrl || '';
  campaign.banner = meta.banner || 'none';
  campaign.banner_url = meta.bannerUrl || '';
  campaign.show_event_details = !!meta.showEventDetails;
  campaign.event_date = meta.eventDate || '';
  campaign.event_time = meta.eventTime || '';
  campaign.event_location = meta.eventLoc || '';
  campaign.event_agenda = meta.eventAgenda || '';
  campaign.btn_color = meta.btnColor || '#1f6feb';
  campaign.accent_color = meta.accentColor || '#1f6feb';
  campaign.bg_color = meta.bgColor || '#ffffff';
  campaign.font_family = meta.fontFamily || 'Arial, sans-serif';
  campaign.email_width = meta.emailWidth || 600;
  campaign.custom_html = meta.customHtml || '';
  campaign.template = meta.template || 'event';
  campaign.code_edited = !!meta.codeEdited;
  campaign.smtp_host = meta.smtpHost || '';
  campaign.smtp_port = meta.smtpPort || '';
  campaign.smtp_secure = meta.smtpSecure || '';
  campaign.smtp_from_name = meta.smtpFromName || '';
  campaign.smtp_from_email = meta.smtpFromEmail || '';
  campaign.smtp_user = meta.smtpUser || '';
  campaign.smtp_pass = meta.smtpPass || '';
  campaign.smtp_delay = meta.smtpDelay || '300';
  campaign.smtp_batch_size = meta.smtpBatchSize || '50';
  campaign.smtp_batch_pause = meta.smtpBatchPause || '10';
  campaign.audience_filter = meta.audienceFilter || 'all';
  campaign.audience_group = meta.audienceGroup || '';
  return campaign;
}

function injectCampaignModal() {
  if (document.getElementById('campaign-manager-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'campaign-manager-modal';
  modal.className = 'modal-overlay';
  modal.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:9999;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div class="modal-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;width:90%;max-width:550px;box-shadow:var(--shadow);overflow:hidden;animation:fadeIn 0.2s ease;">
      <div class="modal-header" style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <h3 style="font-family:var(--font-d);font-weight:600;margin:0;display:flex;align-items:center;gap:0.5rem;color:var(--text);"><i class="fa-solid fa-folder-gear" style="color:var(--accent)"></i> Manage Campaigns</h3>
        <button class="icon-btn" id="close-campaign-modal" style="background:transparent;border:none;color:var(--text2);cursor:pointer;font-size:1.1rem;"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body" style="padding:1.5rem;max-height:400px;overflow-y:auto;">
        <div style="display:flex;gap:0.5rem;margin-bottom:1.25rem;">
          <input type="text" id="new-campaign-name" placeholder="Enter new campaign name..." class="form-control" style="flex:1;padding:0.5rem;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);">
          <button class="btn btn-gradient" id="btn-create-campaign" style="padding:0.5rem 1rem;display:flex;align-items:center;gap:0.4rem;background:var(--accent);border:none;color:#fff;border-radius:6px;cursor:pointer;"><i class="fa-solid fa-plus"></i> Create</button>
        </div>
        <div id="campaigns-list-container" style="display:flex;flex-direction:column;gap:0.75rem;">
          <!-- Loaded dynamically -->
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Event listeners
  document.getElementById('close-campaign-modal').addEventListener('click', () => {
    modal.style.display = 'none';
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  document.getElementById('btn-create-campaign').addEventListener('click', async () => {
    const input = document.getElementById('new-campaign-name');
    const name = input.value.trim();
    if (!name) {
      alert('Please enter a campaign name.');
      return;
    }
    
    const newCamp = {
      id: 'camp_' + Math.random().toString(36).substring(2, 11),
      name: name,
      status: 'draft',
      progress_index: 0,
      total_members: 0,
      sent_count: 0,
      failed_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (STATE.activeCampaign) {
      const activeMeta = mapCampaignToMeta(STATE.activeCampaign);
      mapMetaToCampaign(activeMeta, newCamp);
      newCamp.id = 'camp_' + Math.random().toString(36).substring(2, 11);
      newCamp.name = name;
      newCamp.status = 'draft';
      newCamp.progress_index = 0;
      newCamp.sent_count = 0;
      newCamp.failed_count = 0;
    }
    
    await saveCampaign(newCamp);
    input.value = '';
    
    selectCampaignAndReload(newCamp.id);
  });
}

function renderCampaignsList() {
  const container = document.getElementById('campaigns-list-container');
  if (!container) return;
  
  if (!STATE.campaigns || STATE.campaigns.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text2);">No campaigns found. Create one above!</div>`;
    return;
  }
  
  container.innerHTML = STATE.campaigns.map(c => {
    const isActive = STATE.activeCampaign && STATE.activeCampaign.id === c.id;
    let badgeColor = 'var(--text2)';
    let badgeBg = 'rgba(255,255,255,0.05)';
    if (c.status === 'sending') {
      badgeColor = 'var(--teal)';
      badgeBg = 'rgba(34,211,238,0.1)';
    } else if (c.status === 'paused') {
      badgeColor = 'var(--gold)';
      badgeBg = 'rgba(245,166,35,0.1)';
    } else if (c.status === 'completed') {
      badgeColor = 'var(--green)';
      badgeBg = 'rgba(34,211,163,0.1)';
    }
    
    const progressText = c.status !== 'draft' ? `(${c.progress_index}/${c.total_members})` : '';
    
    return `
      <div class="campaign-item" style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem;background:${isActive ? 'rgba(79,142,247,0.08)' : 'var(--bg3)'};border:1px solid ${isActive ? 'var(--accent)' : 'var(--border)'};border-radius:8px;transition:var(--transition);">
        <div style="display:flex;flex-direction:column;gap:0.2rem;flex:1;cursor:pointer;" onclick="selectCampaignAndReload('${c.id}')">
          <div style="font-weight:600;color:${isActive ? 'var(--accent)' : 'var(--text)'};display:flex;align-items:center;gap:0.4rem;">
            ${esc(c.name)}
            ${isActive ? '<span style="font-size:0.7rem;background:var(--accent);color:#fff;padding:0.1rem 0.3rem;border-radius:4px;">Active</span>' : ''}
          </div>
          <div style="font-size:0.75rem;color:var(--text2);display:flex;align-items:center;gap:0.5rem;">
            <span style="display:inline-block;padding:0.1rem 0.4rem;border-radius:4px;font-size:0.7rem;color:${badgeColor};background:${badgeBg};text-transform:uppercase;font-weight:700;">${c.status}</span>
            <span>${progressText}</span>
            <span>Created ${new Date(c.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div style="display:flex;gap:0.25rem;">
          <button class="icon-btn" onclick="renameCampaignPrompt('${c.id}', '${esc(c.name)}')" title="Rename" style="padding:0.25rem;background:transparent;border:none;color:var(--text2);cursor:pointer;"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn" onclick="deleteCampaignConfirm('${c.id}')" title="Delete" style="padding:0.25rem;background:transparent;border:none;color:var(--red);cursor:pointer;" ${isActive ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

window.selectCampaignAndReload = selectCampaignAndReload;

window.renameCampaignPrompt = async function(id, currentName) {
  const newName = prompt('Enter new name for the campaign:', currentName);
  if (newName && newName.trim()) {
    const c = STATE.campaigns.find(x => x.id === id);
    if (c) {
      c.name = newName.trim();
      await saveCampaign(c);
      renderCampaignsList();
      updateTopbarCampaignSelect();
    }
  }
};

window.deleteCampaignConfirm = async function(id) {
  if (confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${window.API_BASE_URL}/api/campaigns/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers
      });
      if (response.ok) {
        STATE.campaigns = STATE.campaigns.filter(c => c.id !== id);
        saveCampaignsToLocalStorage();
        renderCampaignsList();
        updateTopbarCampaignSelect();
        showToast('Campaign deleted successfully.');
      } else {
        showToast('Failed to delete campaign from database.', 'err');
      }
    } catch (e) {
      console.error(e);
      showToast('Network error while deleting campaign.', 'err');
    }
  }
};

window.saveCampaign = saveCampaign;

// ── MOBILE VIEW BLOCKER ──────────────────────────────────────
function checkMobileView() {
  if (window.innerWidth < 1024) {
    if (!document.getElementById('mp-mobile-blocker')) {
      const style = document.createElement('style');
      style.id = 'mp-mobile-blocker-style';
      style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@600;700;800&display=swap');
        
        #mp-mobile-blocker {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at center, #0f111a 0%, #07080d 100%);
          z-index: 10000000;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f8fafc;
          font-family: 'Sora', 'Inter', -apple-system, sans-serif;
          padding: 1.5rem;
          box-sizing: border-box;
        }
        
        .mb-container {
          background: rgba(17, 20, 32, 0.7);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 28px;
          padding: 3rem 2rem;
          max-width: 440px;
          width: 100%;
          text-align: center;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1);
          animation: mb-slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .mb-icon-container {
          position: relative;
          width: 110px;
          height: 110px;
          margin: 0 auto 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .mb-icon-glow {
          position: absolute;
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, rgba(129, 140, 248, 0.3) 0%, rgba(192, 132, 252, 0) 70%);
          border-radius: 50%;
          animation: mb-pulse 3s infinite ease-in-out;
        }
        
        .mb-icon {
          font-size: 4rem;
          background: linear-gradient(135deg, #818cf8, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 4px 12px rgba(129, 140, 248, 0.4));
          position: relative;
          z-index: 2;
          animation: mb-float 4s infinite ease-in-out;
        }
        
        .mb-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #c084fc;
          background: rgba(192, 132, 252, 0.1);
          border: 1px solid rgba(192, 132, 252, 0.2);
          padding: 0.4rem 1rem;
          border-radius: 99px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 1.5rem;
        }
        
        .mb-title {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .mb-description {
          font-size: 0.925rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 2rem;
          padding: 0 0.5rem;
        }
        
        .mb-notice-box {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          text-align: left;
          margin-bottom: 1.5rem;
        }
        
        .mb-notice-box i {
          color: #818cf8;
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        .mb-notice-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .mb-notice-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .mb-notice-desc {
          font-size: 0.775rem;
          color: #64748b;
          line-height: 1.4;
        }
        
        .mb-bypass-btn {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          font-family: 'Inter', sans-serif;
          font-size: 0.825rem;
          font-weight: 500;
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .mb-bypass-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #f1f5f9;
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
        }
        
        .mb-bypass-btn:active {
          transform: translateY(0);
        }
        
        @keyframes mb-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes mb-pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.25); opacity: 0.8; }
        }
        
        @keyframes mb-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `;
      document.head.appendChild(style);

      const blocker = document.createElement('div');
      blocker.id = 'mp-mobile-blocker';
      blocker.innerHTML = `
        <div class="mb-container">
          <div class="mb-icon-container">
            <div class="mb-icon-glow"></div>
            <i class="fa-solid fa-laptop-code mb-icon"></i>
          </div>
          <div class="mb-badge">
            <i class="fa-solid fa-mobile-screen"></i> Desktop Optimized
          </div>
          <h2 class="mb-title">MailPilot Studio</h2>
          <p class="mb-description">
            MailPilot's campaign composer, email presets, and administrative logs require a desktop-class viewport for full design editing and layout controls.
          </p>
          <div class="mb-notice-box">
            <i class="fa-solid fa-circle-info"></i>
            <div class="mb-notice-content">
              <span class="mb-notice-title">Switch to a larger screen</span>
              <span class="mb-notice-desc">Please open this URL on a Laptop or Desktop computer, or increase your screen resolution.</span>
            </div>
          </div>
          <button class="mb-bypass-btn" onclick="document.getElementById('mp-mobile-blocker').style.display='none';">
            Bypass & View Anyway (Not Recommended)
          </button>
        </div>
      `;
      document.body.appendChild(blocker);
    }
  } else {
    const blocker = document.getElementById('mp-mobile-blocker');
    if (blocker) blocker.remove();
    const style = document.getElementById('mp-mobile-blocker-style');
    if (style) style.remove();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkMobileView();
  checkAuth();
  initializeHeader();
});

window.addEventListener('resize', checkMobileView);

// ── USER-CAMPAIGN-MEMBER ACTIVITY TRACKING MODAL HANDLERS ──
window.getCurrentUserEmail = function() {
  try {
    const session = JSON.parse(localStorage.getItem('mf_session') || '{}');
    return session.user?.email || '';
  } catch(e) {
    return '';
  }
};

window.getCurrentUserId = function() {
  try {
    const session = JSON.parse(localStorage.getItem('mf_session') || '{}');
    return session.user?.id || '';
  } catch(e) {
    return '';
  }
};

window.viewCampaignsByUser = async function(userId, email) {
  document.getElementById('view-campaigns-user-email').textContent = email;
  const modal = document.getElementById('modal-admin-view-campaigns');
  if (modal) modal.classList.add('open');
  
  const tbody = document.getElementById('modal-admin-view-campaigns-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text2)">Loading campaigns...</td></tr>`;
  }
  
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${window.API_BASE_URL}/api/campaigns?all=true`, { headers });
    if (!response.ok) throw new Error('API failed');
    const result = await response.json();
    const campaigns = result.data || [];
    
    const filtered = campaigns.filter(c => c.user_id === userId || (c.custom && c.custom.created_by === email));
    
    if (tbody) {
      if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text2)">No campaigns run by this user.</td></tr>`;
        return;
      }
      
      tbody.innerHTML = filtered.map(c => {
        const aud = c.audience_filter === 'group' ? `Group: ${c.audience_group}` : (c.audience_filter === 'selected' ? 'Selected' : 'All');
        let statusBadge = '<span class="badge badge-gray">Draft</span>';
        if (c.status === 'completed') statusBadge = '<span class="badge badge-green">Completed</span>';
        else if (c.status === 'sending') statusBadge = '<span class="badge badge-blue">Sending</span>';
        else if (c.status === 'paused') statusBadge = '<span class="badge badge-warn">Paused</span>';
        
        return `<tr>
          <td style="padding:8px;"><strong>${esc(c.name)}</strong></td>
          <td style="padding:8px;">${esc(aud)}</td>
          <td style="padding:8px;">${c.sent_count || 0}</td>
          <td style="padding:8px;">${c.failed_count || 0}</td>
          <td style="padding:8px;">${statusBadge}</td>
          <td style="padding:8px;font-size:0.74rem;color:var(--text2)">${new Date(c.updated_at || c.created_at).toLocaleDateString()}</td>
        </tr>`;
      }).join('');
    }
  } catch(e) {
    console.error(e);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--red2)">Failed to load campaigns.</td></tr>`;
    }
  }
};

window.viewMembersByUser = function(userId, email) {
  document.getElementById('view-members-user-email').textContent = email;
  const modal = document.getElementById('modal-admin-view-members');
  if (modal) modal.classList.add('open');
  
  const tbody = document.getElementById('modal-admin-view-members-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text2)">Filtering members...</td></tr>`;
  }
  
  const filtered = (STATE.members || []).filter(m => m.custom && m.custom.created_by && m.custom.created_by.toLowerCase() === email.toLowerCase());
  
  if (tbody) {
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text2)">No members added by this user.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = filtered.map(m => `
      <tr>
        <td style="padding:8px;"><strong>${esc(m.name)}</strong></td>
        <td style="padding:8px;color:var(--text2)">${esc(m.email)}</td>
        <td style="padding:8px;color:var(--text2)">${esc(m.college || '—')}</td>
        <td style="padding:8px;color:var(--text2)">${esc(m.phone || '—')}</td>
        <td style="padding:8px;">${m.group ? `<span class="group-pill" style="background:${avatarColor(m.group)}22;color:${avatarColor(m.group)}">${esc(m.group)}</span>` : '—'}</td>
      </tr>
    `).join('');
  }
};

// Bind common close actions for the modals
document.addEventListener('DOMContentLoaded', () => {
  const closeCampaignsBtn = document.getElementById('modal-admin-view-campaigns-close');
  const cancelCampaignsBtn = document.getElementById('modal-admin-view-campaigns-cancel');
  const campaignsModal = document.getElementById('modal-admin-view-campaigns');
  if (closeCampaignsBtn && campaignsModal) closeCampaignsBtn.addEventListener('click', () => campaignsModal.classList.remove('open'));
  if (cancelCampaignsBtn && campaignsModal) cancelCampaignsBtn.addEventListener('click', () => campaignsModal.classList.remove('open'));

  const closeMembersBtn = document.getElementById('modal-admin-view-members-close');
  const cancelMembersBtn = document.getElementById('modal-admin-view-members-cancel');
  const membersModal = document.getElementById('modal-admin-view-members');
  if (closeMembersBtn && membersModal) closeMembersBtn.addEventListener('click', () => membersModal.classList.remove('open'));
  if (cancelMembersBtn && membersModal) cancelMembersBtn.addEventListener('click', () => membersModal.classList.remove('open'));
});
