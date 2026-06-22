/* ============================================================
   CARDIOCARE — JavaScript Application v3
   Auth + Data riil dari backend API (27.817 pasien)
   ============================================================ */

// ─── CONFIGURATION ──────────────────────────────────────
const API_BASE = window.location.origin;
const USE_API = window.location.protocol !== 'file:';

let currentUser = null; // { id, username, name, role }

// ─── INIT ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  checkAuth();
});

// ─── AUTH CHECK ─────────────────────────────────────────
async function checkAuth() {
  if (!USE_API) {
    // file:// mode — skip auth, show app directly
    showApp(null);
    return;
  }
  try {
    const res = await fetch(API_BASE + '/api/auth/me', { credentials: 'same-origin' });
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated) {
        showApp(data.user);
        return;
      }
    }
  } catch (e) { /* ignore */ }
  // Not authenticated — show login
  showLogin();
}

function showLogin() {
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';
}

let appInitialized = false;

function showApp(user) {
  currentUser = user;
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('appContainer').style.display = 'flex';

  // Update header avatar
  if (user) {
    const initials = user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const el = document.getElementById('avatarInitials');
    if (el) el.textContent = initials;
    const avatar = document.getElementById('headerAvatar');
    if (avatar) avatar.title = `${user.name} (${user.role === 'owner' ? 'Owner' : 'Dokter'}) — Klik untuk logout`;

    // Show owner-only nav
    const ownerNav = document.getElementById('navOwnerSection');
    if (ownerNav) ownerNav.style.display = user.role === 'owner' ? 'block' : 'none';
  }

  // Ensure dashboard is the active page
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const dashPage = document.getElementById('page-dashboard');
  const dashNav = document.querySelector('.nav-item[data-page="dashboard"]');
  if (dashPage) dashPage.classList.add('active');
  if (dashNav) dashNav.classList.add('active');

  // Initialize app only once, with a frame delay so canvas gets correct dimensions
  if (!appInitialized) {
    appInitialized = true;
    requestAnimationFrame(() => {
      initNavigation();
      initDoctorForm();
      initClock();
      initECGBanner();
      initPrediksiForm();

      if (USE_API) {
        loadDashboardStats();
        loadPatientTable();
      } else {
        initDashboardChartsFallback();
        initPatientTableFallback();
      }

      if (typeof MODEL_META !== 'undefined') {
        const badge = document.getElementById('modelAccBadge');
        if (badge) badge.textContent = (MODEL_META.accuracy * 100).toFixed(1) + '%';
      }
    });
  }
}

// ─── LOGIN FORM ─────────────────────────────────────────
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    errorEl.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px"></div> Memproses...';

    try {
      const res = await fetch(API_BASE + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        showApp(data.user);
        showToast(`Selamat datang, ${data.user.name}`, 'success');
      } else {
        errorEl.textContent = data.error || 'Login gagal';
        errorEl.style.display = 'block';
      }
    } catch (err) {
      errorEl.textContent = 'Gagal terhubung ke server. Pastikan server berjalan.';
      errorEl.style.display = 'block';
    }

    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Masuk';
  });
}

// ─── LOGOUT ─────────────────────────────────────────────
async function doLogout() {
  if (!confirm('Apakah Anda yakin ingin logout?')) return;
  try {
    await fetch(API_BASE + '/api/logout', { method: 'POST', credentials: 'same-origin' });
  } catch (e) { /* ignore */ }
  currentUser = null;
  showLogin();
  showToast('Anda telah logout', 'info');
}

// ─── NAVIGATION ─────────────────────────────────────────
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-page]');
  const pages = document.querySelectorAll('.page');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      pages.forEach(p => p.classList.remove('active'));
      const target = document.getElementById('page-' + page);
      if (target) target.classList.add('active');
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarOverlay').classList.remove('active');

      // Lazy load pages that need API
      if (USE_API && page === 'ekg') loadEKGPage();
      if (USE_API && page === 'laporan') loadLaporanCharts();
      if (USE_API && page === 'rekammedis') loadEMRDropdown();
      if (USE_API && page === 'akundokter') loadDoctors();
    });
  });

  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
  });
  document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
  });
}

// ─── CLOCK ──────────────────────────────────────────────
function initClock() {
  function update() {
    const now = new Date();
    const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    document.getElementById('headerDate').textContent =
      days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
    document.getElementById('headerTime').textContent =
      String(now.getHours()).padStart(2,'0') + ':' +
      String(now.getMinutes()).padStart(2,'0') + ':' +
      String(now.getSeconds()).padStart(2,'0');
  }
  update();
  setInterval(update, 1000);
}

