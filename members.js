/* ══════════════════════════════════════════════════════════
   MAILPILOT — Members Javascript Module
   ══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  load(); // Load state from localStorage via common.js
  initMembers();
});

function initMembers() {
  refreshAll();
  
  // Event listeners
  document.getElementById('btn-save-member').addEventListener('click', saveMember);
  
  // Add Member Choice Modal Trigger
  document.getElementById('btn-add-member-open').addEventListener('click', () => {
    document.getElementById('modal-add-choice').classList.add('open');
  });

  // Choice Selection Actions
  document.getElementById('choice-individual').addEventListener('click', () => {
    document.getElementById('modal-add-choice').classList.remove('open');
    clearMemberForm();
    document.getElementById('m-edit-id').value = '';
    document.getElementById('modal-member-title').innerHTML = '<i class="fa-solid fa-user-plus" style="color:var(--green);margin-right:0.4rem"></i> Add New Member';
    document.getElementById('btn-save-member').innerHTML = '<i class="fa-solid fa-plus"></i> Add Member';
    document.getElementById('modal-member').classList.add('open');
  });

  document.getElementById('choice-bulk').addEventListener('click', () => {
    document.getElementById('modal-add-choice').classList.remove('open');
    document.getElementById('modal-csv').classList.add('open');
    document.getElementById('csv-preview-wrap').style.display = 'none';
    document.getElementById('modal-csv-confirm').disabled = true;
    STATE.pendingCSVData = [];
  });

  // Close Choice Modal triggers
  ['modal-add-choice-close', 'modal-add-choice-cancel'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      document.getElementById('modal-add-choice').classList.remove('open');
    });
  });

  // Close Member Modal triggers
  ['modal-member-close', 'modal-member-cancel'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      document.getElementById('modal-member').classList.remove('open');
      clearMemberForm();
    });
  });

  // Manage Groups Modal Trigger
  document.getElementById('btn-manage-groups-open').addEventListener('click', () => {
    renderGroups();
    document.getElementById('modal-groups').classList.add('open');
  });

  // Close Groups Modal triggers
  ['modal-groups-close', 'modal-groups-cancel'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      document.getElementById('modal-groups').classList.remove('open');
    });
  });

  document.getElementById('member-table-search').addEventListener('input', function() {
    renderMemberTable(this.value, document.getElementById('filter-group').value);
  });
  document.getElementById('filter-group').addEventListener('change', function() {
    renderMemberTable(document.getElementById('member-table-search').value, this.value);
  });
  
  if (window.isCurrentUserAdmin && window.isCurrentUserAdmin()) {
    const trashLabel = document.getElementById('admin-trash-toggle-label');
    if (trashLabel) trashLabel.style.display = 'flex';
    document.getElementById('filter-deleted')?.addEventListener('change', function() {
      renderMemberTable(document.getElementById('member-table-search').value, document.getElementById('filter-group').value);
    });
  }
  
  // Select all checkbox
  document.getElementById('select-all-cb').addEventListener('change', function() {
    document.querySelectorAll('.row-cb').forEach(cb => cb.checked = this.checked);
    updateSelectedCount();
  });
  document.getElementById('members-table-body').addEventListener('change', e => {
    if (e.target.classList.contains('row-cb')) updateSelectedCount();
  });
  
  // Clear all
  document.getElementById('btn-clear-all-members').addEventListener('click', () => {
    if (!STATE.members.length) { showToast('No members to clear', 'warn'); return; }
    if (!confirm(`Delete all ${STATE.members.length} members? This cannot be undone.`)) return;
    STATE.members = [];
    STATE.previewMemberId = null;
    save(); refreshAll(); showToast('All members cleared');
  });

  // Clean list
  document.getElementById('btn-clean-members').addEventListener('click', () => {
    if (!STATE.members.length) { showToast('No members to clean', 'warn'); return; }
    const before = STATE.members.length;
    const seen = new Set();
    STATE.members = STATE.members.filter(m => {
      const email = (m.email || '').trim().toLowerCase();
      if (!isValidEmail(email)) return false;   // remove invalid
      if (seen.has(email)) return false;         // remove duplicate
      seen.add(email);
      return true;
    });
    const removed = before - STATE.members.length;
    if (removed === 0) { showToast('List is already clean! No issues found.', 'ok'); return; }
    save(); refreshAll();
    showToast(`Removed ${removed} invalid/duplicate member${removed !== 1 ? 's' : ''}`, 'ok');
  });

  // Export CSV
  document.getElementById('btn-export-members').addEventListener('click', exportCSV);

  // Add group
  document.getElementById('btn-add-group').addEventListener('click', () => {
    const val = document.getElementById('new-group-input').value.trim();
    if (!val) return;
    if (STATE.groups.includes(val)) { showToast('Group already exists', 'warn'); return; }
    STATE.groups.push(val);
    document.getElementById('new-group-input').value = '';
    save(); renderGroups(); showToast(`Group "${val}" added`);
  });

  // Modal CSV import
  document.getElementById('btn-import-csv-open').addEventListener('click', () => {
    document.getElementById('modal-csv').classList.add('open');
    document.getElementById('csv-preview-wrap').style.display = 'none';
    document.getElementById('modal-csv-confirm').disabled = true;
    STATE.pendingCSVData = [];
  });
  ['modal-csv-close', 'modal-csv-cancel'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => document.getElementById('modal-csv').classList.remove('open'));
  });

  const modalDrop = document.getElementById('modal-csv-drop');
  const modalInput = document.getElementById('modal-csv-input');
  modalDrop.addEventListener('click', () => modalInput.click());
  modalDrop.addEventListener('dragover', e => { e.preventDefault(); modalDrop.classList.add('drag'); });
  modalDrop.addEventListener('dragleave', () => modalDrop.classList.remove('drag'));
  modalDrop.addEventListener('drop', e => {
    e.preventDefault(); modalDrop.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f) handleCSVFile(f, modalDrop, document.getElementById('modal-csv-confirm'),
      document.getElementById('csv-preview-info'),
      document.getElementById('csv-preview-table'),
      document.getElementById('csv-preview-wrap'));
  });
  modalInput.addEventListener('change', function() {
    if (this.files[0]) handleCSVFile(this.files[0], modalDrop, document.getElementById('modal-csv-confirm'),
      document.getElementById('csv-preview-info'),
      document.getElementById('csv-preview-table'),
      document.getElementById('csv-preview-wrap'));
    this.value = '';
  });
  document.getElementById('modal-csv-confirm').addEventListener('click', () => {
    if (!STATE.pendingCSVData.length) return;
    importMembers(STATE.pendingCSVData);
    document.getElementById('modal-csv').classList.remove('open');
  });
}

function refreshAll() {
  renderMemberTable(
    document.getElementById('member-table-search').value,
    document.getElementById('filter-group').value
  );
  renderGroups();
  updateMemberCounts();
}
window.refreshAll = refreshAll;

function updateMemberCounts() {
  const activeMembers = STATE.members.filter(m => !m.is_deleted);
  const topCount = document.getElementById('top-member-count');
  if (topCount) topCount.textContent = activeMembers.length;
  
  const statTotal = document.getElementById('stat-total');
  if (statTotal) statTotal.textContent = activeMembers.length;
  
  const statGroups = document.getElementById('stat-groups');
  if (statGroups) statGroups.textContent = STATE.groups.length;
  
  const mBadge = document.getElementById('members-count-badge');
  if (mBadge) mBadge.textContent = `${activeMembers.length} members`;
}

function updateSelectedCount() {
  const sel = document.querySelectorAll('.row-cb:checked').length;
  const el = document.getElementById('aud-count-selected');
  if (el) el.textContent = sel;
}

STATE.sortCol = 'name';
STATE.sortDir = 1;

window.sortTable = function(col) {
  if (STATE.sortCol === col) STATE.sortDir *= -1;
  else { STATE.sortCol = col; STATE.sortDir = 1; }
  renderMemberTable(
    document.getElementById('member-table-search').value,
    document.getElementById('filter-group').value
  );
};

function renderMemberTable(filter = '', group = 'all') {
  const body = document.getElementById('members-table-body');
  const showDeleted = document.getElementById('filter-deleted')?.checked || false;

  let list = STATE.members.filter(m => {
    if (m.is_deleted && !showDeleted) return false;
    if (showDeleted && !m.is_deleted) return false;

    const q = filter.toLowerCase();
    const match = !q || 
      (m.name || '').toLowerCase().includes(q) || 
      (m.email || '').toLowerCase().includes(q) || 
      (m.college || '').toLowerCase().includes(q) || 
      (m.phone || '').toLowerCase().includes(q) || 
      (m.group || '').toLowerCase().includes(q);
    const grpMatch = group === 'all' || m.group === group;
    return match && grpMatch;
  });

  const col = STATE.sortCol || 'name';
  const dir = STATE.sortDir || 1;
  list.sort((a, b) => {
    const av = (a[col] || '').toLowerCase();
    const bv = (b[col] || '').toLowerCase();
    return av < bv ? -dir : av > bv ? dir : 0;
  });

  ['name', 'email', 'college', 'group'].forEach(c => {
    const el = document.getElementById('sort-' + c);
    if (!el) return;
    el.textContent = c === col ? (dir === 1 ? '↑' : '↓') : '↕';
    el.style.opacity = c === col ? '1' : '0.4';
  });

  updateMemberCounts();
  if (!list.length) {
    const activeTotal = STATE.members.filter(m => !m.is_deleted).length;
    if (activeTotal === 0 && !showDeleted) {
      body.innerHTML = `<tr>
        <td colspan="7" style="text-align:center;color:var(--text2);padding:4rem 2rem">
          <div style="font-size:2rem;margin-bottom:1rem;color:var(--text3);opacity:0.6"><i class="fa-solid fa-users-slash"></i></div>
          <h4 style="margin:0 0 0.4rem 0;color:var(--text);font-weight:600">No members in directory yet</h4>
          <p style="margin:0;font-size:0.8rem;color:var(--text2);opacity:0.8">Get started by clicking the "Add Member" button to add manually or upload a CSV file.</p>
        </td>
      </tr>`;
    } else {
      body.innerHTML = `<tr>
        <td colspan="7" style="text-align:center;color:var(--text2);padding:4rem 2rem">
          <div style="font-size:2rem;margin-bottom:1rem;color:var(--text3);opacity:0.6"><i class="fa-solid fa-magnifying-glass"></i></div>
          <h4 style="margin:0;color:var(--text);font-weight:600">No matching members found</h4>
          <p style="margin:0;font-size:0.8rem;color:var(--text2);opacity:0.8;margin-top:0.3rem">Try adjusting your search query or group filter selection.</p>
        </td>
      </tr>`;
    }
    return;
  }
  body.innerHTML = list.map(m => `
  <tr>
    <td><input type="checkbox" class="row-cb" data-id="${m.id}"></td>
    <td><div class="td-avatar">
      <div class="member-avatar" style="background:${avatarColor(m.name)};width:28px;height:28px;font-size:0.68rem">${initials(m.name)}</div>
      <span>${esc(m.name)}</span>
    </div></td>
    <td style="color:var(--text2)">${esc(m.email)}</td>
    <td style="color:var(--text2)">${esc(m.college || '—')}</td>
    <td style="color:var(--text2)">${esc(m.phone || '—')}</td>
    <td>${m.group ? `<span class="group-pill" style="background:${avatarColor(m.group)}22;color:${avatarColor(m.group)}">${esc(m.group)}</span>` : ''}</td>
    <td><div class="td-actions">
      ${m.is_deleted ? `
        <button class="tbl-btn edit" onclick="restoreMember('${m.id}')" title="Restore Member"><i class="fa-solid fa-arrow-rotate-left"></i></button>
        <button class="tbl-btn del" onclick="adminDeleteMemberPermanent('${m.id}')" title="Delete Permanently"><i class="fa-solid fa-trash-can" style="color:var(--red)"></i></button>
      ` : `
        <button class="tbl-btn edit" onclick="editMember('${m.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="tbl-btn del" onclick="deleteMember('${m.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
      `}
    </div></td>
  </tr>`).join('');
}

window.editMember = function(id) {
  const m = STATE.members.find(x => x.id === id);
  if (!m) return;
  document.getElementById('m-edit-id').value = id;
  document.getElementById('m-name').value = m.name;
  document.getElementById('m-email').value = m.email;
  document.getElementById('m-college').value = m.college || '';
  document.getElementById('m-phone').value = m.phone || '';
  document.getElementById('m-group').value = m.group || 'General';
  const keys = m.custom ? Object.keys(m.custom) : [];
  document.getElementById('m-custom-key').value = keys[0] || '';
  document.getElementById('m-custom-val').value = m.custom && keys[0] ? m.custom[keys[0]] : '';
  
  document.getElementById('modal-member-title').innerHTML = '<i class="fa-solid fa-pen" style="color:var(--accent2);margin-right:0.4rem"></i> Edit Member';
  document.getElementById('btn-save-member').innerHTML = '<i class="fa-solid fa-save"></i> Save Changes';
  
  document.getElementById('modal-member').classList.add('open');
};

window.deleteMember = function(id) {
  if (!confirm('Delete this member?')) return;
  const m = STATE.members.find(x => x.id === id);
  if (m) {
    m.is_deleted = true;
  }
  if (STATE.previewMemberId === id) STATE.previewMemberId = null;
  deleteMemberFromDatabase(id, false);
  save(); refreshAll(); showToast('Member deleted');
};

window.restoreMember = async function(id) {
  const m = STATE.members.find(x => x.id === id);
  if (!m) return;
  m.is_deleted = false;
  try {
    const table = getSupabaseTableName();
    const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch(`${window.API_BASE_URL}/api/members?table=${encodeURIComponent(table)}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify([m])
    });
    const result = await response.json();
    if (result.success) {
      showToast('Member restored');
      save(); refreshAll();
    } else {
      showToast('Failed to restore member', 'err');
    }
  } catch(e) {
    console.error('Error restoring member:', e);
  }
};

window.adminDeleteMemberPermanent = function(id) {
  if (!confirm('Permanently delete this member? This action cannot be undone.')) return;
  STATE.members = STATE.members.filter(m => m.id !== id);
  if (STATE.previewMemberId === id) STATE.previewMemberId = null;
  deleteMemberFromDatabase(id, true);
  save(); refreshAll(); showToast('Member permanently deleted');
};

function cancelEdit() {
  document.getElementById('modal-member').classList.remove('open');
  clearMemberForm();
}

function clearMemberForm() {
  ['m-name', 'm-email', 'm-college', 'm-phone', 'm-group', 'm-custom-key', 'm-custom-val'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function saveMember() {
  const name    = document.getElementById('m-name').value.trim();
  const email   = document.getElementById('m-email').value.trim();
  const college = document.getElementById('m-college').value.trim();
  const phone   = document.getElementById('m-phone').value.trim();
  const group   = document.getElementById('m-group').value.trim() || 'General';
  const cKey    = document.getElementById('m-custom-key').value.trim();
  const cVal    = document.getElementById('m-custom-val').value.trim();
  const editId  = document.getElementById('m-edit-id').value;

  if (!name || !email) { showToast('Name and Email are required', 'warn'); return; }
  if (!isValidEmail(email)) { showToast('Invalid email address format', 'warn'); return; }

  const existingMember = editId ? STATE.members.find(m => m.id === editId) : null;
  const createdBy = (existingMember && existingMember.custom && existingMember.custom.created_by) || (window.getCurrentUserEmail ? window.getCurrentUserEmail() : '') || 'unknown';
  const custom = { ...(cKey ? { [cKey]: cVal } : {}), created_by: createdBy };
  const member = { id: editId || uid(), name, email, college, phone, group, custom };

  if (editId) {
    const idx = STATE.members.findIndex(m => m.id === editId);
    if (idx > -1) STATE.members[idx] = member;
    showToast('Member updated!');
    cancelEdit();
  } else {
    if (STATE.members.find(m => m.email.toLowerCase() === email.toLowerCase())) {
      showToast('A member with this email already exists', 'warn');
      return;
    }
    STATE.members.push(member);
    showToast('Member added!');
  }

  if (group && !STATE.groups.includes(group)) {
    STATE.groups.push(group);
    renderGroups();
  }

  clearMemberForm();
  save();
  refreshAll();
}

function exportCSV() {
  if (!STATE.members.length) { showToast('No members to export', 'warn'); return; }
  const rows = [['name', 'email', 'college', 'phone', 'group', 'custom_key', 'custom_val'],
    ...STATE.members.map(m => {
      const keys = m.custom ? Object.keys(m.custom) : [];
      const cKey = keys[0] || '';
      const cVal = m.custom && keys[0] ? m.custom[keys[0]] : '';
      return [m.name, m.email, m.college || '', m.phone || '', m.group || '', cKey, cVal];
    })
  ];
  let csvContent = "data:text/csv;charset=utf-8,";
  rows.forEach(r => {
    csvContent += r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",") + "\r\n";
  });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `mailpilot_members_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function renderGroups() {
  const wrap = document.getElementById('group-list-display');
  const sel  = document.getElementById('filter-group');
  const colors = ['#1f6feb', '#238636', '#d29922', '#a371f7', '#da3633', '#39c5cf'];

  wrap.innerHTML = STATE.groups.map((g, i) => `
    <div class="group-tag-item" style="background:${colors[i % colors.length]}22;color:${colors[i % colors.length]};border-color:${colors[i % colors.length]}44">
      ${esc(g)}
      ${g !== 'General' ? `<span class="del-g" onclick="deleteGroup('${esc(g)}')">✕</span>` : ''}
    </div>`).join('');

  const gOpts = `<option value="all">All Groups</option>${STATE.groups.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('')}`;
  sel.innerHTML = gOpts;
}

window.deleteGroup = function(g) {
  STATE.groups = STATE.groups.filter(x => x !== g);
  save(); renderGroups();
};

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const standardFields = ['name', 'full name', 'fullname', 'email', 'email address', 'college', 'organization', 'org', 'company', 'phone', 'phone number', 'mobile', 'group', 'tag', 'category'];

  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+)/g) || [];
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/"/g, '').trim(); });
    
    const nameKey = headers.find(h => ['name', 'full name', 'fullname'].includes(h.toLowerCase()));
    const emailKey = headers.find(h => ['email', 'email address'].includes(h.toLowerCase()));
    const collegeKey = headers.find(h => ['college', 'organization', 'org', 'company'].includes(h.toLowerCase()));
    const phoneKey = headers.find(h => ['phone', 'phone number', 'mobile'].includes(h.toLowerCase()));
    const groupKey = headers.find(h => ['group', 'tag', 'category'].includes(h.toLowerCase()));
    
    const custom = {};
    headers.forEach(h => {
      const hl = h.toLowerCase();
      if (!standardFields.includes(hl)) {
        custom[h] = obj[h];
      }
    });
    const userEmail = window.getCurrentUserEmail ? window.getCurrentUserEmail() : '';
    custom.created_by = userEmail || 'unknown';

    return {
      id: uid(),
      name:    nameKey ? obj[nameKey] : '',
      email:   emailKey ? obj[emailKey] : '',
      college: collegeKey ? obj[collegeKey] : '',
      phone:   phoneKey ? obj[phoneKey] : '',
      group:   groupKey ? obj[groupKey] : 'General',
      custom:  custom,
    };
  }).filter(m => m.name && m.email);
}

function handleCSVFile(file, previewEl, confirmBtn, infoEl, tableEl, previewWrap) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = parseCSV(e.target.result);
    STATE.pendingCSVData = data;
    if (infoEl) infoEl.textContent = `Found ${data.length} valid member(s) in CSV`;
    if (tableEl && data.length) {
      tableEl.querySelector('thead').innerHTML = '<tr><th>Name</th><th>Email</th><th>College</th><th>Phone</th><th>Group</th></tr>';
      tableEl.querySelector('tbody').innerHTML = data.slice(0, 5).map(m => `
        <tr>
          <td style="padding:0.3rem 0.6rem">${esc(m.name)}</td>
          <td style="padding:0.3rem 0.6rem;color:var(--text2)">${esc(m.email)}</td>
          <td style="padding:0.3rem 0.6rem;color:var(--text2)">${esc(m.college)}</td>
          <td style="padding:0.3rem 0.6rem;color:var(--text2)">${esc(m.phone)}</td>
          <td style="padding:0.3rem 0.6rem">${esc(m.group)}</td>
        </tr>`).join('') + (data.length > 5 ? `<tr><td colspan="5" style="padding:0.3rem 0.6rem;color:var(--text2);font-size:0.72rem">...and ${data.length - 5} more</td></tr>` : '');
    }
    if (previewWrap) previewWrap.style.display = 'block';
    if (confirmBtn) confirmBtn.disabled = data.length === 0;
    if (data.length === 0) showToast('No valid members found in CSV', 'err');
  };
  reader.readAsText(file);
}

function importMembers(data) {
  let added = 0, skipped = 0;
  data.forEach(m => {
    if (STATE.members.find(x => x.email.toLowerCase() === m.email.toLowerCase())) { skipped++; return; }
    STATE.members.push(m);
    if (m.group && !STATE.groups.includes(m.group)) STATE.groups.push(m.group);
    added++;
  });
  save(); refreshAll();
  showToast(`Imported ${added} members${skipped ? `, skipped ${skipped} duplicates` : ''}`);
}
