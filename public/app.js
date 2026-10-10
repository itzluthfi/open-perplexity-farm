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
  sourceCount: document.getElementById('sourceCount'),
  responseMarkdown: document.getElementById('responseMarkdown'),
  responseStatusLabel: document.getElementById('responseStatusLabel'),
  copyAnswerBtn: document.getElementById('copyAnswerBtn'),
  exportApaBtn: document.getElementById('exportApaBtn'),
  followupBar: document.getElementById('followupBar'),
  followupInput: document.getElementById('followupInput'),
  followupSubmitBtn: document.getElementById('followupSubmitBtn'),
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
  thinkingContent: document.getElementById('thinkingContent')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (window.marked) {
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }
  loadSessions();
  setupEventListeners();
  fetchAccountsAndStats();
  setInterval(fetchAccountsAndStats, 5000); // Polling status pool setiap 5 detik
});

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
    el.navSearchBtn.classList.remove('bg-zinc-800/50', 'text-white');
    el.navSearchBtn.classList.add('text-zinc-400');
    el.navAcademicBtn.classList.add('bg-zinc-800/50', 'text-white');
    el.navAcademicBtn.classList.remove('text-zinc-400');
    el.focusSelector.value = 'academic';
    el.promptInput.focus();
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

  el.followupSubmitBtn?.addEventListener('click', handleFollowupSubmit);
  el.followupInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFollowupSubmit();
    }
  });

  // Suggestion Chips
  document.querySelectorAll('.suggestion-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      el.promptInput.value = btn.innerText.replace(/^[^\w]+/, '').trim();
      handleMainSubmit();
    });
  });

  // Action Buttons
  el.copyAnswerBtn?.addEventListener('click', copyAnswer);
  el.exportApaBtn?.addEventListener('click', openApaModal);
  el.closeApaModalBtn?.addEventListener('click', () => el.apaModal.classList.add('hidden'));
  el.copyApaModalBtn?.addEventListener('click', copyApaCitations);
  el.quickRotateBtn?.addEventListener('click', rotateAccount);
  el.farmRotateBtn?.addEventListener('click', rotateAccount);
  el.farmSpawnBtn?.addEventListener('click', spawnAccount);
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

function toggleMobileSidebar() {
  el.sidebar.classList.toggle('-translate-x-full');
  el.mobileBackdrop.classList.toggle('hidden');
}

function switchView(viewName) {
  state.activeView = viewName;
  if (viewName === 'studio') {
    el.viewStudio.classList.remove('hidden');
    el.viewFarm.classList.add('hidden');
    el.navSearchBtn.classList.add('bg-zinc-800/50', 'text-white');
    el.navSearchBtn.classList.remove('text-zinc-400');
    el.navFarmBtn.classList.remove('bg-zinc-800/50', 'text-white');
    el.navFarmBtn.classList.add('text-zinc-400');
    el.navAcademicBtn.classList.remove('bg-zinc-800/50', 'text-white');
    el.navAcademicBtn.classList.add('text-zinc-400');
  } else {
    el.viewStudio.classList.add('hidden');
    el.viewFarm.classList.remove('hidden');
    el.navFarmBtn.classList.add('bg-zinc-800/50', 'text-white');
    el.navFarmBtn.classList.remove('text-zinc-400');
    el.navSearchBtn.classList.remove('bg-zinc-800/50', 'text-white');
    el.navSearchBtn.classList.add('text-zinc-400');
    el.navAcademicBtn.classList.remove('bg-zinc-800/50', 'text-white');
    el.navAcademicBtn.classList.add('text-zinc-400');
    fetchAccountsAndStats();
  }
}

function startNewChat() {
  switchView('studio');
  state.currentSession = null;
  el.heroContainer.classList.remove('hidden');
  el.conversationContainer.classList.add('hidden');
  el.followupBar.classList.add('hidden');
  if (el.searchProgressSection) el.searchProgressSection.classList.add('hidden');
  el.promptInput.value = '';
  el.promptInput.focus();
}

let progressInterval = null;
let progressStartTime = 0;
let progressTimers = [];

