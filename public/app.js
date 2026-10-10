// State Management
const state = {
  activeView: 'studio', // 'studio' | 'farm'
  sessions: [],
  currentSession: null,
  isGenerating: false,
  accounts: [],
  poolStats: null,
  activeAccount: null
};

// DOM Elements
const el = {
  viewStudio: document.getElementById('viewStudio'),
  viewFarm: document.getElementById('viewFarm'),
  navSearchBtn: document.getElementById('navSearchBtn'),
  navAcademicBtn: document.getElementById('navAcademicBtn'),
  navFarmBtn: document.getElementById('navFarmBtn'),
  newChatBtn: document.getElementById('newChatBtn'),
  sidebar: document.getElementById('sidebar'),
  mobileMenuBtn: document.getElementById('mobileMenuBtn'),
  sidebarCloseBtn: document.getElementById('sidebarCloseBtn'),
  mobileBackdrop: document.getElementById('mobileBackdrop'),
  promptInput: document.getElementById('promptInput'),
  submitBtn: document.getElementById('submitBtn'),
  focusSelector: document.getElementById('focusSelector'),
  modelSelector: document.getElementById('modelSelector'),
  heroContainer: document.getElementById('heroContainer'),
  conversationContainer: document.getElementById('conversationContainer'),
  displayQueryText: document.getElementById('displayQueryText'),
  sourcesGrid: document.getElementById('sourcesGrid'),
  sourceCountBadge: document.getElementById('sourceCountBadge'),
  answerMarkdown: document.getElementById('answerMarkdown'),
  copyAnswerBtn: document.getElementById('copyAnswerBtn'),
  exportApaBtn: document.getElementById('exportApaBtn'),
  floatingInputBar: document.getElementById('floatingInputBar'),
  followUpInput: document.getElementById('followUpInput'),
  followUpSubmitBtn: document.getElementById('followUpSubmitBtn'),
  sessionHistoryList: document.getElementById('sessionHistoryList'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  bottomAccountEmail: document.getElementById('bottomAccountEmail'),
  bottomAccountStatus: document.getElementById('bottomAccountStatus'),
  quickRotateBtn: document.getElementById('quickRotateBtn'),
  activePoolBadge: document.getElementById('activePoolBadge'),
  headerCdpStatus: document.getElementById('headerCdpStatus'),
  farmStatTotal: document.getElementById('farmStatTotal'),
  farmStatActive: document.getElementById('farmStatActive'),
  farmStatCooldown: document.getElementById('farmStatCooldown'),
  farmStatUsage: document.getElementById('farmStatUsage'),
  farmStrategySelect: document.getElementById('farmStrategySelect'),
  farmRotateBtn: document.getElementById('farmRotateBtn'),
  farmSpawnBtn: document.getElementById('farmSpawnBtn'),
  farmAccountTableBody: document.getElementById('farmAccountTableBody'),
  apaModal: document.getElementById('apaModal'),
  closeApaModalBtn: document.getElementById('closeApaModalBtn'),
  apaOutputTextarea: document.getElementById('apaOutputTextarea'),
  copyApaModalBtn: document.getElementById('copyApaModalBtn'),
  searchProgressSection: document.getElementById('searchProgressSection'),
  progressSpinner: document.getElementById('progressSpinner'),
  searchProgressStep: document.getElementById('searchProgressStep'),
  searchProgressTimer: document.getElementById('searchProgressTimer'),
  thinkingBox: document.getElementById('thinkingBox'),
  thinkingToggleBtn: document.getElementById('thinkingToggleBtn'),
  thinkingChevron: document.getElementById('thinkingChevron'),
  thinkingDuration: document.getElementById('thinkingDuration'),
  thinkingContent: document.getElementById('thinkingContent'),
  // Theme Toggle Elements
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIconMoon: document.getElementById('themeIconMoon'),
  themeIconSun: document.getElementById('themeIconSun'),
  themeToggleText: document.getElementById('themeToggleText'),
  // Spawn Account Modal Elements
  spawnModal: document.getElementById('spawnModal'),
  closeSpawnModalBtn: document.getElementById('closeSpawnModalBtn'),
  cancelSpawnBtn: document.getElementById('cancelSpawnBtn'),
  confirmSpawnBtn: document.getElementById('confirmSpawnBtn'),
  confirmSpawnBtnText: document.getElementById('confirmSpawnBtnText'),
  spawnCountInput: document.getElementById('spawnCountInput'),
  spawnFormSection: document.getElementById('spawnFormSection'),
  spawnProgressSection: document.getElementById('spawnProgressSection'),
  spawnProgressText: document.getElementById('spawnProgressText'),
  spawnProgressBadge: document.getElementById('spawnProgressBadge'),
  spawnProgressBar: document.getElementById('spawnProgressBar'),
  spawnStatusLogs: document.getElementById('spawnStatusLogs')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  if (window.marked) {
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }
  initTheme();
  loadSessions();
  setupEventListeners();
  fetchAccountsAndStats();
  setInterval(fetchAccountsAndStats, 5000); // Polling status pool setiap 5 detik
});

