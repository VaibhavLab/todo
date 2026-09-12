const STORAGE_KEY = 'todo-pro.tasks.v1';
const THEME_KEY = 'todo-pro.theme';

const state = {
  tasks: loadTasks(),
  filter: 'all',
  search: '',
  sort: 'created-desc',
  editingId: null,
};

const el = {
  form: document.getElementById('todoForm'),
  input: document.getElementById('todoInput'),
  priority: document.getElementById('priorityInput'),
  dueDate: document.getElementById('dueDateInput'),
  tags: document.getElementById('tagsInput'),
  list: document.getElementById('todoList'),
  template: document.getElementById('todoTemplate'),
  empty: document.getElementById('emptyState'),
  filters: document.getElementById('filters'),
  search: document.getElementById('searchInput'),
  sort: document.getElementById('sortSelect'),
  clearCompleted: document.getElementById('clearCompletedBtn'),
  totalCount: document.getElementById('totalCount'),
  activeCount: document.getElementById('activeCount'),
  completedCount: document.getElementById('completedCount'),
  overdueCount: document.getElementById('overdueCount'),
  themeToggle: document.getElementById('themeToggle'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  editDialog: document.getElementById('editDialog'),
  editForm: document.getElementById('editForm'),
  editText: document.getElementById('editTextInput'),
  editPriority: document.getElementById('editPriorityInput'),
  editDueDate: document.getElementById('editDueDateInput'),
  editTags: document.getElementById('editTagsInput'),
  closeDialog: document.getElementById('closeDialogBtn'),
  cancelEdit: document.getElementById('cancelEditBtn'),
  toast: document.getElementById('toast'),
};

function loadTasks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(normalizeTask) : [];
  } catch {
    return [];
  }
}

function normalizeTask(task) {
  return {
    id: String(task.id || crypto.randomUUID()),
    text: String(task.text || '').trim(),
    completed: Boolean(task.completed),
    priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
    dueDate: typeof task.dueDate === 'string' ? task.dueDate : '',
    tags: Array.isArray(task.tags) ? task.tags.map(String).filter(Boolean).slice(0, 10) : [],
    createdAt: Number(task.createdAt) || Date.now(),
    updatedAt: Number(task.updatedAt) || Date.now(),
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function parseTags(value) {
  return [...new Set(value.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 10);
}

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${task.dueDate}T00:00:00`);
  return due < today;
}

function isToday(task) {
  if (!task.dueDate) return false;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return task.dueDate === `${yyyy}-${mm}-${dd}`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${dateString}T00:00:00`));
}

function getVisibleTasks() {
  const query = state.search.trim().toLowerCase();
  let tasks = state.tasks.filter(task => {
    const matchesSearch = !query || task.text.toLowerCase().includes(query) || task.tags.some(tag => tag.includes(query));
    if (!matchesSearch) return false;

    if (state.filter === 'active') return !task.completed;
    if (state.filter === 'completed') return task.completed;
    if (state.filter === 'today') return isToday(task);
    if (state.filter === 'overdue') return isOverdue(task);
    return true;
  });

  const priorityRank = { high: 3, medium: 2, low: 1 };
  tasks = [...tasks].sort((a, b) => {
    switch (state.sort) {
      case 'created-asc': return a.createdAt - b.createdAt;
      case 'priority': return priorityRank[b.priority] - priorityRank[a.priority] || b.createdAt - a.createdAt;
      case 'due-date': {
        if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      default: return b.createdAt - a.createdAt;
    }
  });

  return tasks;
}

function render() {
  const visible = getVisibleTasks();
  el.list.replaceChildren();

  for (const task of visible) {
    const node = el.template.content.firstElementChild.cloneNode(true);
    node.dataset.id = task.id;
    node.classList.toggle('completed', task.completed);

    node.querySelector('.todo-title').textContent = task.text;

    const badge = node.querySelector('.priority-badge');
    badge.textContent = task.priority;
    badge.classList.add(task.priority);

    const meta = node.querySelector('.todo-meta');
    if (task.dueDate) {
      const due = document.createElement('span');
      due.className = `meta-chip${isOverdue(task) ? ' overdue' : ''}`;
      due.textContent = `${isOverdue(task) ? 'Overdue · ' : 'Due · '}${formatDate(task.dueDate)}`;
      meta.append(due);
    }

    task.tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'meta-chip';
      chip.textContent = `#${tag}`;
      meta.append(chip);
    });

    node.querySelector('.check-button').addEventListener('click', () => toggleTask(task.id));
    node.querySelector('.delete-button').addEventListener('click', () => deleteTask(task.id));
    node.querySelector('.edit-button').addEventListener('click', () => openEdit(task.id));

    el.list.append(node);
  }

  el.empty.hidden = visible.length > 0;
  updateStats();
}

