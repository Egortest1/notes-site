const USERS_KEY = 'noteFlow.demoUsers.v1';
const SESSION_KEY = 'noteFlow.demoSession.v1';
const GAME_URL = 'https://lovable.dev/preview/Hgh5eKFZwTwWUcO2JuRNE6AsY0wwPxXq';
const DEFAULT_NOTES = [
  { id: crypto.randomUUID(), title: 'План на неделю', content: 'Подготовить презентацию, проверить текущие задачи и записать идеи для нового проекта.', category: 'work', pinned: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: crypto.randomUUID(), title: 'Идея для отдыха', content: 'Сходить в парк, купить кофе и понаблюдать за закатом.', category: 'personal', pinned: false, createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: crypto.randomUUID(), title: 'Тема для блога', content: 'Как построить полезный личный дневник без перегрузки.', category: 'ideas', pinned: false, createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date(Date.now() - 172800000).toISOString() }
];
const state = { user: null, authMode: 'login', notes: [], games: [], filter: 'all', sortDirection: 'desc', search: '', view: 'notes' };
const $ = (id) => document.getElementById(id);
const els = {
  app: $('app-shell'), auth: $('auth-screen'), authForm: $('auth-form'), authEmail: $('auth-email'), authName: $('auth-name'), authPassword: $('auth-password'), authError: $('auth-error'), authHeading: $('auth-heading'), authSubmit: $('auth-submit'),
  notesGrid: $('notes-grid'), searchInput: $('search-input'), newNoteBtn: $('new-note-btn'), modal: $('note-modal'), noteForm: $('note-form'), noteId: $('note-id'), noteTitle: $('note-title'), noteCategory: $('note-category'), noteContent: $('note-content'), notePinned: $('note-pinned'), modalTitle: $('modal-title'), currentSectionTitle: $('current-section-title'), sortBtn: $('sort-btn'),
  gamesView: $('games-view'), notesView: $('notes-view'), gamesList: $('games-list'), gameForm: $('game-form'), gameTitle: $('game-title'), gameUrl: $('game-url')
};
const categoryLabels = { all: 'Все заметки', pinned: 'Избранное', work: 'Работа', personal: 'Личное', ideas: 'Идеи', general: 'Общее' };
const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const userKey = (kind) => `noteFlow.${kind}.${state.user.id}`;

function setAuthMode(mode) {
  state.authMode = mode;
  const registering = mode === 'register';
  $('login-tab').classList.toggle('active', !registering);
  $('register-tab').classList.toggle('active', registering);
  $('login-tab').setAttribute('aria-selected', String(!registering));
  $('register-tab').setAttribute('aria-selected', String(registering));
  $('name-field').hidden = !registering;
  els.authName.required = registering;
  els.authHeading.textContent = registering ? 'Создайте аккаунт' : 'С возвращением';
  els.authSubmit.textContent = registering ? 'Зарегистрироваться' : 'Войти';
  els.authPassword.autocomplete = registering ? 'new-password' : 'current-password';
  els.authError.textContent = '';
}

async function passwordHash(password, salt) {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 120000, hash: 'SHA-256' }, material, 256);
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function handleAuth(event) {
  event.preventDefault();
  els.authError.textContent = '';
  const email = els.authEmail.value.trim().toLowerCase();
  const password = els.authPassword.value;
  const name = els.authName.value.trim();
  if (!crypto.subtle) { els.authError.textContent = 'Для входа откройте сайт через HTTPS или localhost.'; return; }
  const users = readJSON(USERS_KEY, []);
  try {
    if (state.authMode === 'register') {
      if (password.length < 8) throw new Error('Пароль должен содержать не менее 8 символов.');
      if (!name) throw new Error('Укажите имя аккаунта.');
      if (users.some((user) => user.email === email)) throw new Error('Аккаунт с таким email уже существует.');
      const user = { id: crypto.randomUUID(), email, name, salt: crypto.randomUUID() };
      user.hash = await passwordHash(password, user.salt);
      users.push(user);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      enterApp(user);
    } else {
      const user = users.find((item) => item.email === email);
      if (!user || await passwordHash(password, user.salt) !== user.hash) throw new Error('Неверный email или пароль.');
      enterApp(user);
    }
  } catch (error) {
    els.authError.textContent = error.message || 'Не удалось выполнить вход.';
  }
}

function enterApp(user) {
  state.user = { id: user.id, email: user.email, name: user.name || user.email.split('@')[0] };
  localStorage.setItem(SESSION_KEY, user.id);
  els.auth.hidden = true;
  els.app.hidden = false;
  $('user-label').textContent = state.user.name;
  $('user-label').title = state.user.email;
  $('user-avatar').textContent = state.user.name.trim().slice(0, 1).toUpperCase();
  loadUserData();
  renderAll();
}

function resumeSession() {
  const id = localStorage.getItem(SESSION_KEY);
  const user = readJSON(USERS_KEY, []).find((item) => item.id === id);
  if (user) enterApp(user);
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  state.user = null; state.notes = []; state.games = [];
  els.app.hidden = true; els.auth.hidden = false; els.authForm.reset(); setAuthMode('login');
}