// Theme Management (Light Mode Default, Dark Mode Switchable)
function initTheme() {
  const currentTheme = localStorage.getItem('op_theme') || 'light';
  applyTheme(currentTheme);

  el.themeToggleBtn?.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
  });
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    localStorage.setItem('op_theme', 'dark');
    if (el.themeToggleText) el.themeToggleText.innerText = 'Mode Terang';
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('op_theme', 'light');
    if (el.themeToggleText) el.themeToggleText.innerText = 'Mode Gelap';
  }
}

// Event Listeners
function setupEventListeners() {
  // Mobile Sidebar
  el.mobileMenuBtn?.addEventListener('click', toggleMobileSidebar);
  el.sidebarCloseBtn?.addEventListener('click', toggleMobileSidebar);
  el.mobileBackdrop?.addEventListener('click', toggleMobileSidebar);

  // Navigations
  el.navSearchBtn?.addEventListener('click', () => switchView('studio'));
  el.navAcademicBtn?.addEventListener('click', () => {
    switchView('studio');
    setNavActive(el.navAcademicBtn);
    if (el.focusSelector) el.focusSelector.value = 'academic';
    el.promptInput?.focus();
  });
  el.navFarmBtn?.addEventListener('click', () => switchView('farm'));
  el.newChatBtn?.addEventListener('click', startNewChat);

  // Submits
  el.submitBtn?.addEventListener('click', handleMainSubmit);
  el.promptInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMainSubmit();
    }
  });

  el.followUpSubmitBtn?.addEventListener('click', handleFollowupSubmit);
  el.followUpInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFollowupSubmit();
    }
  });

  // Suggestion Chips
  document.querySelectorAll('.suggestion-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      if (el.promptInput) {
        el.promptInput.value = btn.innerText.replace(/^[^\w]+/, '').trim();
        handleMainSubmit();
      }
    });
  });

  // Action Buttons
  el.copyAnswerBtn?.addEventListener('click', copyAnswer);
  el.exportApaBtn?.addEventListener('click', openApaModal);
  el.closeApaModalBtn?.addEventListener('click', () => {
    el.apaModal?.classList.add('hidden');
    el.apaModal?.classList.remove('flex');
  });
  el.copyApaModalBtn?.addEventListener('click', copyApaCitations);
  el.quickRotateBtn?.addEventListener('click', rotateAccount);
  el.farmRotateBtn?.addEventListener('click', rotateAccount);

  // Spawn Account Modal Triggers
  el.farmSpawnBtn?.addEventListener('click', openSpawnModal);
  el.closeSpawnModalBtn?.addEventListener('click', closeSpawnModal);
  el.cancelSpawnBtn?.addEventListener('click', closeSpawnModal);
  el.confirmSpawnBtn?.addEventListener('click', startBatchSpawn);

  // Preset Buttons for Spawn Quantity
  document.querySelectorAll('.spawn-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const count = btn.getAttribute('data-count');
      if (el.spawnCountInput) {
        el.spawnCountInput.value = count;
      }
      document.querySelectorAll('.spawn-preset-btn').forEach(b => {
        b.classList.remove('border-teal-500', 'bg-teal-50', 'text-teal-800', 'dark:bg-teal-500/10', 'dark:text-teal-400');
      });
      btn.classList.add('border-teal-500', 'bg-teal-50', 'text-teal-800', 'dark:bg-teal-500/10', 'dark:text-teal-400');
    });
  });

  el.clearHistoryBtn?.addEventListener('click', clearAllSessions);
  el.thinkingToggleBtn?.addEventListener('click', () => {
    if (!el.thinkingContent) return;
    const isHidden = el.thinkingContent.classList.contains('hidden');
    el.thinkingContent.classList.toggle('hidden');
    if (el.thinkingChevron) {
      el.thinkingChevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  });

  // Strategy change
  el.farmStrategySelect?.addEventListener('change', async (e) => {
    try {
      const res = await fetch('/v1/accounts/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: e.target.value })
      });
      if (res.ok) fetchAccountsAndStats();
    } catch (err) {
      console.error(err);
    }
  });

  // Global Keyboard Shortcut: Ctrl + K for New Chat
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      startNewChat();
    }
  });
}