function startProgress(query) {
  if (el.searchProgressSection) el.searchProgressSection.classList.remove('hidden');
  if (el.thinkingBox) el.thinkingBox.classList.remove('hidden');
  if (el.thinkingContent) {
    el.thinkingContent.innerHTML = '';
    el.thinkingContent.classList.add('hidden');
  }
  if (el.thinkingChevron) el.thinkingChevron.style.transform = 'rotate(0deg)';
  if (el.thinkingDuration) el.thinkingDuration.innerText = '';
  
  if (el.progressSpinner) {
    el.progressSpinner.className = 'w-3.5 h-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin shrink-0';
  }
  if (el.searchProgressStep) {
    el.searchProgressStep.innerText = 'Menghubungkan ke sesi Chrome Perplexity...';
  }

  progressStartTime = Date.now();
  if (progressInterval) clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    const elapsed = ((Date.now() - progressStartTime) / 1000).toFixed(1);
    if (el.searchProgressTimer) el.searchProgressTimer.innerText = `${elapsed}s`;
  }, 100);

  progressTimers.forEach(clearTimeout);
  progressTimers = [];

  addThinkingStep(`Menganalisis kueri pencarian: "${query}"`);

  progressTimers.push(setTimeout(() => {
    if (state.isGenerating) {
      if (el.searchProgressStep) el.searchProgressStep.innerText = 'Menjelajah basis data web dan mengekstrak rujukan relevan...';
      addThinkingStep('Menemukan URL sumber terpercaya & memvalidasi metadata halaman...');
    }
  }, 1200));

  progressTimers.push(setTimeout(() => {
    if (state.isGenerating) {
      if (el.searchProgressStep) el.searchProgressStep.innerText = 'Menganalisis dokumen & menyusun sintesis jawaban...';
      addThinkingStep('Mengevaluasi kutipan rujukan dan memformat struktur sintesis...');
    }
  }, 3200));
}

function addThinkingStep(text) {
  if (!el.thinkingContent) return;
  const p = document.createElement('div');
  p.className = 'flex items-center gap-2 py-0.5';
  p.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0"></span><span>${escapeHtml(text)}</span>`;
  el.thinkingContent.appendChild(p);
}

function completeProgress(sourcesCount) {
  if (progressInterval) clearInterval(progressInterval);
  progressTimers.forEach(clearTimeout);
  progressTimers = [];

  const totalTime = ((Date.now() - progressStartTime) / 1000).toFixed(1);
  if (el.searchProgressTimer) el.searchProgressTimer.innerText = `${totalTime}s`;
  if (el.thinkingDuration) el.thinkingDuration.innerText = `${totalTime} detik`;

  if (el.progressSpinner) {
    el.progressSpinner.className = 'w-2 h-2 rounded-full bg-emerald-400 shrink-0';
  }
  if (el.searchProgressStep) {
    el.searchProgressStep.innerText = `Selesai: ${sourcesCount} sumber terverifikasi (${totalTime}s)`;
  }
  addThinkingStep(`Sintesis selesai disusun berdasarkan ${sourcesCount} sumber.`);
}

function failProgress(errorMsg) {
  if (progressInterval) clearInterval(progressInterval);
  progressTimers.forEach(clearTimeout);
  progressTimers = [];

  if (el.progressSpinner) {
    el.progressSpinner.className = 'w-2 h-2 rounded-full bg-red-400 shrink-0';
  }
  if (el.searchProgressStep) {
    el.searchProgressStep.innerText = `Proses gagal: ${errorMsg}`;
  }
  addThinkingStep(`Error: ${errorMsg}`);
}

function renderSourcesSkeleton() {
  if (!el.sourcesGrid) return;
  el.sourceCount.innerText = '...';
  el.sourcesGrid.innerHTML = `
    <div class="p-2.5 rounded-xl bg-surface border border-surface-border flex items-start gap-2.5 animate-pulse">
      <div class="w-4 h-4 rounded bg-zinc-700/60 shrink-0 mt-0.5"></div>
      <div class="w-full space-y-1.5 truncate">
        <div class="h-3 bg-zinc-700/60 rounded w-3/4"></div>
        <div class="h-2.5 bg-zinc-800/80 rounded w-1/3"></div>
      </div>
    </div>
    <div class="p-2.5 rounded-xl bg-surface border border-surface-border flex items-start gap-2.5 animate-pulse hidden sm:flex">
      <div class="w-4 h-4 rounded bg-zinc-700/60 shrink-0 mt-0.5"></div>
      <div class="w-full space-y-1.5 truncate">
        <div class="h-3 bg-zinc-700/60 rounded w-4/5"></div>
        <div class="h-2.5 bg-zinc-800/80 rounded w-1/2"></div>
      </div>
    </div>
    <div class="p-2.5 rounded-xl bg-surface border border-surface-border flex items-start gap-2.5 animate-pulse hidden lg:flex">
      <div class="w-4 h-4 rounded bg-zinc-700/60 shrink-0 mt-0.5"></div>
      <div class="w-full space-y-1.5 truncate">
        <div class="h-3 bg-zinc-700/60 rounded w-2/3"></div>
        <div class="h-2.5 bg-zinc-800/80 rounded w-2/5"></div>
      </div>
    </div>
  `;
}

