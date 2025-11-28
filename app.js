// State
let notes = JSON.parse(localStorage.getItem('notes')) || [];
let currentNoteId = null;
let currentTheme = localStorage.getItem('theme') || 'light';

// DOM Elements
const listView = document.getElementById('list-view');
const editorView = document.getElementById('editor-view');
const notesListEl = document.getElementById('notes-list');
const searchInput = document.getElementById('search-input');
const createNoteBtn = document.getElementById('create-note-btn');
const backBtn = document.getElementById('back-btn');
const deleteNoteBtn = document.getElementById('delete-note-btn');
const noteTitleInput = document.getElementById('note-title');
const noteBodyInput = document.getElementById('note-body');
const lastEditedEl = document.getElementById('last-edited');

// New DOM Elements
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const pinNoteBtn = document.getElementById('pin-note-btn');
const noteTypeBtn = document.getElementById('note-type-btn');
const checklistContainer = document.getElementById('checklist-container');
const checklistItems = document.getElementById('checklist-items');
const addChecklistItemBtn = document.getElementById('add-checklist-item-btn');

// Utils
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    }).format(date);
};

// Theme Logic
const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    currentTheme = theme;
};

themeToggleBtn.addEventListener('click', () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
});

// Init Theme
applyTheme(currentTheme);

// Persistence
const saveToStorage = () => {
    localStorage.setItem('notes', JSON.stringify(notes));
};

// Note Logic
let currentNoteState = {
    type: 'text', // 'text' or 'checklist'
    isPinned: false,
    items: [] // For checklist
};

const showEditor = (noteId = null) => {
    currentNoteId = noteId;

    if (noteId) {
        const note = notes.find(n => n.id === noteId);
        if (note) {
            noteTitleInput.value = note.title;
            noteBodyInput.value = note.body || '';
            lastEditedEl.textContent = `Last edited ${formatDate(note.updatedAt)}`;

            // Load extended state
            currentNoteState = {
                type: note.type || 'text',
                isPinned: note.isPinned || false,
                items: note.items || []
            };
        }
    } else {
        // New note
        noteTitleInput.value = '';
        noteBodyInput.value = '';
        lastEditedEl.textContent = '';
        currentNoteId = generateId();

        currentNoteState = {
            type: 'text',
            isPinned: false,
            items: []
        };
    }

    updateEditorUI();

    listView.classList.remove('active-view');
    editorView.classList.add('active-view');

    if (!noteId) {
        setTimeout(() => noteTitleInput.focus(), 300);
    }
};

const updateEditorUI = () => {
    // Toggle Pin State
    pinNoteBtn.classList.toggle('active', currentNoteState.isPinned);

    // Toggle Type UI
    if (currentNoteState.type === 'checklist') {
        noteBodyInput.classList.add('hidden');
        checklistContainer.classList.remove('hidden');
        renderChecklist();
    } else {
        noteBodyInput.classList.remove('hidden');
        checklistContainer.classList.add('hidden');
    }
};

const showList = () => {
    const title = noteTitleInput.value.trim();
    const body = noteBodyInput.value.trim();
    const hasItems = currentNoteState.items.length > 0;

    if (title || body || hasItems) {
        const existingNoteIndex = notes.findIndex(n => n.id === currentNoteId);
        const now = new Date().toISOString();

        const noteData = {
            id: currentNoteId,
            title: title || 'Untitled Note',
            body: body,
            updatedAt: now,
            createdAt: existingNoteIndex >= 0 ? notes[existingNoteIndex].createdAt : now,
            // New fields
            type: currentNoteState.type,
            isPinned: currentNoteState.isPinned,
            items: currentNoteState.items
        };

        if (existingNoteIndex >= 0) {
            notes[existingNoteIndex] = noteData;
        } else {
            notes.unshift(noteData);
        }

        // Sort: Pinned first, then by date
        notes.sort((a, b) => {
            if (a.isPinned === b.isPinned) {
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            }
            return a.isPinned ? -1 : 1;
        });

        saveToStorage();
    } else if (currentNoteId) {
        const existingNoteIndex = notes.findIndex(n => n.id === currentNoteId);
        if (existingNoteIndex >= 0) {
            notes.splice(existingNoteIndex, 1);
            saveToStorage();
        }
    }

    renderNotesList();

    editorView.classList.remove('active-view');
    listView.classList.add('active-view');
    currentNoteId = null;
};