// ─── ECG BANNER ANIMATION ───────────────────────────────
function initECGBanner() {
  const canvas = document.getElementById('ecgBanner');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function resize() {
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const ecgPattern = [0,0,0,0,0,0,0,0,0.1,0.2,0,-0.1,0,0.05,0,0,0,0.8,1.5,-1.2,0.6,0,0,-0.1,0,0.2,0.3,0.15,0,0,0,0,0,0,0,0];
  let offset = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width, h = canvas.height, mid = h / 2, scale = h * 0.35;

    ctx.strokeStyle = 'rgba(220,38,38,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

    for (let lead = 0; lead < 3; lead++) {
      const yOffset = mid + (lead - 1) * (h * 0.28);
      const alpha = lead === 1 ? 0.6 : 0.2;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(220,38,38,${alpha})`;
      ctx.lineWidth = lead === 1 ? 2.5 : 1.5;
      ctx.lineJoin = 'round';
      for (let x = 0; x < w; x++) {
        const idx = ((x + offset * 2) / 8) % ecgPattern.length;
        const i = Math.floor(idx), frac = idx - i;
        const v1 = ecgPattern[i % ecgPattern.length];
        const v2 = ecgPattern[(i + 1) % ecgPattern.length];
        const val = v1 + (v2 - v1) * frac;
        const y = yOffset - val * scale * (lead === 1 ? 1 : 0.6);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    offset += 1;
    requestAnimationFrame(draw);
  }
  draw();
}

// ═══════════════════════════════════════════════════════
// DASHBOARD — DATA RIIL DARI API
// ═══════════════════════════════════════════════════════
async function loadDashboardStats() {
  try {
    const res = await fetch(API_BASE + '/api/stats');
    const stats = await res.json();

    // Update stat card values
    document.getElementById('statTotalPasien').textContent = stats.total_pasien.toLocaleString('id-ID');
    document.getElementById('statRisiko').textContent = stats.risiko_jantung.toLocaleString('id-ID');
    document.getElementById('statNormal').textContent = stats.tidak_risiko.toLocaleString('id-ID');
    document.getElementById('statLaki').textContent = stats.laki_laki.toLocaleString('id-ID');
    document.getElementById('statPerempuan').textContent = stats.perempuan.toLocaleString('id-ID');
    document.getElementById('statSesak').textContent = stats.keluhan_sesak.toLocaleString('id-ID');
    document.getElementById('statAvgUsia').textContent = stats.rata_usia;

    // Persen risiko
    const pctEl = document.getElementById('statPctRisiko');
    if (pctEl) pctEl.textContent = stats.persen_risiko + '%';

    // Charts with real data
    initDashboardChartsReal(stats);
  } catch (err) {
    console.warn('API stats gagal, menggunakan fallback:', err);
    initDashboardChartsFallback();
  }
}

function initDashboardChartsReal(stats) {
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding = 16;

  // Chart 1: Distribusi Usia + Risiko per Usia
  const ctx1 = document.getElementById('chartHeartRate');
  if (ctx1) {
    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: stats.distribusi_usia.labels,
        datasets: [
          {
            label: 'Total Pasien',
            data: stats.distribusi_usia.total,
            backgroundColor: 'rgba(59,130,246,0.6)',
            borderRadius: 6,
          },
          {
            label: 'Risiko Jantung',
            data: stats.distribusi_usia.risiko,
            backgroundColor: 'rgba(220,38,38,0.7)',
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94A3B8' } },
          y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94A3B8' } }
        },
      }
    });
  }

  // Chart 2: Distribusi BMI
  const ctx2 = document.getElementById('chartMonthly');
  if (ctx2) {
    new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: stats.distribusi_bmi.labels,
        datasets: [{
          data: stats.distribusi_bmi.values,
          backgroundColor: ['#3B82F6','#10B981','#F59E0B','#DC2626'],
          borderWidth: 0, hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { padding: 14 } },
          title: { display: false }
        },
        cutout: '60%',
      }
    });
  }

  // Chart 3: Distribusi Tekanan Darah
  const ctx3 = document.getElementById('chartDisease');
  if (ctx3) {
    new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: stats.distribusi_td.labels,
        datasets: [{
          label: 'Jumlah Pasien',
          data: stats.distribusi_td.values,
          backgroundColor: ['#10B981','#3B82F6','#F59E0B','#DC2626'],
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94A3B8' } },
          y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94A3B8' } }
        },
      }
    });
  }

  // Chart 4: Risiko per Gender
  const ctx4 = document.getElementById('chartBed');
  if (ctx4) {
    new Chart(ctx4, {
      type: 'bar',
      data: {
        labels: ['Laki-laki', 'Perempuan'],
        datasets: [
          { label: 'Normal', data: [stats.laki_laki - stats.risiko_laki, stats.perempuan - stats.risiko_perempuan], backgroundColor: 'rgba(16,185,129,0.6)', borderRadius: 8 },
          { label: 'Risiko Jantung', data: [stats.risiko_laki, stats.risiko_perempuan], backgroundColor: 'rgba(220,38,38,0.7)', borderRadius: 8 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { stacked: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94A3B8' } },
          y: { stacked: true, grid: { display: false }, ticks: { color: '#64748B', font: { weight: 600 } } }
        }
      }
    });
  }
}

// ═══════════════════════════════════════════════════════
// DATA PASIEN — DATA RIIL DARI API
// ═══════════════════════════════════════════════════════
let patientCurrentPage = 1;
let patientPerPage = 15;
let patientSearch = '';
let patientGender = '';
let patientRisiko = '';

function loadPatientTable() {
  const searchEl = document.getElementById('searchPasien');
  if (searchEl) {
    searchEl.addEventListener('input', debounce((e) => {
      patientSearch = e.target.value;
      patientCurrentPage = 1;
      fetchPatients();
    }, 300));
  }
  // Filter controls
  const genderFilter = document.getElementById('filterGender');
  if (genderFilter) genderFilter.addEventListener('change', (e) => {
    patientGender = e.target.value;
    patientCurrentPage = 1;
    fetchPatients();
  });
  const risikoFilter = document.getElementById('filterRisiko');
  if (risikoFilter) risikoFilter.addEventListener('change', (e) => {
    patientRisiko = e.target.value;
    patientCurrentPage = 1;
    fetchPatients();
  });
  fetchPatients();
}

async function fetchPatients() {
  const params = new URLSearchParams({
    page: patientCurrentPage,
    per_page: patientPerPage,
    search: patientSearch,
    gender: patientGender,
    risiko: patientRisiko,
  });

  try {
    const res = await fetch(API_BASE + '/api/patients?' + params);
    const result = await res.json();
    renderPatientTableAPI(result);
  } catch (err) {
    console.error('Error fetching patients:', err);
  }
}

function renderPatientTableAPI(result) {
  const tbody = document.getElementById('tbodyPasien');
  const { data, page, total, total_pages } = result;

  tbody.innerHTML = data.map(p => {
    const statusClass = p.risiko_jantung === 1 ? 'danger' : 'success';
    const sesakBadge = p.sesak_dada === 1
      ? '<span class="badge warning">Ya</span>'
      : '<span class="badge neutral">Tidak</span>';
    return `<tr>
      <td><strong style="color:var(--primary)">${p.no_rm}</strong></td>
      <td>${p.usia} th</td>
      <td>${p.gender_label}</td>
      <td>${sesakBadge}</td>
      <td>${p.bmi}</td>
      <td>${p.td}</td>
      <td><span class="badge ${statusClass}">${p.risiko_label}</span></td>
      <td><button class="btn btn-sm btn-outline" onclick="showPatientDetail(${p.id})" style="padding:5px 10px;font-size:11px">Detail</button></td>
    </tr>`;
  }).join('');

  // Info
  const infoEl = document.getElementById('tableInfo');
  if (infoEl) {
    const start = (page - 1) * patientPerPage + 1;
    const end = Math.min(page * patientPerPage, total);
    infoEl.textContent = `Menampilkan ${start.toLocaleString('id-ID')}-${end.toLocaleString('id-ID')} dari ${total.toLocaleString('id-ID')} pasien`;
  }

  // Pagination
  const pagination = document.getElementById('paginationPasien');
  let html = '';
  if (total_pages > 1) {
    if (page > 1) html += `<button onclick="goPage(${page-1})">&laquo;</button>`;

    let startP = Math.max(1, page - 3);
    let endP = Math.min(total_pages, page + 3);
    if (startP > 1) html += `<button onclick="goPage(1)">1</button><button disabled>...</button>`;
    for (let i = startP; i <= endP; i++) {
      html += `<button class="${i === page ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    }
    if (endP < total_pages) html += `<button disabled>...</button><button onclick="goPage(${total_pages})">${total_pages}</button>`;

    if (page < total_pages) html += `<button onclick="goPage(${page+1})">&raquo;</button>`;
  }
  pagination.innerHTML = html;
}

function goPage(p) {
  patientCurrentPage = p;
  fetchPatients();
}

// Patient detail modal
async function showPatientDetail(id) {
  try {
    const res = await fetch(API_BASE + '/api/patients/' + id);
    const p = await res.json();

    const isRisiko = p.prediksi === 1;
    const prob = (p.probabilitas[1] * 100).toFixed(1);

    document.getElementById('modalBody').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
        <div style="padding:14px;background:var(--bg);border-radius:var(--radius)">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600">No. Rekam Medis</div>
          <div style="font-size:15px;font-weight:700;color:var(--primary);margin-top:2px">${p.no_rm}</div>
        </div>
        <div style="padding:14px;background:var(--bg);border-radius:var(--radius)">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600">Status Aktual (ICD-10)</div>
          <div style="margin-top:4px"><span class="badge ${p.risiko_aktual === 1 ? 'danger' : 'success'}">${p.risiko_label}</span></div>
        </div>
      </div>

      <table style="width:100%;font-size:14px;border-collapse:collapse">
        <tr style="border-bottom:1px solid var(--border-light)">
          <td style="padding:10px 0;color:var(--text-muted);width:160px">Usia</td>
          <td style="padding:10px 0;font-weight:600">${p.usia} tahun</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border-light)">
          <td style="padding:10px 0;color:var(--text-muted)">Jenis Kelamin</td>
          <td style="padding:10px 0;font-weight:600">${p.gender_label}</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border-light)">
          <td style="padding:10px 0;color:var(--text-muted)">Sesak/Nyeri Dada</td>
          <td style="padding:10px 0;font-weight:600">${p.sesak_dada === 1 ? '<span style="color:var(--primary)">Ya (+)</span>' : 'Tidak (-)'}</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border-light)">
          <td style="padding:10px 0;color:var(--text-muted)">BMI</td>
          <td style="padding:10px 0;font-weight:600">${p.bmi} kg/m&sup2;</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border-light)">
          <td style="padding:10px 0;color:var(--text-muted)">Tekanan Darah</td>
          <td style="padding:10px 0;font-weight:600">${p.sistolik}/${p.diastolik} mmHg</td>
        </tr>
      </table>

      <div style="margin-top:20px;padding:20px;border-radius:var(--radius-lg);background:${isRisiko ? 'var(--danger-bg)' : 'var(--success-bg)'}">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${isRisiko ? 'var(--danger)' : 'var(--success)'}">Prediksi Model Decision Tree</div>
        <div style="font-size:20px;font-weight:800;margin-top:6px;color:${isRisiko ? 'var(--danger)' : 'var(--success)'}">${p.prediksi_label}</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-top:4px">Probabilitas risiko: <strong>${prob}%</strong></div>
        <div style="margin-top:8px;font-size:11px;color:var(--text-muted)">
          ${p.risiko_aktual === p.prediksi
            ? '<span style="color:var(--success);font-weight:600">&#10003; Prediksi SESUAI dengan label aktual</span>'
            : '<span style="color:var(--warning);font-weight:600">&#9888; Prediksi BERBEDA dengan label aktual</span>'
          }
        </div>
      </div>
    `;
    document.getElementById('modalOverlay').classList.add('active');
  } catch (err) {
    console.error('Error loading patient detail:', err);
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

// ─── EKG PAGE (REAL DATA) ───────────────────────────────
let ekgLoaded = false;
async function loadEKGPage() {
  if (ekgLoaded) return;
  ekgLoaded = true;

  try {
    // Ambil 6 pasien risiko dari API
    const res = await fetch(API_BASE + '/api/patients?risiko=1&per_page=6');
    const result = await res.json();
    const patients = result.data;

    const statuses = ['Normal','Tachycardia','Bradycardia','Arrhythmia'];
    const statusColors = { Normal: '#10B981', Tachycardia: '#F59E0B', Bradycardia: '#3B82F6', Arrhythmia: '#DC2626' };
    const statusBadges = { Normal: 'success', Tachycardia: 'warning', Bradycardia: 'info', Arrhythmia: 'danger' };

    const grid = document.getElementById('ekgGrid');
    grid.innerHTML = patients.map((p, i) => {
      const status = statuses[i % statuses.length];
      const hr = status === 'Tachycardia' ? 105 + Math.floor(Math.random()*15) :
                 status === 'Bradycardia' ? 48 + Math.floor(Math.random()*8) :
                 status === 'Arrhythmia' ? 85 + Math.floor(Math.random()*20) :
                 65 + Math.floor(Math.random()*15);
      const color = statusColors[status];
      return `
      <div class="ekg-card">
        <div class="ekg-wave"><canvas id="ekgCanvas${i}"></canvas></div>
        <div class="ekg-card-body">
          <h4>${p.no_rm}</h4>
          <div class="ekg-meta">${p.gender_label}, ${p.usia} th, BMI ${p.bmi} — TD ${p.td}</div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="badge ${statusBadges[status]}">${status}</span>
            <strong style="font-size:18px;color:${color}">${hr} <span style="font-size:12px;font-weight:400;color:var(--text-muted)">bpm</span></strong>
          </div>
        </div>
      </div>`;
    }).join('');

    patients.forEach((_, i) => {
      const status = statuses[i % statuses.length];
      const hr = status === 'Tachycardia' ? 110 : status === 'Bradycardia' ? 52 : status === 'Arrhythmia' ? 95 : 72;
      animateEKG(document.getElementById('ekgCanvas' + i), statusColors[status], hr);
    });
  } catch (err) {
    console.error('Error loading EKG data:', err);
  }
}

function animateEKG(canvas, color, hr) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.offsetWidth;
  canvas.height = canvas.parentElement.offsetHeight;
  const w = canvas.width, h = canvas.height;
  const ecgPattern = [0,0,0,0,0,0,0,0.1,0.2,0,-0.1,0,0,0.8,1.4,-1.1,0.5,0,-0.1,0,0.15,0.25,0.1,0,0,0,0,0,0];
  const speed = hr / 60;
  let offset = Math.random() * 100;

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    const mid = h / 2, scale = h * 0.35;
    for (let x = 0; x < w; x++) {
      const idx = ((x + offset * speed * 2) / 6) % ecgPattern.length;
      const ii = Math.floor(idx), frac = idx - ii;
      const v1 = ecgPattern[ii % ecgPattern.length];
      const v2 = ecgPattern[(ii + 1) % ecgPattern.length];
      const y = mid - (v1 + (v2 - v1) * frac) * scale;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = color + '33';
    ctx.lineWidth = 6;
    ctx.stroke();
    offset += 0.5;
    requestAnimationFrame(draw);
  }
  draw();
}

// ─── LAPORAN (REAL DATA) ────────────────────────────────
let laporanLoaded = false;
async function loadLaporanCharts() {
  if (laporanLoaded) return;
  laporanLoaded = true;

  try {
    const res = await fetch(API_BASE + '/api/stats');
    const stats = await res.json();

    // Update stat cards in laporan
    document.getElementById('lapTotalPasien').textContent = stats.total_pasien.toLocaleString('id-ID');
    document.getElementById('lapRisiko').textContent = stats.risiko_jantung.toLocaleString('id-ID');
    document.getElementById('lapSesak').textContent = stats.keluhan_sesak.toLocaleString('id-ID');
    document.getElementById('lapAvgBMI').textContent = stats.rata_bmi;

    const ctx1 = document.getElementById('chartLaporan1');
    if (ctx1) {
      new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: stats.distribusi_usia.labels,
          datasets: [{
            label: 'Pasien per Kelompok Usia',
            data: stats.distribusi_usia.total,
            backgroundColor: stats.distribusi_usia.total.map((_, i) =>
              `hsla(${220 - i * 20}, 70%, 55%, 0.7)`
            ),
            borderRadius: 8,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#94A3B8' } },
            y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94A3B8' } }
          }
        }
      });
    }

    const ctx2 = document.getElementById('chartLaporan2');
    if (ctx2) {
      new Chart(ctx2, {
        type: 'polarArea',
        data: {
          labels: stats.distribusi_td.labels,
          datasets: [{
            data: stats.distribusi_td.values,
            backgroundColor: ['rgba(16,185,129,.5)','rgba(59,130,246,.5)','rgba(245,158,11,.5)','rgba(220,38,38,.5)'],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'right', labels: { font: { size: 11 }, padding: 10 } } },
          scales: { r: { ticks: { display: false }, grid: { color: 'rgba(0,0,0,.06)' } } }
        }
      });
    }
  } catch (err) {
    console.error('Error loading laporan data:', err);
  }
}

// ─── PREDIKSI FORM ──────────────────────────────────────
function selectRadio(el, name) {
  el.parentElement.querySelectorAll('.form-radio').forEach(r => r.classList.remove('selected'));
  el.classList.add('selected');
  el.querySelector('input').checked = true;
}

function initPrediksiForm() {
  document.getElementById('prediksiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const usia = parseInt(document.getElementById('inputUsia').value);
    const bmi = parseInt(document.getElementById('inputBmi').value);
    const sistolik = parseInt(document.getElementById('inputSistolik').value);
    const diastolik = parseInt(document.getElementById('inputDiastolik').value);
    const genderEl = document.querySelector('input[name="gender"]:checked');
    const sesakEl = document.querySelector('input[name="sesak"]:checked');

    if (!genderEl || !sesakEl) {
      alert('Silakan pilih jenis kelamin dan keluhan sesak/nyeri dada.');
      return;
    }
    const gender = parseInt(genderEl.value);
    const sesak = parseInt(sesakEl.value);

    if (usia < 0 || usia > 120) { alert('Usia harus antara 0-120 tahun'); return; }
    if (bmi < 1 || bmi > 100) { alert('BMI harus antara 1-100'); return; }
    if (sistolik < 50 || sistolik > 300) { alert('Sistolik harus antara 50-300 mmHg'); return; }
    if (diastolik < 30 || diastolik > 200) { alert('Diastolik harus antara 30-200 mmHg'); return; }

    const features = [usia, gender, sesak, bmi, sistolik, diastolik];

    if (USE_API) {
      // Server-side prediction
      try {
        const res = await fetch(API_BASE + '/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usia, gender, sesak, bmi, sistolik, diastolik }),
        });
        const result = await res.json();
        showPredictionResult(result, features);
      } catch (err) {
        console.warn('API predict gagal, menggunakan client-side:', err);
        if (typeof predict === 'function') {
          const result = predict(features);
          showPredictionResult(result, features);
        }
      }
    } else if (typeof predict === 'function') {
      const result = predict(features);
      showPredictionResult(result, features);
    }
  });
}

function showPredictionResult(result, features) {
  const container = document.getElementById('prediksiResult');
  const isRisiko = result.prediction === 1;
  const confidence = (result.confidence * 100).toFixed(1);
  const prob = ((result.probability[1]) * 100).toFixed(1);

  const labels = ['Usia', 'Gender', 'Sesak/Nyeri Dada', 'BMI', 'Sistolik', 'Diastolik'];
  const featureDisplay = features.map((v, i) => {
    if (i === 1) return v === 0 ? 'Laki-laki' : 'Perempuan';
    if (i === 2) return v === 0 ? 'Tidak Ada' : 'Ada';
    return v;
  });

  container.innerHTML = `
    <div class="result-panel ${isRisiko ? 'risiko' : 'aman'}">
      <div class="result-icon heartbeat">
        ${isRisiko
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
        }
      </div>
      <div class="result-title">${isRisiko ? 'RISIKO PENYAKIT JANTUNG TERDETEKSI' : 'RISIKO RENDAH'}</div>
      <div class="result-label">${isRisiko ? 'Pasien memiliki indikasi risiko penyakit jantung' : 'Tidak terdeteksi risiko signifikan penyakit jantung'}</div>
      <div class="result-confidence">${prob}%</div>
      <div class="result-label">Probabilitas Risiko Jantung</div>

      <div style="display:flex;gap:12px;margin-top:20px;justify-content:center;flex-wrap:wrap">
        ${labels.map((l, i) => `
          <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:10px 14px;min-width:100px;backdrop-filter:blur(4px)">
            <div style="font-size:10px;opacity:.7;text-transform:uppercase;letter-spacing:.5px">${l}</div>
            <div style="font-size:15px;font-weight:700;margin-top:2px">${featureDisplay[i]}</div>
          </div>
        `).join('')}
      </div>

      <div class="result-path">
        <h4>Alur Keputusan Decision Tree (${result.path.length} langkah)</h4>
        ${result.path.map((step, i) => `
          <div class="path-step">
            <span class="step-dot"></span>
            <span>Step ${i+1}: <strong>${step.feature}</strong> ${step.condition}</span>
          </div>
        `).join('')}
        <div class="path-step" style="opacity:1;font-weight:700;margin-top:4px">
          <span class="step-dot"></span>
          <span>Hasil: ${isRisiko ? 'RISIKO JANTUNG' : 'TIDAK RISIKO'} (confidence ${confidence}%)</span>
        </div>
      </div>

      <div style="margin-top:20px;padding:12px 16px;background:rgba(255,255,255,.1);border-radius:10px;font-size:12px;text-align:left;backdrop-filter:blur(4px)">
        <strong>Disclaimer:</strong> Hasil ini merupakan alat bantu skrining dan bukan diagnosis medis. Konsultasikan dengan dokter di RSU Aulia untuk pemeriksaan lanjutan.
      </div>
    </div>
  `;
}

// ─── FALLBACK (tanpa server) ────────────────────────────
function initDashboardChartsFallback() {
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;

  const ctx1 = document.getElementById('chartHeartRate');
  if (ctx1) {
    new Chart(ctx1, { type: 'line', data: { labels: Array.from({length:24},(_,i)=>String(i).padStart(2,'0')+':00'), datasets: [{ label:'BPM', data: Array.from({length:24},()=>Math.floor(65+Math.random()*30)), borderColor:'#DC2626', backgroundColor:'rgba(220,38,38,.08)', fill:true, tension:.4, pointRadius:0, borderWidth:2.5 }] }, options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}},y:{min:50,max:120}} } });
  }
  const ctx2 = document.getElementById('chartMonthly');
  if (ctx2) {
    new Chart(ctx2, { type:'bar', data:{ labels:['Jan','Feb','Mar','Apr','Mei','Jun'], datasets:[{label:'Rawat Jalan',data:[420,385,450,410,480,523],backgroundColor:'rgba(59,130,246,.7)',borderRadius:6},{label:'Rawat Inap',data:[145,160,155,170,175,184],backgroundColor:'rgba(220,38,38,.7)',borderRadius:6}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(0,0,0,.04)'}}}}});
  }
  const ctx3 = document.getElementById('chartDisease');
  if (ctx3) {
    new Chart(ctx3, { type:'doughnut', data:{ labels:['Hipertensi','PJK','Gagal Jantung','Aritmia','Kardiomiopati','Lainnya'], datasets:[{data:[35,25,18,12,6,4],backgroundColor:['#DC2626','#3B82F6','#F59E0B','#8B5CF6','#10B981','#94A3B8'],borderWidth:0,hoverOffset:8}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right'}},cutout:'65%'}});
  }
  const ctx4 = document.getElementById('chartBed');
  if (ctx4) {
    new Chart(ctx4, { type:'bar', data:{ labels:['ICU','ICCU','HCU','R.Inap A','R.Inap B','VIP'], datasets:[{label:'Terisi',data:[6,4,8,22,18,5],backgroundColor:'rgba(220,38,38,.7)',borderRadius:6},{label:'Kosong',data:[4,2,2,8,12,5],backgroundColor:'rgba(16,185,129,.3)',borderRadius:6}]}, options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true},y:{stacked:true,grid:{display:false}}}}});
  }
}

function initPatientTableFallback() {
  const PATIENTS = [
    { rm:'RSU-2024-00001',usia:55.3,gender:'L',sesak:0,bmi:28.65,td:'132/78',risiko:'Normal'},
    { rm:'RSU-2024-00002',usia:59.9,gender:'L',sesak:0,bmi:16.6,td:'154/83',risiko:'Normal'},
    { rm:'RSU-2024-00003',usia:47.3,gender:'L',sesak:0,bmi:24.63,td:'124/86',risiko:'Normal'},
    { rm:'RSU-2024-00004',usia:42.9,gender:'L',sesak:0,bmi:21.97,td:'132/78',risiko:'Normal'},
    { rm:'RSU-2024-00005',usia:68.2,gender:'P',sesak:1,bmi:30.1,td:'165/95',risiko:'Risiko'},
  ];
  const tbody = document.getElementById('tbodyPasien');
  tbody.innerHTML = PATIENTS.map(p=>`<tr><td><strong style="color:var(--primary)">${p.rm}</strong></td><td>${p.usia} th</td><td>${p.gender==='L'?'Laki-laki':'Perempuan'}</td><td><span class="badge ${p.sesak?'warning':'neutral'}">${p.sesak?'Ya':'Tidak'}</span></td><td>${p.bmi}</td><td>${p.td}</td><td><span class="badge ${p.risiko==='Risiko'?'danger':'success'}">${p.risiko}</span></td><td><button class="btn btn-sm btn-outline" style="padding:5px 10px;font-size:11px">Detail</button></td></tr>`).join('');
}

// ─── TOAST NOTIFICATION ─────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-icon">${icons[type] || icons.info}</div><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
}

// ─── EMR (REKAM MEDIS) ──────────────────────────────────
let emrDropdownLoaded = false;
async function loadEMRDropdown() {
  if (emrDropdownLoaded) return;
  emrDropdownLoaded = true;
  try {
    // Load first 50 patients with risiko for dropdown
    const res = await fetch(API_BASE + '/api/patients/search?limit=50');
    const patients = await res.json();
    const select = document.getElementById('emrPatientSelect');
    if (select) {
      select.innerHTML = '<option value="">Pilih Pasien...</option>' +
        patients.map(p => `<option value="${p.id}">${p.no_rm} — ${p.gender_label}, ${p.usia} th (${p.risiko_label})</option>`).join('');
    }
  } catch (err) {
    console.error('Error loading EMR dropdown:', err);
  }
}

async function loadEMRData() {
  const select = document.getElementById('emrPatientSelect');
  const patientId = select ? select.value : '';
  if (!patientId) {
    showToast('Pilih pasien terlebih dahulu', 'warning');
    return;
  }

  const content = document.getElementById('emrContent');
  content.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><div class="loading-text">Memuat data rekam medis...</div></div>';

  try {
    const res = await fetch(API_BASE + '/api/patients/' + patientId);
    const p = await res.json();

    const isRisiko = p.risiko_aktual === 1;
    const initials = p.no_rm.split('-').pop().slice(-2);
    const bmiCategory = p.bmi < 18.5 ? 'Underweight' : p.bmi < 25 ? 'Normal' : p.bmi < 30 ? 'Overweight' : 'Obese';
    const tdCategory = p.sistolik < 120 && p.diastolik < 80 ? 'Normal' :
                      p.sistolik < 130 && p.diastolik < 80 ? 'Elevated' :
                      p.sistolik < 140 || p.diastolik < 90 ? 'Hipertensi Stg 1' : 'Hipertensi Stg 2';

    content.innerHTML = `
      <div class="grid-2" style="grid-template-columns:340px 1fr">
        <div class="card">
          <div class="card-header"><h3>Profil Pasien</h3></div>
          <div class="card-body" style="text-align:center">
            <div style="width:80px;height:80px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;font-weight:800;color:#fff">${initials}</div>
            <h3 style="font-size:17px;font-weight:700">${p.gender_label}</h3>
            <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">No. RM: ${p.no_rm}</p>
            <div style="text-align:left;font-size:13px;color:var(--text-secondary)">
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light)"><span>Usia</span><strong style="color:var(--text)">${p.usia} tahun</strong></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light)"><span>Gender</span><strong style="color:var(--text)">${p.gender_label}</strong></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light)"><span>BMI</span><strong style="color:var(--text)">${p.bmi} kg/m\u00B2 (${bmiCategory})</strong></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light)"><span>TD</span><strong style="color:var(--text)">${p.sistolik}/${p.diastolik} mmHg</strong></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light)"><span>Kategori TD</span><strong style="color:${tdCategory === 'Normal' ? 'var(--success)' : 'var(--primary)'}">${tdCategory}</strong></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light)"><span>Sesak/Nyeri Dada</span><strong style="color:${p.sesak_dada === 1 ? 'var(--primary)' : 'var(--text)'}">${p.sesak_dada === 1 ? 'Ya (+)' : 'Tidak (-)'}</strong></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0"><span>Status Aktual</span><span class="badge ${isRisiko ? 'danger' : 'success'}">${p.risiko_label}</span></div>
            </div>
          </div>
        </div>
        <div>
          <div class="card" style="margin-bottom:22px">
            <div class="card-header"><h3>Hasil Pemeriksaan Klinis</h3><span class="badge info">Data Riil</span></div>
            <div class="card-body">
              <div class="timeline">
                <div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><h4>Pemeriksaan Fisik</h4><p>TD: ${p.sistolik}/${p.diastolik} mmHg | Kategori: ${tdCategory}</p><div class="time">Data klinis dari dataset_cleaned.csv</div></div></div>
                <div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><h4>Antropometri</h4><p>BMI: ${p.bmi} kg/m\u00B2 | Kategori: ${bmiCategory}</p><div class="time">Data klinis dari dataset_cleaned.csv</div></div></div>
                <div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><h4>Skrining Keluhan</h4><p>${p.sesak_dada === 1 ? 'Keluhan sesak napas / nyeri dada: POSITIF (+)' : 'Tidak ada keluhan sesak napas / nyeri dada'}</p><div class="time">Data klinis dari dataset_cleaned.csv</div></div></div>
                <div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><h4>Model Prediksi Decision Tree</h4><p>Prediksi: <strong>${p.prediksi_label}</strong> | Probabilitas: ${(p.probabilitas[1] * 100).toFixed(1)}%</p><div class="time">Akurasi model: ${(MODEL_META.accuracy * 100).toFixed(1)}%</div></div></div>
              </div>
            </div>
          </div>
          <div class="grid-2">
            <div class="card">
              <div class="card-header"><h3>Diagnosa (ICD-10)</h3></div>
              <div class="card-body">
                <span class="badge ${isRisiko ? 'danger' : 'success'}" style="margin-bottom:8px;display:inline-block">${isRisiko ? 'Primer' : 'Status'}</span>
                <p style="font-size:14px;font-weight:600">${isRisiko ? 'Penyakit Kardiovaskular (I10-I79)' : 'Tidak ada diagnosa jantung'}</p>
                ${isRisiko ? '<span class="badge warning" style="margin:12px 0 8px;display:inline-block">Catatan</span><p style="font-size:13px">Perlu pemeriksaan lebih lanjut oleh dokter spesialis jantung</p>' : ''}
              </div>
            </div>
            <div class="card">
              <div class="card-header"><h3>Ringkasan Klinis</h3></div>
              <div class="card-body" style="font-size:13px">
                <div style="padding:6px 0;border-bottom:1px solid var(--border-light)"><strong>Usia:</strong> ${p.usia} tahun</div>
                <div style="padding:6px 0;border-bottom:1px solid var(--border-light)"><strong>Gender:</strong> ${p.gender_label}</div>
                <div style="padding:6px 0;border-bottom:1px solid var(--border-light)"><strong>BMI:</strong> ${p.bmi} (${bmiCategory})</div>
                <div style="padding:6px 0;border-bottom:1px solid var(--border-light)"><strong>TD:</strong> ${p.sistolik}/${p.diastolik} (${tdCategory})</div>
                <div style="padding:6px 0"><strong>Risiko:</strong> <span class="badge ${isRisiko ? 'danger' : 'success'}">${p.risiko_label}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    showToast('Data rekam medis berhasil dimuat', 'success');
  } catch (err) {
    console.error('Error loading EMR data:', err);
    content.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><h4>Gagal Memuat Data</h4><p>Terjadi kesalahan saat memuat data. Pastikan server berjalan.</p></div>';
    showToast('Gagal memuat data rekam medis', 'error');
  }
}