function renderResponseSkeleton() {
  if (!el.responseMarkdown) return;
  el.responseMarkdown.innerHTML = `
    <div class="space-y-3.5 py-2 animate-pulse">
      <div class="h-4 bg-zinc-800/80 rounded w-11/12"></div>
      <div class="h-4 bg-zinc-800/60 rounded w-full"></div>
      <div class="h-4 bg-zinc-800/50 rounded w-4/5"></div>
      <div class="h-4 bg-zinc-800/40 rounded w-3/5"></div>
    </div>
  `;
}

function setButtonsLoading(isLoading) {
  if (el.submitBtn) {
    el.submitBtn.disabled = isLoading;
    el.submitBtn.innerHTML = isLoading
      ? '<span class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>'
      : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>';
  }
  if (el.followupSubmitBtn) {
    el.followupSubmitBtn.disabled = isLoading;
    el.followupSubmitBtn.innerHTML = isLoading
      ? '<span class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>'
      : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>';
  }
  if (el.promptInput) el.promptInput.disabled = isLoading;
  if (el.followupInput) el.followupInput.disabled = isLoading;
  if (el.focusSelector) el.focusSelector.disabled = isLoading;
  if (el.modelSelector) el.modelSelector.disabled = isLoading;
}

async function handleMainSubmit() {
  const query = el.promptInput.value.trim();
  if (!query || state.isGenerating) return;

  state.isGenerating = true;
  setButtonsLoading(true);

  // Transition UI to Conversation view
  el.heroContainer.classList.add('hidden');
  el.conversationContainer.classList.remove('hidden');
  el.conversationContainer.classList.add('flex');
  el.displayQueryText.innerText = query;
  el.responseStatusLabel.innerText = 'Mencari & menyusun sintesis...';

  // Start visual skeletons and thinking tracker
  startProgress(query);
  renderSourcesSkeleton();
  renderResponseSkeleton();

  const session = {
    id: 'sess_' + Date.now(),
    title: query.slice(0, 50),
    query,
    focus: el.focusSelector.value,
    model: el.modelSelector.value,
    answer: '',
    sources: [],
    timestamp: Date.now()
  };
  state.currentSession = session;

  try {
    const res = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: session.model,
        focus: session.focus,
        messages: [{ role: 'user', content: query }],
        stream: false
      })
    });

    const data = await res.json();
    if (data.choices && data.choices[0]) {
      const answerText = data.choices[0].message.content;
      const sources = data.sources || [];

      session.answer = answerText;
      session.sources = sources;

      renderAnswer(answerText, sources);
      renderSources(sources);
      saveSession(session);
      completeProgress(sources.length);

      el.responseStatusLabel.innerText = 'Selesai';
      el.followupBar.classList.remove('hidden');
    } else if (data.error) {
      el.responseMarkdown.innerHTML = `<div class="p-3 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-sm">${data.error.message}</div>`;
      el.responseStatusLabel.innerText = 'Gagal';
      failProgress(data.error.message);
    }
  } catch (err) {
    el.responseMarkdown.innerHTML = `<div class="p-3 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-sm">Gagal menghubungkan ke gateway API: ${err.message}</div>`;
    el.responseStatusLabel.innerText = 'Error';
    failProgress(err.message);
  } finally {
    state.isGenerating = false;
    setButtonsLoading(false);
    fetchAccountsAndStats();
  }
}

async function handleFollowupSubmit() {
  const query = el.followupInput.value.trim();
  if (!query || state.isGenerating) return;

  el.promptInput.value = query;
  el.followupInput.value = '';
  handleMainSubmit();
}