function loadUserData() {
  const notes = readJSON(userKey('notes'), null);
  state.notes = Array.isArray(notes) ? notes : structuredClone(DEFAULT_NOTES);
  const games = readJSON(userKey('games'), []);
  state.games = Array.isArray(games) ? games : [];
  if (!notes) saveNotes();
  if (!state.games.some((game) => game.url === GAME_URL)) {
    state.games.unshift({ id: 'lovable-preview-hgh5ekf', title: 'Моя мини-игра', url: GAME_URL });
    saveGames();
  }
}
function saveNotes() { localStorage.setItem(userKey('notes'), JSON.stringify(state.notes)); }
function saveGames() { localStorage.setItem(userKey('games'), JSON.stringify(state.games)); }
function categoryName(category) { return categoryLabels[category] || 'Общее'; }

function getFilteredNotes() {
  const search = state.search.trim().toLocaleLowerCase('ru');
  let filtered = [...state.notes];
  if (state.filter === 'pinned') filtered = filtered.filter((note) => note.pinned);
  else if (state.filter !== 'all') filtered = filtered.filter((note) => note.category === state.filter);
  if (search) filtered = filtered.filter((note) => `${note.title} ${note.content}`.toLocaleLowerCase('ru').includes(search));
  filtered.sort((a, b) => state.sortDirection === 'desc' ? new Date(b.updatedAt) - new Date(a.updatedAt) : new Date(a.updatedAt) - new Date(b.updatedAt));
  return filtered;
}

function renderCounts() {
  const count = (predicate) => state.notes.filter(predicate).length;
  $('count-all').textContent = state.notes.length;
  $('count-pinned').textContent = count((note) => note.pinned);
  $('count-work').textContent = count((note) => note.category === 'work');
  $('count-personal').textContent = count((note) => note.category === 'personal');
  $('count-ideas').textContent = count((note) => note.category === 'ideas');
  $('game-count').textContent = state.games.length;
  $('stat-total').textContent = state.notes.length;
  $('stat-pinned').textContent = count((note) => note.pinned);
  const weekAgo = Date.now() - 7 * 86400000;
  $('stat-week').textContent = count((note) => new Date(note.updatedAt).getTime() > weekAgo);
  const today = new Date().toDateString();
  const daily = count((note) => new Date(note.updatedAt).toDateString() === today);
  $('today-count').textContent = `${daily} ${daily === 1 ? 'заметка' : 'заметок'}`;
}

function renderNotes() {
  const notes = getFilteredNotes();
  els.notesGrid.replaceChildren();
  if (!notes.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const inner = document.createElement('div'); inner.className = 'empty-state-inner';
    const title = document.createElement('h3'); title.textContent = state.search ? 'Ничего не найдено' : 'Заметок пока нет';
    const text = document.createElement('p'); text.textContent = state.search ? 'Измените поисковый запрос или фильтр.' : 'Создайте первую заметку — она появится здесь.';
    inner.append(title, text); empty.append(inner); els.notesGrid.append(empty); return;
  }
  const template = $('note-card-template');
  notes.forEach((note) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector('.note-card');
    card.dataset.color = note.category;
    card.classList.toggle('pinned', note.pinned);
    fragment.querySelector('.note-tag').textContent = categoryName(note.category);
    fragment.querySelector('.note-title').textContent = note.title;
    fragment.querySelector('.note-preview').textContent = note.content;
    const date = fragment.querySelector('.note-date'); date.dateTime = note.updatedAt; date.textContent = formatDate(note.updatedAt);
    const pin = fragment.querySelector('.pin-btn'); pin.textContent = note.pinned ? '📍' : '📌';
    pin.setAttribute('aria-label', note.pinned ? 'Убрать из избранного' : 'Добавить в избранное');
    pin.addEventListener('click', () => togglePin(note.id));
    fragment.querySelector('.edit-btn').addEventListener('click', () => openModal(note.id));
    fragment.querySelector('.delete-btn').addEventListener('click', () => deleteNote(note.id));
    els.notesGrid.append(fragment);
  });
}
function formatDate(value) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)); }
function renderSectionTitle() { els.currentSectionTitle.textContent = categoryLabels[state.filter] || 'Все заметки'; }

function renderGames() {
  els.gamesList.replaceChildren();
  if (!state.games.length) {
    const empty = document.createElement('div'); empty.className = 'empty-state';
    const inner = document.createElement('div'); inner.className = 'empty-state-inner';
    const heading = document.createElement('h3'); heading.textContent = 'Пока нет игр';
    const text = document.createElement('p'); text.textContent = 'Добавьте ссылку на свою мини-игру в форме выше.';
    inner.append(heading, text); empty.append(inner); els.gamesList.append(empty); return;
  }
  state.games.forEach((game) => {
    const card = document.createElement('article'); card.className = 'game-card';
    const heading = document.createElement('div'); heading.className = 'game-heading';
    const title = document.createElement('h3'); title.textContent = game.title;
    const remove = document.createElement('button'); remove.className = 'ghost-btn remove-game-btn'; remove.type = 'button'; remove.textContent = 'Удалить';
    remove.setAttribute('aria-label', `Удалить игру «${game.title}»`);
    remove.addEventListener('click', () => { state.games = state.games.filter((item) => item.id !== game.id); saveGames(); renderAll(); });
    heading.append(title, remove);
    const frame = document.createElement('iframe'); frame.src = game.url; frame.title = game.title; frame.loading = 'lazy'; frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-pointer-lock allow-popups'); frame.allow = 'fullscreen; gamepad; autoplay'; frame.allowFullscreen = true;
    const link = document.createElement('a'); link.href = game.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.className = 'game-open-link'; link.textContent = 'Открыть игру отдельно ↗';
    card.append(heading, frame, link); els.gamesList.append(card);
  });
}