function updateStats() {
  const completed = state.tasks.filter(task => task.completed).length;
  const overdue = state.tasks.filter(isOverdue).length;
  el.totalCount.textContent = state.tasks.length;
  el.activeCount.textContent = state.tasks.length - completed;
  el.completedCount.textContent = completed;
  el.overdueCount.textContent = overdue;
  el.clearCompleted.disabled = completed === 0;
}

function addTask(event) {
  event.preventDefault();
  const text = el.input.value.trim();
  if (!text) return;

  state.tasks.push({
    id: crypto.randomUUID(),
    text,
    completed: false,
    priority: el.priority.value,
    dueDate: el.dueDate.value,
    tags: parseTags(el.tags.value),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  persist();
  el.form.reset();
  el.priority.value = 'medium';
  render();
  showToast('Task added');
  el.input.focus();
}

function toggleTask(id) {
  const task = state.tasks.find(item => item.id === id);
  if (!task) return;
  task.completed = !task.completed;
  task.updatedAt = Date.now();
  persist();
  render();
  showToast(task.completed ? 'Task completed' : 'Task reopened');
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(task => task.id !== id);
  persist();
  render();
  showToast('Task deleted');
}

function openEdit(id) {
  const task = state.tasks.find(item => item.id === id);
  if (!task) return;
  state.editingId = id;
  el.editText.value = task.text;
  el.editPriority.value = task.priority;
  el.editDueDate.value = task.dueDate;
  el.editTags.value = task.tags.join(', ');
  el.editDialog.showModal();
  requestAnimationFrame(() => el.editText.focus());
}

function saveEdit(event) {
  event.preventDefault();
  const task = state.tasks.find(item => item.id === state.editingId);
  if (!task) return;

  const text = el.editText.value.trim();
  if (!text) return;

  Object.assign(task, {
    text,
    priority: el.editPriority.value,
    dueDate: el.editDueDate.value,
    tags: parseTags(el.editTags.value),
    updatedAt: Date.now(),
  });

  persist();
  el.editDialog.close();
  state.editingId = null;
  render();
  showToast('Task updated');
}

function clearCompleted() {
  const count = state.tasks.filter(task => task.completed).length;
  if (!count) return;
  state.tasks = state.tasks.filter(task => !task.completed);
  persist();
  render();
  showToast(`${count} completed ${count === 1 ? 'task' : 'tasks'} removed`);
}

function exportTasks() {
  const payload = JSON.stringify({
    app: 'Todo Pro',
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks: state.tasks,
  }, null, 2);

  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `todo-pro-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast('Backup exported');
}

async function importTasks(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const data = JSON.parse(await file.text());
    const incoming = Array.isArray(data) ? data : data.tasks;
    if (!Array.isArray(incoming)) throw new Error('Invalid backup');

    const normalized = incoming.map(normalizeTask).filter(task => task.text);
    const byId = new Map(state.tasks.map(task => [task.id, task]));
    normalized.forEach(task => byId.set(task.id, task));
    state.tasks = [...byId.values()];
    persist();
    render();
    showToast(`${normalized.length} tasks imported`);
  } catch {
    showToast('Could not import that file');
  } finally {
    event.target.value = '';
  }
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  el.themeToggle.textContent = theme === 'dark' ? '☀' : '◐';
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const preferred = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(saved || preferred);
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  el.toast.textContent = message;
  el.toast.classList.add('show');
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1800);
}

el.form.addEventListener('submit', addTask);
el.editForm.addEventListener('submit', saveEdit);
el.clearCompleted.addEventListener('click', clearCompleted);
el.exportBtn.addEventListener('click', exportTasks);
el.importInput.addEventListener('change', importTasks);
el.search.addEventListener('input', event => { state.search = event.target.value; render(); });
el.sort.addEventListener('change', event => { state.sort = event.target.value; render(); });
el.filters.addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  state.filter = button.dataset.filter;
  el.filters.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
  render();
});
el.themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
el.closeDialog.addEventListener('click', () => el.editDialog.close());
el.cancelEdit.addEventListener('click', () => el.editDialog.close());
el.editDialog.addEventListener('close', () => { state.editingId = null; });

document.addEventListener('keydown', event => {
  const target = event.target;
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

  if (!typing && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    el.input.focus();
  }

  if (!typing && event.key === '/') {
    event.preventDefault();
    el.search.focus();
  }
});

initTheme();
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