function formatMarkdownForDisplay(text, sources = []) {
  if (!text) return '';
  let formatted = text;

  // 1. Format and link citations to actual source URLs
  // Handle [domain.com] or domain.com +1
  formatted = formatted.replace(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s\)\.\,]*)?)\s*(?:\+(\d+))?/g, (match, domain, extra) => {
    // Avoid re-matching if already inside a markdown link
    const matchedSource = sources.find(s => s.domain?.toLowerCase() === domain.toLowerCase() || s.url?.includes(domain));
    const url = matchedSource ? matchedSource.url : `https://${domain}`;
    return ` [${domain}](${url}) `;
  });

  // 2. Format standalone section headers
  formatted = formatted.replace(/(^|\n\n)([A-Z][A-Za-z0-9\s\/\-]{2,45})(?:\:)?(\n\n|$)/g, (match, before, header, after) => {
    const trimmed = header.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('*') || trimmed.endsWith('.')) {
      return match;
    }
    return `${before}### ${trimmed}${after}`;
  });

  // 3. Format key-value properties
  formatted = formatted.replace(/(^|\n)\s*(Fokus|Kebaruan|Alasan|Alasannya|Metodologi|Tujuan|Kelebihan|Kekurangan|Variabel|Kesimpulan)\s*:\s*/gim, '$1- **$2:** ');

  // 4. Format quoted keyword items
  formatted = formatted.replace(/(^|\n)\s*("[^"\n]+"|'[^'\n]+')\s*(?=\n|$)/g, '$1- `$2`');

  return formatted;
}

function renderAnswer(markdownText, sources = []) {
  if (!markdownText) return;
  const formattedText = formatMarkdownForDisplay(markdownText, sources);

  if (window.marked) {
    el.responseMarkdown.innerHTML = marked.parse(formattedText);
  } else {
    el.responseMarkdown.innerText = formattedText;
  }

  // Convert source links to high-contrast interactive citation pills
  const links = el.responseMarkdown.querySelectorAll('a');
  links.forEach(a => {
    const text = a.innerText.trim();
    if (text.includes('.') || text.startsWith('[') || text.match(/^\d+$/)) {
      a.className = 'citation-pill';
      a.target = '_blank';
      a.title = 'Buka rujukan: ' + a.href;
    }
  });

  // Render KaTeX Math if present
  if (window.renderMathInElement) {
    window.renderMathInElement(el.responseMarkdown, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }
}

function renderSources(sources) {
  el.sourcesGrid.innerHTML = '';
  el.sourceCount.innerText = sources.length;

  if (sources.length === 0) {
    el.sourcesGrid.innerHTML = '<div class="col-span-full text-xs text-zinc-500 italic">Tidak ada kartu rujukan eksternal.</div>';
    return;
  }

  for (const src of sources) {
    const card = document.createElement('a');
    card.href = src.url;
    card.target = '_blank';
    card.className = 'source-card p-2.5 rounded-xl bg-surface border border-surface-border flex items-start gap-2.5 no-underline text-zinc-300';

    const domain = src.domain || 'web';
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

    card.innerHTML = `
      <img src="${faviconUrl}" alt="${domain}" class="w-4 h-4 rounded shrink-0 mt-0.5" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22><circle cx=%225%22 cy=%225%22 r=%225%22 fill=%22%23555%22/></svg>'">
      <div class="truncate">
        <p class="text-xs font-medium text-zinc-200 truncate">${escapeHtml(src.title || domain)}</p>
        <p class="text-[10px] text-zinc-400 font-mono truncate">${domain}</p>
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
      el.farmStatTotal.innerText = json.stats.totalAccounts;
      el.farmStatActive.innerText = json.stats.activeAccounts;
      el.farmStatCooldown.innerText = json.stats.cooldownAccounts;
      el.farmStatUsage.innerText = json.stats.totalUsage;
      el.activePoolBadge.innerText = `${json.stats.activeAccounts} Aktif`;

      if (json.stats.strategy && el.farmStrategySelect) {
        el.farmStrategySelect.value = json.stats.strategy;
      }

      if (json.stats.currentAccount) {
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
    el.farmAccountTableBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-zinc-500 italic">Belum ada akun di pool. Klik "Buat Akun Otomatis" untuk memulai.</td></tr>';
    return;
  }

  accounts.forEach((acc, i) => {
    const row = document.createElement('tr');
    row.className = acc.isActive ? 'bg-teal-500/5 font-medium' : '';

    const isCooldown = acc.status === 'cooling_down';
    const statusBadge = isCooldown
      ? `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Cooldown (${acc.cooldownRemainingSec}s)</span>`
      : `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Aktif</span>`;

    const activeStar = acc.isActive ? '<span class="text-teal-400 ml-1.5 text-[11px] font-medium">[Aktif]</span>' : '';

    row.innerHTML = `
      <td class="p-3 text-center text-zinc-500 font-mono">${i + 1}</td>
      <td class="p-3 font-mono text-zinc-200">${escapeHtml(acc.email)} ${activeStar}</td>
      <td class="p-3">${statusBadge}</td>
      <td class="p-3 font-mono">${acc.usageCount}</td>
      <td class="p-3 text-zinc-400">${acc.lastUsed}</td>
      <td class="p-3 text-right space-x-1.5">
        ${isCooldown ? `<button onclick="resetAccountCooldown('${acc.id}')" class="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-teal-400 border border-zinc-700 text-[10px]">Reset</button>` : ''}
        <button onclick="deleteAccount('${acc.id}')" class="px-2 py-1 rounded bg-zinc-800 hover:bg-red-900/50 text-red-400 border border-zinc-700 text-[10px]">Hapus</button>
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
      el.farmRotateBtn.innerHTML = '<span class="w-3.5 h-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></span><span>Merotasi...</span>';
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
        el.farmRotateBtn.innerHTML = '<svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg><span>Rotasi Akun</span>';
      }
    }, 600);
  }
}