function setNavActive(activeBtn) {
  const buttons = [
    { element: el.navSearchBtn, defaultText: 'Pencarian' },
    { element: el.navAcademicBtn, defaultText: 'Fokus Akademik' },
    { element: el.navFarmBtn, defaultText: 'Kelola Akun' }
  ];

  buttons.forEach(({ element }) => {
    if (!element) return;
    if (element === activeBtn) {
      element.className = "w-full flex items-center justify-between px-3 py-2 rounded-lg bg-teal-50 text-teal-800 border border-teal-200/80 dark:bg-zinc-800/50 dark:text-white dark:border-transparent transition text-sm font-medium";
    } else {
      element.className = "w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/30 border border-transparent transition text-sm font-medium";
    }
  });
}

function toggleMobileSidebar() {
  el.sidebar?.classList.toggle('-translate-x-full');
  el.mobileBackdrop?.classList.toggle('hidden');
}

function switchView(viewName) {
  state.activeView = viewName;
  if (viewName === 'studio') {
    el.viewStudio?.classList.remove('hidden');
    el.viewFarm?.classList.add('hidden');
    setNavActive(el.navSearchBtn);
  } else {
    el.viewStudio?.classList.add('hidden');
    el.viewFarm?.classList.remove('hidden');
    setNavActive(el.navFarmBtn);
    fetchAccountsAndStats();
  }
}

function startNewChat() {
  switchView('studio');
  state.currentSession = null;
  el.heroContainer?.classList.remove('hidden');
  el.conversationContainer?.classList.add('hidden');
  el.floatingInputBar?.classList.add('hidden');
  if (el.searchProgressSection) el.searchProgressSection.classList.add('hidden');
  if (el.promptInput) {
    el.promptInput.value = '';
    el.promptInput.focus();
  }
}

// Search & Generation Flow
async function handleMainSubmit() {
  const query = el.promptInput?.value.trim();
  if (!query || state.isGenerating) return;

  const focus = el.focusSelector?.value || 'web';
  const model = el.modelSelector?.value || 'perplexity/sonar-web';

  const session = {
    id: 'sess_' + Date.now(),
    query,
    focus,
    model,
    createdAt: new Date().toISOString(),
    answer: '',
    sources: [],
    thinking: []
  };

  state.currentSession = session;
  state.sessions.unshift(session);
  saveSessions();
  renderSessionHistory();

  // Switch UI to Conversation view
  el.heroContainer?.classList.add('hidden');
  el.conversationContainer?.classList.remove('hidden');
  el.conversationContainer?.classList.add('flex');
  el.floatingInputBar?.classList.remove('hidden');
  if (el.displayQueryText) el.displayQueryText.innerText = query;
  if (el.promptInput) el.promptInput.value = '';

  await executeSearch(session);
}

async function handleFollowupSubmit() {
  const query = el.followUpInput?.value.trim();
  if (!query || state.isGenerating || !state.currentSession) return;

  const focus = el.focusSelector?.value || 'web';
  const model = el.modelSelector?.value || 'perplexity/sonar-web';

  const followUpSession = {
    id: 'sess_' + Date.now(),
    query,
    focus,
    model,
    createdAt: new Date().toISOString(),
    answer: '',
    sources: [],
    thinking: []
  };

  state.currentSession = followUpSession;
  state.sessions.unshift(followUpSession);
  saveSessions();
  renderSessionHistory();

  if (el.displayQueryText) el.displayQueryText.innerText = query;
  if (el.followUpInput) el.followUpInput.value = '';

  await executeSearch(followUpSession);
}