// ─── EXPORT FUNCTIONS ────────────────────────────────────
async function exportCSV() {
  if (!USE_API) { showToast('Export hanya tersedia saat server berjalan', 'warning'); return; }
  try {
    showToast('Memulai export CSV...', 'info');
    window.open(API_BASE + '/api/export/csv', '_blank');
    showToast('CSV berhasil diunduh', 'success');
  } catch (err) {
    showToast('Gagal export CSV', 'error');
  }
}

async function exportExcel() {
  if (!USE_API) { showToast('Export hanya tersedia saat server berjalan', 'warning'); return; }
  try {
    showToast('Membuat file Excel...', 'info');
    // Fetch data and create Excel-compatible HTML
    const res = await fetch(API_BASE + '/api/report');
    const stats = await res.json();
    const patRes = await fetch(API_BASE + '/api/patients?per_page=1000');
    const patients = await patRes.json();

    let html = '<html><head><meta charset="utf-8"><style>table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 10px;font-size:12px}th{background:#DC2626;color:#fff}</style></head><body>';
    html += '<h2>CARDIOCARE - Laporan Dataset Pasien</h2>';
    html += '<h3>Statistik</h3><table>';
    html += `<tr><th>Metrik</th><th>Nilai</th></tr>`;
    html += `<tr><td>Total Pasien</td><td>${stats.total_pasien}</td></tr>`;
    html += `<tr><td>Risiko Jantung</td><td>${stats.risiko_jantung} (${stats.persen_risiko}%)</td></tr>`;
    html += `<tr><td>Tidak Risiko</td><td>${stats.tidak_risiko}</td></tr>`;
    html += `<tr><td>Rata-rata Usia</td><td>${stats.rata_usia} tahun</td></tr>`;
    html += `<tr><td>Rata-rata BMI</td><td>${stats.rata_bmi}</td></tr>`;
    html += `<tr><td>Rata-rata Sistolik</td><td>${stats.rata_sistolik} mmHg</td></tr>`;
    html += '</table><br><h3>Data Pasien (1000 pertama)</h3><table>';
    html += '<tr><th>No RM</th><th>Usia</th><th>Gender</th><th>Sesak Dada</th><th>BMI</th><th>Sistolik</th><th>Diastolik</th><th>Status</th></tr>';
    patients.data.forEach(p => {
      html += `<tr><td>${p.no_rm}</td><td>${p.usia}</td><td>${p.gender_label}</td><td>${p.sesak_dada ? 'Ya' : 'Tidak'}</td><td>${p.bmi}</td><td>${p.sistolik}</td><td>${p.diastolik}</td><td>${p.risiko_label}</td></tr>`;
    });
    html += '</table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cardiocare_laporan.xls';
    a.click(); URL.revokeObjectURL(url);
    showToast('Excel berhasil diunduh', 'success');
  } catch (err) {
    showToast('Gagal export Excel', 'error');
  }
}

