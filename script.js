const STORAGE_KEY = 'noteFlow.notes.v1';
const DEFAULT_NOTES = [
  {
    id: crypto.randomUUID(),
    title: 'План на неделю',
    content: '1. Подготовить презентацию для клиента.\n2. Проверить задачу по разработке.\n3. Записать идеи для нового продукта.',
    category: 'work',
    pinned: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    title: 'Идея для вечернего отдыха',
    content: 'Сходить в парк, купить кофе и понаблюдать за закатом. Возможно, взять книгу для чтения.',
    category: 'personal',
    pinned: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    title: 'Тема для блога',
    content: 'Как построить полезный личный дневник без перегрузки. Примеры форм и структур.',
    category: 'ideas',
    pinned: false,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  }
];

const state = {
  notes: [],
  filter: 'all',
  sortDirection: 'desc',
  search: '',
};

const els = {
  notesGrid: document.getElementById('notes-grid'),
  searchInput: document.getElementById('search-input'),
  newNoteBtn: document.getElementById('new-note-btn'),
  modal: document.getElementById('note-modal'),
  noteForm: document.getElementById('note-form'),
  noteId: document.getElementById('note-id'),
  noteTitle: document.getElementById('note-title'),
  noteCategory: document.getElementById('note-category'),
  noteContent: document.getElementById('note-content'),
  notePinned: document.getElementById('note-pinned'),
  modalTitle: document.getElementById('modal-title'),
  currentSectionTitle: document.getElementById('current-section-title'),
  sortBtn: document.getElementById('sort-btn'),
};

const categoryLabels = {
  all: 'Все заметки',
  pinned: 'Избранное',
  work: 'Работа',
  personal: 'Личное',
  ideas: 'Идеи',
  general: 'Общее',
};

function loadNotes() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    state.notes = DEFAULT_NOTES;
    saveNotes();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.notes = Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_NOTES;
  } catch (error) {
    state.notes = DEFAULT_NOTES;
  }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
}

function categoryName(category) {
  return categoryLabels[category] || 'Общее';
}

function getFilteredNotes() {
  const search = state.search.trim().toLowerCase();

  let filtered = [...state.notes];

  if (state.filter !== 'all') {
    if (state.filter === 'pinned') {
      filtered = filtered.filter((note) => note.pinned);
    } else {
      filtered = filtered.filter((note) => note.category === state.filter);
    }
  }

  if (search) {
    filtered = filtered.filter((note) => {
      const content = `${note.title} ${note.content}`.toLowerCase();
      return content.includes(search);
    });
  }

  filtered.sort((a, b) => {
    const timeA = new Date(a.updatedAt).getTime();
    const timeB = new Date(b.updatedAt).getTime();
    return state.sortDirection === 'desc' ? timeB - timeA : timeA - timeB;
  });

  return filtered;
}

function renderCounts() {
  const total = state.notes.length;
  const pinned = state.notes.filter((note) => note.pinned).length;
  const work = state.notes.filter((note) => note.category === 'work').length;
  const personal = state.notes.filter((note) => note.category === 'personal').length;
  const ideas = state.notes.filter((note) => note.category === 'ideas').length;

  document.getElementById('count-all').textContent = total;
  document.getElementById('count-pinned').textContent = pinned;
  document.getElementById('count-work').textContent = work;
  document.getElementById('count-personal').textContent = personal;
  document.getElementById('count-ideas').textContent = ideas;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pinned').textContent = pinned;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekly = state.notes.filter((note) => new Date(note.updatedAt).getTime() > weekAgo).length;
  document.getElementById('stat-week').textContent = weekly;

  const today = new Date();
  const daily = state.notes.filter((note) => {
    const updated = new Date(note.updatedAt);
    return updated.toDateString() === today.toDateString();
  }).length;
  document.getElementById('today-count').textContent = `${daily} заметок`;
}