function openModal(noteId = null) {
  els.modal.classList.remove('hidden'); els.modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('modal-open');
  if (!noteId) { els.modalTitle.textContent = 'Новая заметка'; els.noteForm.reset(); els.noteId.value = ''; els.noteCategory.value = 'work'; els.notePinned.checked = false; requestAnimationFrame(() => els.noteTitle.focus()); return; }
  const note = state.notes.find((item) => item.id === noteId); if (!note) return;
  els.modalTitle.textContent = 'Редактировать заметку'; els.noteId.value = note.id; els.noteTitle.value = note.title; els.noteCategory.value = note.category; els.noteContent.value = note.content; els.notePinned.checked = note.pinned;
  requestAnimationFrame(() => els.noteTitle.focus());
}
function closeModal() { els.modal.classList.add('hidden'); els.modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('modal-open'); els.noteForm.reset(); els.noteId.value = ''; }
function saveNote(event) {
  event.preventDefault();
  const id = els.noteId.value;
  const payload = { title: els.noteTitle.value.trim(), content: els.noteContent.value.trim(), category: els.noteCategory.value, pinned: els.notePinned.checked };
  if (!payload.title || !payload.content) return;
  if (id) state.notes = state.notes.map((note) => note.id === id ? { ...note, ...payload, updatedAt: new Date().toISOString() } : note);
  else state.notes.unshift({ id: crypto.randomUUID(), ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  saveNotes(); renderAll(); closeModal();
}
function togglePin(id) { state.notes = state.notes.map((note) => note.id === id ? { ...note, pinned: !note.pinned, updatedAt: new Date().toISOString() } : note); saveNotes(); renderAll(); }
function deleteNote(id) { const note = state.notes.find((item) => item.id === id); if (!note || !window.confirm(`Удалить заметку «${note.title}»?`)) return; state.notes = state.notes.filter((item) => item.id !== id); saveNotes(); renderAll(); }
function switchView(view, filter = 'all') {
  state.view = view; state.filter = filter;
  els.notesView.hidden = view !== 'notes'; els.gamesView.hidden = view !== 'games';
  $('page-title').textContent = view === 'games' ? 'Мини-игры' : 'Заметки';
  $('search-wrap').hidden = view === 'games'; els.newNoteBtn.hidden = view === 'games';
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view && item.dataset.filter === filter));
  renderAll();
}
function renderAll() { renderCounts(); renderSectionTitle(); renderNotes(); renderGames(); }

function bindEvents() {
  $('login-tab').addEventListener('click', () => setAuthMode('login'));
  $('register-tab').addEventListener('click', () => setAuthMode('register'));
  els.authForm.addEventListener('submit', handleAuth);
  $('logout-btn').addEventListener('click', logout);
  document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view, button.dataset.filter)));
  els.searchInput.addEventListener('input', (event) => { state.search = event.target.value; renderNotes(); });
  els.newNoteBtn.addEventListener('click', () => openModal());
  els.sortBtn.addEventListener('click', () => { state.sortDirection = state.sortDirection === 'desc' ? 'asc' : 'desc'; els.sortBtn.textContent = state.sortDirection === 'desc' ? 'Сначала новые' : 'Сначала старые'; renderNotes(); });
  els.noteForm.addEventListener('submit', saveNote);
  $('close-modal-btn').addEventListener('click', closeModal); $('cancel-btn').addEventListener('click', closeModal);
  document.querySelector('[data-close="true"]').addEventListener('click', closeModal);
  els.gameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    let url; try { url = new URL(els.gameUrl.value.trim()); } catch { els.gameUrl.setCustomValidity('Введите корректную ссылку.'); els.gameUrl.reportValidity(); return; }
    els.gameUrl.setCustomValidity('');
    if (!['http:', 'https:'].includes(url.protocol)) return;
    if (state.games.some((game) => game.url === url.href)) { els.gameUrl.setCustomValidity('Эта игра уже добавлена.'); els.gameUrl.reportValidity(); return; }
    state.games.unshift({ id: crypto.randomUUID(), title: els.gameTitle.value.trim(), url: url.href }); saveGames(); els.gameForm.reset(); renderAll();
  });
  els.gameUrl.addEventListener('input', () => els.gameUrl.setCustomValidity(''));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !els.modal.classList.contains('hidden')) closeModal(); });
}

bindEvents();
resumeSession();