// Clean Smart Formatter
function sanitizeAndFormatMarkdown(rawText, sources = []) {
  if (!rawText) return '';

  let cleaned = rawText
    .replace(/^[\s\S]*?(Jawaban:|Berikut adalah|Hasil riset:|Sintesis:)/i, '')
    .trim();

  if (!cleaned) cleaned = rawText.trim();

  // Elevate section headers
  cleaned = cleaned.replace(/^([A-Z0-9\s-]{3,35}):\s*$/gm, '### $1');

  // Interactive citation pills
  cleaned = cleaned.replace(/\[(\d+)\]/g, (match, p1) => {
    const idx = parseInt(p1, 10);
    const src = sources[idx - 1];
    const url = src ? src.url : '#';
    const domain = src ? (src.domain || 'sumber') : `sumber ${idx}`;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="citation-pill" title="${domain} [${idx}]"><span>[${idx}]</span></a>`;
  });

  return cleaned;
}

async function executeSearch(session) {
  state.isGenerating = true;
  if (el.submitBtn) el.submitBtn.disabled = true;
  if (el.followUpSubmitBtn) el.followUpSubmitBtn.disabled = true;

  // Reset Answer & Progress States
  if (el.answerMarkdown) el.answerMarkdown.innerHTML = '<span class="text-slate-400 dark:text-zinc-500 italic">Menunggu respons dari server...</span>';
  if (el.sourcesGrid) el.sourcesGrid.innerHTML = '';
  if (el.sourceCountBadge) el.sourceCountBadge.innerText = '0';
  if (el.thinkingBox) el.thinkingBox.classList.add('hidden');
  if (el.thinkingContent) el.thinkingContent.innerHTML = '';

  // Show Progress tracker
  el.searchProgressSection?.classList.remove('hidden');
  const timerStart = Date.now();
  const timerInterval = setInterval(() => {
    const elapsed = ((Date.now() - timerStart) / 1000).toFixed(1);
    if (el.searchProgressTimer) el.searchProgressTimer.innerText = `${elapsed}s`;
  }, 100);

  updateProgressStep('Menghubungkan ke armada Chrome CDP...');

  try {
    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer open-perplexity'
      },
      body: JSON.stringify({
        model: session.model,
        messages: [{ role: 'user', content: session.query }],
        focus: session.focus,
        stream: false
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `HTTP ${response.status}: Terjadi kesalahan kueri.`);
    }

    const data = await response.json();
    clearInterval(timerInterval);

    const message = data.choices?.[0]?.message || {};
    const rawAnswer = message.content || 'Tidak ada konten teks yang dihasilkan.';
    const sources = message.sources || [];
    const thinking = message.thinking || null;

    session.answer = rawAnswer;
    session.sources = sources;
    session.thinking = thinking;
    saveSessions();

    updateProgressStep('Sintesis jawaban selesai.');
    if (el.progressSpinner) {
      el.progressSpinner.className = 'w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0';
    }

    // Render Sources
    renderSources(sources);

    // Render Thinking accordion if available
    if (thinking && thinking.length > 0) {
      el.thinkingBox?.classList.remove('hidden');
      if (el.thinkingDuration) {
        el.thinkingDuration.innerText = `${((Date.now() - timerStart) / 1000).toFixed(1)}s penalaran`;
      }
      if (el.thinkingContent) {
        el.thinkingContent.innerHTML = Array.isArray(thinking)
          ? thinking.map(t => `<div class="py-0.5">• ${escapeHtml(t)}</div>`).join('')
          : `<div class="whitespace-pre-wrap">${escapeHtml(thinking)}</div>`;
      }
    }

    // Format & Render Answer Markdown
    const formattedMarkdown = sanitizeAndFormatMarkdown(rawAnswer, sources);
    if (el.answerMarkdown) {
      el.answerMarkdown.innerHTML = marked.parse(formattedMarkdown);

      if (window.renderMathInElement) {
        renderMathInElement(el.answerMarkdown, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      }
    }

  } catch (err) {
    clearInterval(timerInterval);
    updateProgressStep(`Gagal: ${err.message}`);
    if (el.progressSpinner) {
      el.progressSpinner.className = 'w-3.5 h-3.5 rounded-full bg-red-500 shrink-0';
    }
    if (el.answerMarkdown) {
      el.answerMarkdown.innerHTML = `
        <div class="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 space-y-2">
          <p class="font-semibold text-sm">Kesalahan Saat Menjalankan Kueri</p>
          <p class="text-xs font-mono">${escapeHtml(err.message)}</p>
          <p class="text-xs text-slate-500 dark:text-red-400">Pastikan Chrome instance aktif pada port 9222 dan akun memiliki kuota kueri.</p>
        </div>
      `;
    }
  } finally {
    state.isGenerating = false;
    if (el.submitBtn) el.submitBtn.disabled = false;
    if (el.followUpSubmitBtn) el.followUpSubmitBtn.disabled = false;
    fetchAccountsAndStats();
  }
}

function updateProgressStep(text) {
  if (el.searchProgressStep) el.searchProgressStep.innerText = text;
}

function renderSources(sources) {
  if (!el.sourcesGrid) return;
  el.sourcesGrid.innerHTML = '';
  if (el.sourceCountBadge) el.sourceCountBadge.innerText = sources.length;

  if (sources.length === 0) {
    el.sourcesGrid.innerHTML = '<div class="col-span-full text-xs text-slate-400 dark:text-zinc-500 italic">Tidak ada kartu rujukan eksternal.</div>';
    return;
  }

  for (const src of sources) {
    const card = document.createElement('a');
    card.href = src.url;
    card.target = '_blank';
    card.className = 'source-card p-2.5 rounded-xl bg-white dark:bg-surface border border-slate-200 dark:border-surface-border flex items-start gap-2.5 no-underline text-slate-700 dark:text-zinc-300 shadow-sm';

    const domain = src.domain || 'web';
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

    card.innerHTML = `
      <img src="${faviconUrl}" alt="${domain}" class="w-4 h-4 rounded shrink-0 mt-0.5" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22><circle cx=%225%22 cy=%225%22 r=%225%22 fill=%22%2394a3b8%22/></svg>'">
      <div class="truncate">
        <p class="text-xs font-medium text-slate-900 dark:text-zinc-200 truncate">${escapeHtml(src.title || domain)}</p>
        <p class="text-[10px] text-slate-500 dark:text-zinc-400 font-mono truncate">${domain}</p>
      </div>
    `;
    el.sourcesGrid.appendChild(card);
  }
}

// Account Fleet Management & Polling
async function fetchAccountsAndStats() {
  try {
    const res = await fetch('/v1/accounts');
    const json = await res.json();

    if (json.data) {
      state.accounts = json.data;
      renderAccountTable(json.data);
    }

    if (json.stats) {
      state.poolStats = json.stats;
      if (el.farmStatTotal) el.farmStatTotal.innerText = json.stats.totalAccounts;
      if (el.farmStatActive) el.farmStatActive.innerText = json.stats.activeAccounts;
      if (el.farmStatCooldown) el.farmStatCooldown.innerText = json.stats.cooldownAccounts;
      if (el.farmStatUsage) el.farmStatUsage.innerText = json.stats.totalUsage;
      if (el.activePoolBadge) el.activePoolBadge.innerText = `${json.stats.activeAccounts} Aktif`;

      if (json.stats.strategy && el.farmStrategySelect) {
        el.farmStrategySelect.value = json.stats.strategy;
      }

      if (json.stats.currentAccount && el.bottomAccountEmail) {
        el.bottomAccountEmail.innerText = json.stats.currentAccount;
      }
    }
  } catch (err) {
    console.warn('Gagal memuat status pool:', err);
  }
}

function renderAccountTable(accounts) {
  if (!el.farmAccountTableBody) return;
  el.farmAccountTableBody.innerHTML = '';

  if (accounts.length === 0) {
    el.farmAccountTableBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400 dark:text-zinc-500 italic">Belum ada akun di pool. Klik "Buat Akun Otomatis" untuk memulai.</td></tr>';
    return;
  }

  accounts.forEach((acc, i) => {
    const row = document.createElement('tr');
    row.className = acc.isActive
      ? 'bg-teal-50/60 dark:bg-teal-500/5 font-medium'
      : 'hover:bg-slate-50 dark:hover:bg-zinc-800/20';

    const isCooldown = acc.status === 'cooling_down';
    const statusBadge = isCooldown
      ? `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-[10px] font-mono"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Cooldown (${acc.cooldownRemainingSec}s)</span>`
      : `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-mono"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Aktif</span>`;

    const activeStar = acc.isActive ? '<span class="text-teal-600 dark:text-teal-400 ml-1.5 text-[11px] font-medium">[Aktif]</span>' : '';

    row.innerHTML = `
      <td class="p-3 text-center text-slate-400 dark:text-zinc-500 font-mono">${i + 1}</td>
      <td class="p-3 font-mono text-slate-800 dark:text-zinc-200">${escapeHtml(acc.email)} ${activeStar}</td>
      <td class="p-3">${statusBadge}</td>
      <td class="p-3 font-mono text-slate-700 dark:text-zinc-300">${acc.usageCount}</td>
      <td class="p-3 text-slate-500 dark:text-zinc-400">${acc.lastUsed}</td>
      <td class="p-3 text-right space-x-1.5">
        ${isCooldown ? `<button onclick="resetAccountCooldown('${acc.id}')" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-teal-700 dark:text-teal-400 border border-slate-200 dark:border-zinc-700 text-[10px]">Reset</button>` : ''}
        <button onclick="deleteAccount('${acc.id}')" class="px-2 py-1 rounded bg-slate-100 hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-slate-200 dark:border-zinc-700 text-[10px]">Hapus</button>
      </td>
    `;
    el.farmAccountTableBody.appendChild(row);
  });
}

// Actions
async function rotateAccount() {
  try {
    el.quickRotateBtn?.classList.add('animate-spin');
    if (el.farmRotateBtn) {
      el.farmRotateBtn.disabled = true;
      el.farmRotateBtn.innerHTML = '<span class="w-3.5 h-3.5 border-2 border-teal-600 dark:border-teal-400 border-t-transparent rounded-full animate-spin"></span><span>Merotasi...</span>';
    }
    const res = await fetch('/v1/accounts/rotate', { method: 'POST' });
    const data = await res.json();
    fetchAccountsAndStats();
    showToast(data.message || 'Rotasi akun berhasil.');
  } catch (err) {
    showToast('Gagal merotasi akun: ' + err.message);
  } finally {
    setTimeout(() => {
      el.quickRotateBtn?.classList.remove('animate-spin');
      if (el.farmRotateBtn) {
        el.farmRotateBtn.disabled = false;
        el.farmRotateBtn.innerHTML = '<svg class="w-4 h-4 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg><span>Rotasi Akun</span>';
      }
    }, 600);
  }
}

// Modal Spawner Functions
function openSpawnModal() {
  if (!el.spawnModal) return;
  el.spawnModal.classList.remove('hidden');
  el.spawnModal.classList.add('flex');
  
  // Reset Form
  el.spawnFormSection?.classList.remove('hidden');
  el.spawnProgressSection?.classList.add('hidden');
  if (el.confirmSpawnBtn) {
    el.confirmSpawnBtn.disabled = false;
    el.confirmSpawnBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg><span>Mulai Pembuatan</span>';
  }
  if (el.cancelSpawnBtn) el.cancelSpawnBtn.disabled = false;
  if (el.closeSpawnModalBtn) el.closeSpawnModalBtn.disabled = false;
  if (el.spawnCountInput) el.spawnCountInput.value = 1;
  if (el.spawnProgressBar) {
    el.spawnProgressBar.style.width = '0%';
    el.spawnProgressBar.className = 'h-full bg-teal-600 dark:bg-teal-500 transition-all duration-300';
  }
  if (el.spawnStatusLogs) el.spawnStatusLogs.innerHTML = '';

  // Reset preset button highlights
  document.querySelectorAll('.spawn-preset-btn').forEach(b => {
    b.classList.remove('border-teal-500', 'bg-teal-50', 'text-teal-800', 'dark:bg-teal-500/10', 'dark:text-teal-400');
    if (b.getAttribute('data-count') === '1') {
      b.classList.add('border-teal-500', 'bg-teal-50', 'text-teal-800', 'dark:bg-teal-500/10', 'dark:text-teal-400');
    }
  });
}

function closeSpawnModal() {
  if (!el.spawnModal) return;
  el.spawnModal.classList.add('hidden');
  el.spawnModal.classList.remove('flex');
}

async function startBatchSpawn() {
  const count = parseInt(el.spawnCountInput?.value, 10) || 1;
  const clampedCount = Math.min(Math.max(count, 1), 10);

  // Switch UI to in-progress
  el.spawnFormSection?.classList.add('hidden');
  el.spawnProgressSection?.classList.remove('hidden');
  if (el.confirmSpawnBtn) el.confirmSpawnBtn.disabled = true;
  if (el.cancelSpawnBtn) el.cancelSpawnBtn.disabled = true;
  if (el.closeSpawnModalBtn) el.closeSpawnModalBtn.disabled = true;

  if (el.spawnProgressText) {
    el.spawnProgressText.innerHTML = `<span class="w-3.5 h-3.5 border-2 border-teal-600 dark:border-teal-400 border-t-transparent rounded-full animate-spin"></span><span>Membuat ${clampedCount} akun baru via mail.tm & CDP...</span>`;
  }
  if (el.spawnProgressBar) el.spawnProgressBar.style.width = '20%';
  if (el.spawnProgressBadge) el.spawnProgressBadge.innerText = '20%';

  const appendLog = (msg) => {
    if (!el.spawnStatusLogs) return;
    const item = document.createElement('div');
    item.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    el.spawnStatusLogs.appendChild(item);
    el.spawnStatusLogs.scrollTop = el.spawnStatusLogs.scrollHeight;
  };

  appendLog(`Memulai pembuatan ${clampedCount} akun...`);
  appendLog(`Memverifikasi status koneksi CDP browser...`);

  // Progress simulation ticker while server works
  let currentProgress = 25;
  const progressInterval = setInterval(() => {
    if (currentProgress < 85) {
      currentProgress += Math.floor(Math.random() * 5) + 3;
      if (el.spawnProgressBar) el.spawnProgressBar.style.width = `${currentProgress}%`;
      if (el.spawnProgressBadge) el.spawnProgressBadge.innerText = `${currentProgress}%`;
    }
  }, 3000);

  try {
    const res = await fetch('/v1/accounts/spawn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: clampedCount })
    });
    clearInterval(progressInterval);
    const data = await res.json();

    if (res.ok && data.status === 'ok') {
      if (el.spawnProgressBar) el.spawnProgressBar.style.width = '100%';
      if (el.spawnProgressBadge) el.spawnProgressBadge.innerText = '100%';
      if (el.spawnProgressText) {
        el.spawnProgressText.innerHTML = `<span class="text-teal-600 dark:text-teal-400 font-semibold">Pembuatan akun selesai!</span>`;
      }
      appendLog(data.message || `Berhasil membuat ${data.count} akun.`);
      if (data.accounts) {
        data.accounts.forEach(acc => appendLog(`Akun terdaftar: ${acc}`));
      }
      showToast(data.message || 'Akun baru berhasil ditambahkan ke armada.');
      fetchAccountsAndStats();

      setTimeout(() => {
        closeSpawnModal();
      }, 1500);
    } else {
      throw new Error(data.message || 'Server mengembalikan kesalahan pembuatan.');
    }
  } catch (err) {
    clearInterval(progressInterval);
    if (el.spawnProgressBar) {
      el.spawnProgressBar.style.width = '100%';
      el.spawnProgressBar.className = 'h-full bg-red-500 transition-all duration-300';
    }
    if (el.spawnProgressText) {
      el.spawnProgressText.innerHTML = `<span class="text-red-500 font-medium">Gagal membuat akun</span>`;
    }
    appendLog(`Error: ${err.message}`);
    showToast(`Gagal: ${err.message}`);
    if (el.cancelSpawnBtn) el.cancelSpawnBtn.disabled = false;
    if (el.closeSpawnModalBtn) el.closeSpawnModalBtn.disabled = false;
  }
}

window.resetAccountCooldown = async function(id) {
  try {
    await fetch('/v1/accounts/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    fetchAccountsAndStats();
  } catch (err) {
    console.error(err);
  }
};

window.deleteAccount = async function(id) {
  if (!confirm('Yakin ingin menghapus akun ini dari pool?')) return;
  try {
    await fetch('/v1/accounts/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    fetchAccountsAndStats();
  } catch (err) {
    console.error(err);
  }
};

// APA 6th Export Modal
function openApaModal() {
  if (!state.currentSession || !state.currentSession.sources) return;

  const sources = state.currentSession.sources;
  if (sources.length === 0) {
    el.apaOutputTextarea.value = 'Tidak ada sumber rujukan yang terdeteksi pada jawaban ini.';
  } else {
    const entries = sources.map(s => {
      const domain = s.domain || 'situs-web.com';
      const author = s.author || capitalize(domain.split('.')[0]);
      const year = s.year || 2024;
      const title = s.title || 'Dokumen Ilmiah / Artikel Rujukan';
      return `${author}. (${year}). ${title}. Diambil dari ${s.url}`;
    });
    entries.sort();
    el.apaOutputTextarea.value = entries.join('\n\n');
  }

  el.apaModal?.classList.remove('hidden');
  el.apaModal?.classList.add('flex');
}

function copyApaCitations() {
  if (!el.apaOutputTextarea) return;
  el.apaOutputTextarea.select();
  navigator.clipboard.writeText(el.apaOutputTextarea.value);
  showToast('Daftar rujukan APA 6th berhasil disalin ke clipboard.');
}

function copyAnswer() {
  if (!state.currentSession?.answer) return;
  navigator.clipboard.writeText(state.currentSession.answer);
  showToast('Jawaban markdown berhasil disalin.');
}

// Session Persistence
function saveSessions() {
  try {
    localStorage.setItem('op_sessions', JSON.stringify(state.sessions.slice(0, 30)));
  } catch {}
}

function loadSessions() {
  try {
    const saved = localStorage.getItem('op_sessions');
    if (saved) {
      state.sessions = JSON.parse(saved);
      renderSessionHistory();
    }
  } catch {}
}

function renderSessionHistory() {
  if (!el.sessionHistoryList) return;
  el.sessionHistoryList.innerHTML = '';

  if (state.sessions.length === 0) {
    el.sessionHistoryList.innerHTML = '<div class="px-2 py-3 text-center text-slate-400 dark:text-zinc-500 italic">Belum ada sesi pencarian</div>';
    return;
  }

  state.sessions.forEach(sess => {
    const item = document.createElement('button');
    item.className = 'w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/40 truncate block transition text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200';
    item.innerText = sess.query;
    item.title = sess.query;
    item.addEventListener('click', () => loadHistoricalSession(sess));
    el.sessionHistoryList.appendChild(item);
  });
}

function loadHistoricalSession(sess) {
  state.currentSession = sess;
  switchView('studio');
  el.heroContainer?.classList.add('hidden');
  el.conversationContainer?.classList.remove('hidden');
  el.conversationContainer?.classList.add('flex');
  el.floatingInputBar?.classList.remove('hidden');
  if (el.displayQueryText) el.displayQueryText.innerText = sess.query;

  renderSources(sess.sources || []);
  if (el.answerMarkdown) {
    const formatted = sanitizeAndFormatMarkdown(sess.answer || '', sess.sources || []);
    el.answerMarkdown.innerHTML = marked.parse(formatted);
  }
}

function clearAllSessions() {
  if (!confirm('Hapus seluruh riwayat sesi pencarian?')) return;
  state.sessions = [];
  localStorage.removeItem('op_sessions');
  renderSessionHistory();
  startNewChat();
}

// Utility Helpers
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showToast(message) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black font-medium text-xs shadow-2xl transition-opacity duration-300 opacity-0 pointer-events-none';
    document.body.appendChild(toast);
  }

  toast.innerText = message;
  toast.classList.remove('opacity-0');
  toast.classList.add('opacity-100');

  setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0');
  }, 3000);
}