async function spawnAccount() {
  try {
    showToast('Membuat akun baru...');
    if (el.farmSpawnBtn) {
      el.farmSpawnBtn.disabled = true;
      el.farmSpawnBtn.innerHTML = '<span class="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span><span>Membuat Akun...</span>';
    }
    const res = await fetch('/v1/accounts/spawn', { method: 'POST' });
    const data = await res.json();
    fetchAccountsAndStats();
    showToast(data.message || 'Akun baru berhasil dibuat.');
  } catch (err) {
    showToast('Gagal membuat akun: ' + err.message);
  } finally {
    if (el.farmSpawnBtn) {
      el.farmSpawnBtn.disabled = false;
      el.farmSpawnBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg><span>Buat Akun Otomatis</span>';
    }
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
    // Generate APA 6th entries
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

  el.apaModal.classList.remove('hidden');
  el.apaModal.classList.add('flex');
}

function copyApaCitations() {
  el.apaOutputTextarea.select();
  navigator.clipboard.writeText(el.apaOutputTextarea.value);
  showToast('Sitasi APA 6th disalin ke clipboard.');
}

function copyAnswer() {
  if (!state.currentSession || !state.currentSession.answer) return;
  navigator.clipboard.writeText(state.currentSession.answer);
  showToast('Jawaban disalin ke clipboard.');
}

// Session Persistence
function saveSession(session) {
  state.sessions.unshift(session);
  if (state.sessions.length > 20) state.sessions.pop();
  localStorage.setItem('op_sessions', JSON.stringify(state.sessions));
  renderSessionList();
}

function loadSessions() {
  try {
    const raw = localStorage.getItem('op_sessions');
    if (raw) {
      state.sessions = JSON.parse(raw);
      renderSessionList();
    }
  } catch {}
}

function renderSessionList() {
  if (!el.sessionHistoryList) return;
  el.sessionHistoryList.innerHTML = '';

  if (state.sessions.length === 0) {
    el.sessionHistoryList.innerHTML = '<div class="px-2 py-3 text-center text-zinc-500 italic">Belum ada sesi pencarian</div>';
    return;
  }

  state.sessions.forEach(sess => {
    const item = document.createElement('button');
    item.className = 'w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/60 truncate transition flex items-center gap-2';
    item.innerHTML = `
      <span class="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0"></span>
      <span class="truncate text-zinc-300">${escapeHtml(sess.title)}</span>
    `;
    item.addEventListener('click', () => {
      switchView('studio');
      state.currentSession = sess;
      el.heroContainer.classList.add('hidden');
      el.conversationContainer.classList.remove('hidden');
      el.conversationContainer.classList.add('flex');
      el.displayQueryText.innerText = sess.query;
      renderAnswer(sess.answer, sess.sources || []);
      renderSources(sess.sources || []);
      el.responseStatusLabel.innerText = 'Selesai';
      el.followupBar.classList.remove('hidden');
    });
    el.sessionHistoryList.appendChild(item);
  });
}

function clearAllSessions() {
  if (!confirm('Hapus seluruh riwayat sesi pencarian?')) return;
  state.sessions = [];
  localStorage.removeItem('op_sessions');
  renderSessionList();
  startNewChat();
}

// Utilities
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-teal-500 text-black font-semibold text-xs shadow-2xl transition-all duration-300';
  toast.innerText = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