async function exportPDF() {
  if (!USE_API) { showToast('Export hanya tersedia saat server berjalan', 'warning'); return; }
  try {
    showToast('Membuat laporan PDF...', 'info');
    const res = await fetch(API_BASE + '/api/report');
    const stats = await res.json();

    const printWin = window.open('', '_blank');
    printWin.document.write(`<!DOCTYPE html><html><head><title>CARDIOCARE - Laporan</title>
      <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#333}
        h1{color:#DC2626;border-bottom:2px solid #DC2626;padding-bottom:10px}
        h2{color:#0F172A;margin-top:30px}
        table{width:100%;border-collapse:collapse;margin:15px 0}
        td,th{border:1px solid #ddd;padding:8px 12px;text-align:left;font-size:13px}
        th{background:#DC2626;color:#fff}
        .stat-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin:20px 0}
        .stat-box{border:1px solid #ddd;border-radius:8px;padding:15px;text-align:center}
        .stat-box h3{margin:0;font-size:24px;color:#DC2626}
        .stat-box p{margin:5px 0 0;font-size:12px;color:#666}
        .footer{margin-top:40px;padding-top:20px;border-top:1px solid #ddd;font-size:11px;color:#999;text-align:center}
      </style></head><body>
      <h1>CARDIOCARE - Laporan Statistik Dataset</h1>
      <p>Sistem Pendukung Keputusan Deteksi Dini Risiko Penyakit Jantung<br>RSU Aulia | Digenerate: ${new Date().toLocaleDateString('id-ID', {dateStyle:'full'})}</p>
      <h2>Ringkasan Statistik</h2>
      <div class="stat-grid">
        <div class="stat-box"><h3>${stats.total_pasien.toLocaleString('id-ID')}</h3><p>Total Pasien</p></div>
        <div class="stat-box"><h3>${stats.risiko_jantung.toLocaleString('id-ID')}</h3><p>Risiko Jantung (${stats.persen_risiko}%)</p></div>
        <div class="stat-box"><h3>${stats.tidak_risiko.toLocaleString('id-ID')}</h3><p>Tidak Risiko</p></div>
      </div>
      <h2>Statistik Deskriptif</h2>
      <table>
        <tr><th>Variabel</th><th>Rata-rata</th></tr>
        <tr><td>Usia</td><td>${stats.rata_usia} tahun</td></tr>
        <tr><td>BMI</td><td>${stats.rata_bmi} kg/m\u00B2</td></tr>
        <tr><td>Sistolik</td><td>${stats.rata_sistolik} mmHg</td></tr>
        <tr><td>Diastolik</td><td>${stats.rata_diastolik} mmHg</td></tr>
      </table>
      <h2>Distribusi Usia</h2>
      <table><tr><th>Kelompok Usia</th><th>Jumlah Pasien</th></tr>
        ${stats.distribusi_usia.labels.map((l, i) => `<tr><td>${l}</td><td>${stats.distribusi_usia.values[i]}</td></tr>`).join('')}
      </table>
      <h2>Distribusi BMI</h2>
      <table><tr><th>Kategori</th><th>Jumlah</th></tr>
        ${stats.distribusi_bmi.labels.map((l, i) => `<tr><td>${l}</td><td>${stats.distribusi_bmi.values[i]}</td></tr>`).join('')}
      </table>
      <h2>Distribusi Tekanan Darah</h2>
      <table><tr><th>Kategori</th><th>Jumlah</th></tr>
        ${stats.distribusi_td.labels.map((l, i) => `<tr><td>${l}</td><td>${stats.distribusi_td.values[i]}</td></tr>`).join('')}
      </table>
      <div class="footer">CARDIOCARE v2.0 | SPK Deteksi Dini Risiko Penyakit Jantung | RSU Aulia Jakarta Selatan</div>
      </body></html>`);
    printWin.document.close();
    setTimeout(() => { printWin.print(); }, 500);
    showToast('Laporan PDF siap dicetak', 'success');
  } catch (err) {
    showToast('Gagal export PDF', 'error');
  }
}