function renderNotes() {
  const notes = getFilteredNotes();
  els.notesGrid.innerHTML = '';

  if (!notes.length) {
    els.notesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-inner">
          <h4>Ничего не найдено</h4>
          <p>Попробуйте изменить фильтр или создайте новую заметку.</p>
        </div>
      </div>
    `;
    return;
  }

  const template = document.getElementById('note-card-template');

  notes.forEach((note) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector('.note-card');
    const tag = fragment.querySelector('.note-tag');
    const title = fragment.querySelector('.note-title');
    const preview = fragment.querySelector('.note-preview');
    const date = fragment.querySelector('.note-date');
    const pinBtn = fragment.querySelector('.pin-btn');
    const editBtn = fragment.querySelector('.edit-btn');
    const deleteBtn = fragment.querySelector('.delete-btn');

    card.dataset.color = note.category;
    if (note.pinned) card.classList.add('pinned');

    tag.textContent = categoryName(note.category);
    title.textContent = note.title;
    preview.textContent = note.content;
    date.textContent = formatDate(note.updatedAt);

    pinBtn.setAttribute('aria-label', note.pinned ? 'Открепить заметку' : 'Закрепить заметку');
    pinBtn.textContent = note.pinned ? '📍' : '📌';

    pinBtn.addEventListener('click', () => togglePin(note.id));
    editBtn.addEventListener('click', () => openModal(note.id));
    deleteBtn.addEventListener('click', () => deleteNote(note.id));

    els.notesGrid.appendChild(fragment);
  });
}

function renderSectionTitle() {
  const label = state.filter === 'all' ? 'Все заметки' : state.filter === 'pinned' ? 'Избранное' : categoryLabels[state.filter];
  els.currentSectionTitle.textContent = label;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function openModal(noteId = null) {
  els.modal.classList.remove('hidden');
  els.modal.setAttribute('aria-hidden', 'false');

  if (!noteId) {
    els.modalTitle.textContent = 'Новая заметка';
    els.noteForm.reset();
    els.noteId.value = '';
    els.noteCategory.value = 'work';
    els.notePinned.checked = false;
    return;
  }

  const note = state.notes.find((item) => item.id === noteId);
  if (!note) return;

  els.modalTitle.textContent = 'Редактировать заметку';
  els.noteId.value = note.id;
  els.noteTitle.value = note.title;
  els.noteCategory.value = note.category;
  els.noteContent.value = note.content;
  els.notePinned.checked = note.pinned;
}

function closeModal() {
  els.modal.classList.add('hidden');
  els.modal.setAttribute('aria-hidden', 'true');
  els.noteForm.reset();
  els.noteId.value = '';
}

function saveNote(event) {
  event.preventDefault();

  const id = els.noteId.value;
  const payload = {
    title: els.noteTitle.value.trim(),
    content: els.noteContent.value.trim(),
    category: els.noteCategory.value,
    pinned: els.notePinned.checked,
  };

  if (!payload.title || !payload.content) return;

  if (id) {
    state.notes = state.notes.map((note) =>
      note.id === id
        ? { ...note, ...payload, updatedAt: new Date().toISOString() }
        : note
    );
  } else {
    state.notes.unshift({
      id: crypto.randomUUID(),
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  saveNotes();
  renderAll();
  closeModal();
}

function togglePin(noteId) {
  state.notes = state.notes.map((note) => {
    if (note.id !== noteId) return note;
    return { ...note, pinned: !note.pinned, updatedAt: new Date().toISOString() };
  });

  saveNotes();
  renderAll();
}

function deleteNote(noteId) {
  state.notes = state.notes.filter((note) => note.id !== noteId);
  saveNotes();
  renderAll();
}

function renderAll() {
  renderCounts();
  renderSectionTitle();
  renderNotes();
}

function bindEvents() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.filter = button.dataset.filter;
      renderNotes();
      renderSectionTitle();
    });
  });

  els.searchInput.addEventListener('input', (event) => {
    state.search = event.target.value;
    renderNotes();
  });

  els.newNoteBtn.addEventListener('click', () => openModal());
  els.sortBtn.addEventListener('click', () => {
    state.sortDirection = state.sortDirection === 'desc' ? 'asc' : 'desc';
    els.sortBtn.textContent = state.sortDirection === 'desc' ? 'Сначала новые' : 'Сначала старые';
    renderNotes();
  });

  els.noteForm.addEventListener('submit', saveNote);
  document.getElementById('close-modal-btn').addEventListener('click', closeModal);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.querySelector('[data-close="true"]').addEventListener('click', closeModal);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.modal.classList.contains('hidden')) {
      closeModal();
    }
  });
}

loadNotes();
bindEvents();
renderAll();