// Checklist Logic
const renderChecklist = () => {
    checklistItems.innerHTML = '';
    currentNoteState.items.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'checklist-item';
        el.innerHTML = `
            <div class="checkbox ${item.checked ? 'checked' : ''}" onclick="toggleCheck(${index})"></div>
            <input type="text" class="checklist-input ${item.checked ? 'checked' : ''}" 
                   value="${item.text}" oninput="updateCheckItem(${index}, this.value)" 
                   placeholder="List item">
            <button class="remove-item-btn" onclick="removeCheckItem(${index})">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        `;
        checklistItems.appendChild(el);
    });
};

// Expose to window for inline onclicks
window.toggleCheck = (index) => {
    currentNoteState.items[index].checked = !currentNoteState.items[index].checked;
    renderChecklist();
};

window.updateCheckItem = (index, text) => {
    currentNoteState.items[index].text = text;
};

window.removeCheckItem = (index) => {
    currentNoteState.items.splice(index, 1);
    renderChecklist();
};

addChecklistItemBtn.addEventListener('click', () => {
    currentNoteState.items.push({ text: '', checked: false });
    renderChecklist();
    // Focus last input
    setTimeout(() => {
        const inputs = checklistItems.querySelectorAll('.checklist-input');
        if (inputs.length) inputs[inputs.length - 1].focus();
    }, 50);
});

// Toggle Note Type
noteTypeBtn.addEventListener('click', () => {
    currentNoteState.type = currentNoteState.type === 'text' ? 'checklist' : 'text';

    // Convert logic (optional: split body by lines to items)
    if (currentNoteState.type === 'checklist' && currentNoteState.items.length === 0 && noteBodyInput.value) {
        const lines = noteBodyInput.value.split('\n');
        currentNoteState.items = lines.filter(l => l.trim()).map(text => ({ text, checked: false }));
    } else if (currentNoteState.type === 'text' && !noteBodyInput.value && currentNoteState.items.length > 0) {
        noteBodyInput.value = currentNoteState.items.map(i => i.text).join('\n');
    }

    updateEditorUI();
});

// Toggle Pin
pinNoteBtn.addEventListener('click', () => {
    currentNoteState.isPinned = !currentNoteState.isPinned;
    updateEditorUI();
});

// Rendering List
const renderNotesList = (filterText = '') => {
    notesListEl.innerHTML = '';

    const filteredNotes = notes.filter(note => {
        const text = filterText.toLowerCase();
        const bodyMatch = note.body && note.body.toLowerCase().includes(text);
        const itemMatch = note.items && note.items.some(i => i.text.toLowerCase().includes(text));
        return note.title.toLowerCase().includes(text) || bodyMatch || itemMatch;
    });

    if (filteredNotes.length === 0) {
        notesListEl.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary); margin-top: 3rem;">
                <p>No notes found</p>
            </div>
        `;
        return;
    }

    filteredNotes.forEach((note, index) => {
        const card = document.createElement('div');
        card.className = `note-card ${note.isPinned ? 'pinned' : ''}`;
        card.style.animationDelay = `${index * 0.05}s`;

        let previewText = note.body || 'No additional text';
        if (note.type === 'checklist') {
            const checked = note.items.filter(i => i.checked).length;
            previewText = `${checked}/${note.items.length} items completed`;
        }

        const pinIcon = note.isPinned ? `
            <div class="pin-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M16 12V6a4 4 0 0 0-8 0v6l-2 2v1h5v6h2v-6h5v-1l-2-2z"></path></svg>
            </div>
        ` : '';

        card.innerHTML = `
            ${pinIcon}
            <h3>${note.title}</h3>
            <p>${previewText}</p>
            <span class="note-date">${formatDate(note.updatedAt)}</span>
        `;
        card.addEventListener('click', () => showEditor(note.id));
        notesListEl.appendChild(card);
    });
};

// Event Listeners
createNoteBtn.addEventListener('click', () => showEditor());

backBtn.addEventListener('click', showList);

deleteNoteBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this note?')) {
        if (currentNoteId) {
            const index = notes.findIndex(n => n.id === currentNoteId);
            if (index >= 0) {
                notes.splice(index, 1);
                saveToStorage();
            }
        }
        noteTitleInput.value = '';
        noteBodyInput.value = '';
        currentNoteState.items = [];
        showList();
    }
});

searchInput.addEventListener('input', (e) => {
    renderNotesList(e.target.value);
});

// Initial Render
renderNotesList();