// ─── DOCTOR MANAGEMENT (Owner Only) ──────────────────────
let doctorsLoaded = false;

async function loadDoctors() {
  if (!currentUser || currentUser.role !== 'owner') return;
  doctorsLoaded = true;

  const grid = document.getElementById('doctorGrid');
  if (grid) grid.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><div class="loading-text">Memuat data dokter...</div></div>';

  try {
    const res = await fetch(API_BASE + '/api/doctors', { credentials: 'same-origin' });
    if (res.status === 403) {
      showToast('Akses ditolak. Hanya Owner yang dapat mengakses fitur ini.', 'error');
      return;
    }
    const data = await res.json();
    renderDoctorCards(data.data, data.total);
  } catch (err) {
    showToast('Gagal memuat data dokter', 'error');
    if (grid) grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><h4>Gagal Memuat</h4><p>Terjadi kesalahan saat memuat data dokter</p></div>';
  }
}

function renderDoctorCards(doctors, total) {
  const grid = document.getElementById('doctorGrid');
  const statEl = document.getElementById('statTotalDokter');
  if (statEl) statEl.textContent = total || 0;
  if (!grid) return;

  if (!doctors || doctors.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
        </div>
        <h4>Belum Ada Dokter</h4>
        <p>Klik tombol "Tambah Dokter" untuk membuat akun dokter baru</p>
      </div>`;
    return;
  }

  grid.innerHTML = doctors.map(d => {
    const initials = d.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    return `
    <div class="doctor-card">
      <div class="doctor-card-header">
        <div class="doctor-avatar-circle">${initials}</div>
        <div class="doctor-info">
          <h4>${d.name}</h4>
          <p>@${d.username}</p>
        </div>
        <span class="badge info">Dokter</span>
      </div>
      <div class="doctor-card-body">
        <div class="doctor-meta">
          <div class="doctor-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Dibuat: ${d.created_at || '-'}</span>
          </div>
          <div class="doctor-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
            <span>Akses: Dashboard, Pasien, SPK, EKG, Laporan</span>
          </div>
        </div>
      </div>
      <div class="doctor-card-actions">
        <button class="btn btn-outline btn-sm" onclick="editDoctor('${d.id}','${d.username}','${d.name.replace(/'/g, "\\'")}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          Edit
        </button>
        <button class="btn btn-outline btn-sm doctor-btn-delete" onclick="deleteDoctor('${d.id}','${d.name.replace(/'/g, "\\'")}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          Hapus
        </button>
      </div>
    </div>`;
  }).join('');
}

function showAddDoctorModal() {
  document.getElementById('doctorModalTitle').textContent = 'Tambah Dokter Baru';
  document.getElementById('doctorSubmitLabel').textContent = 'Simpan';
  document.getElementById('doctorPwdHint').textContent = '(min 6 karakter)';
  document.getElementById('doctorEditId').value = '';
  document.getElementById('doctorUsername').value = '';
  document.getElementById('doctorUsername').readOnly = false;
  document.getElementById('doctorName').value = '';
  document.getElementById('doctorPassword').value = '';
  document.getElementById('doctorPassword').required = true;
  document.getElementById('doctorFormError').style.display = 'none';
  document.getElementById('doctorModalOverlay').classList.add('active');
}

function editDoctor(id, username, name) {
  document.getElementById('doctorModalTitle').textContent = 'Edit Akun Dokter';
  document.getElementById('doctorSubmitLabel').textContent = 'Perbarui';
  document.getElementById('doctorPwdHint').textContent = '(kosongkan jika tidak diubah)';
  document.getElementById('doctorEditId').value = id;
  document.getElementById('doctorUsername').value = username;
  document.getElementById('doctorUsername').readOnly = false;
  document.getElementById('doctorName').value = name;
  document.getElementById('doctorPassword').value = '';
  document.getElementById('doctorPassword').required = false;
  document.getElementById('doctorFormError').style.display = 'none';
  document.getElementById('doctorModalOverlay').classList.add('active');
}

function closeDoctorModal() {
  document.getElementById('doctorModalOverlay').classList.remove('active');
}

async function deleteDoctor(id, name) {
  if (!confirm(`Hapus akun dokter "${name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
  try {
    const res = await fetch(API_BASE + '/api/doctors/' + id, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, 'success');
      loadDoctors();
    } else {
      showToast(data.error || 'Gagal menghapus dokter', 'error');
    }
  } catch (err) {
    showToast('Gagal menghapus dokter', 'error');
  }
}

// Doctor form submit
function initDoctorForm() {
  const form = document.getElementById('doctorForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('doctorEditId').value;
    const username = document.getElementById('doctorUsername').value.trim();
    const name = document.getElementById('doctorName').value.trim();
    const password = document.getElementById('doctorPassword').value;
    const errorEl = document.getElementById('doctorFormError');
    errorEl.style.display = 'none';

    if (!username || !name) {
      errorEl.textContent = 'Username dan nama wajib diisi';
      errorEl.style.display = 'block';
      return;
    }

    const body = { username, name };
    if (password) body.password = password;

    try {
      const url = editId
        ? API_BASE + '/api/doctors/' + editId
        : API_BASE + '/api/doctors';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        closeDoctorModal();
        loadDoctors();
      } else {
        errorEl.textContent = data.error || 'Gagal menyimpan';
        errorEl.style.display = 'block';
      }
    } catch (err) {
      errorEl.textContent = 'Gagal terhubung ke server';
      errorEl.style.display = 'block';
    }
  });
}

// ─── UTILS ──────────────────────────────────────────────
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
