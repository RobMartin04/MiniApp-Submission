document.addEventListener('DOMContentLoaded', () => {
  // Fetch and display existing flashcard sets
  async function loadSets() {
    const setsList = document.getElementById('sets-list');
    const setDetails = document.getElementById('set-details');
    if (!setsList) return;
    setsList.innerHTML = '<div class="text-muted">Loading...</div>';
    setDetails.innerHTML = '';
    try {
      const res = await fetch('/api/flashcard-sets');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch sets');
      if (!data.items.length) {
        setsList.innerHTML = '<div class="text-muted">No sets found.</div>';
        return;
      }
      setsList.innerHTML = '';
      data.items.forEach(set => {
        // Normalize id from possible shapes: id, _id.$oid, _id
        const id = set.id || set._id?.$oid || set._id;
        const item = document.createElement('button');
        item.className = 'list-group-item list-group-item-action';
        item.textContent = set.title || '(Untitled)';
        item.onclick = () => showSetDetails(id, set.title, set.description);
        setsList.appendChild(item);
      });
    } catch (err) {
      setsList.innerHTML = '<div class="text-danger">Error loading sets</div>';
    }
  }

  // Fetch and show details for a single set
  async function showSetDetails(id, title, description) {
    const setDetails = document.getElementById('set-details');
    setDetails.innerHTML = '<div class="text-muted">Loading set...</div>';
    try {
      const res = await fetch(`/api/flashcard-sets/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch set');
      const cards = Array.isArray(data.cards) ? data.cards : [];
      setDetails.innerHTML = `<div class="card mb-3">
        <div class="card-body">
          <div class="d-flex align-items-start justify-content-between">
            <div>
              <h5 class="card-title mb-1">${title}</h5>
              <p class="card-text">${description || ''}</p>
            </div>
            <div class="ms-3">
              <button class="btn btn-sm btn-outline-secondary me-2" id="edit-set">Edit</button>
              <button class="btn btn-sm btn-outline-danger" id="delete-set">Delete</button>
            </div>
          </div>
          <h6 class="mt-3">Cards:</h6>
          <ul class="list-group mb-2">
            ${cards.map(card => `<li class="list-group-item"><strong>${card.term}</strong>: ${card.definition}</li>`).join('')}
          </ul>
        </div>
      </div>`;

      // Wire up Edit: open inline editor in the details panel
      document.getElementById('edit-set')?.addEventListener('click', (e) => {
        e.preventDefault();
        const editor = document.createElement('div');
        editor.className = 'card';
        editor.innerHTML = `
          <div class="card-body">
            <h5 class="card-title">Edit Set</h5>
            <div class="mb-3">
              <label class="form-label" for="edit-title">Title</label>
              <input id="edit-title" class="form-control" type="text" value="${title || ''}">
            </div>
            <div class="mb-3">
              <label class="form-label" for="edit-desc">Description</label>
              <textarea id="edit-desc" class="form-control" rows="3">${description || ''}</textarea>
            </div>
            <div class="mb-2 d-flex align-items-center justify-content-between">
              <h6 class="m-0">Cards</h6>
              <button id="edit-add-card" class="btn btn-sm btn-outline-primary" type="button">Add Card</button>
            </div>
            <div id="edit-cards" class="d-grid gap-2"></div>
            <div class="mt-3">
              <button id="edit-save" class="btn btn-primary me-2" type="button">Save Changes</button>
              <button id="edit-cancel" class="btn btn-outline-secondary" type="button">Cancel</button>
            </div>
          </div>`;

        const detailsHost = document.getElementById('set-details');
        detailsHost.innerHTML = '';
        detailsHost.appendChild(editor);

        const cardsHost = editor.querySelector('#edit-cards');
        function addCardRow(term = '', definition = '') {
          const wrapper = document.createElement('div');
          wrapper.className = 'border rounded p-2';
          wrapper.innerHTML = `
            <div class="row g-2 align-items-start">
              <div class="col-md-5">
                <label class="form-label small">Term</label>
                <input type="text" class="form-control edit-term" value="${term}">
              </div>
              <div class="col-md-6">
                <label class="form-label small">Definition</label>
                <textarea class="form-control edit-definition" rows="2">${definition}</textarea>
              </div>
              <div class="col-md-1 d-flex align-items-end">
                <button type="button" class="btn btn-sm btn-outline-danger edit-remove">✕</button>
              </div>
            </div>`;
          wrapper.querySelector('.edit-remove').addEventListener('click', () => wrapper.remove());
          cardsHost.appendChild(wrapper);
        }

        // Seed rows
        if (cards.length === 0) addCardRow();
        cards.forEach(c => addCardRow(c.term || '', c.definition || ''));

        // Add card button
        editor.querySelector('#edit-add-card').addEventListener('click', () => addCardRow());

        // Cancel: reload view mode
        editor.querySelector('#edit-cancel').addEventListener('click', () => showSetDetails(id, title, description));

        // Save: PATCH
        editor.querySelector('#edit-save').addEventListener('click', async () => {
          const newTitle = editor.querySelector('#edit-title').value.trim();
          const newDesc = editor.querySelector('#edit-desc').value;
          const newCards = [...editor.querySelectorAll('#edit-cards .border')].map(row => ({
            term: row.querySelector('.edit-term')?.value || '',
            definition: row.querySelector('.edit-definition')?.value || '',
          }));
          try {
            const res = await fetch(`/api/flashcard-sets/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: newTitle, description: newDesc, cards: newCards })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to update');
            await loadSets();
            await showSetDetails(id, newTitle, newDesc);
          } catch (err) {
            alert('Error updating set');
          }
        });
      });

      // Wire up Delete
      document.getElementById('delete-set')?.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!confirm('Delete this set? This cannot be undone.')) return;
        try {
          const res = await fetch(`/api/flashcard-sets/${id}`, { method: 'DELETE' });
          if (!res.ok && res.status !== 204) throw new Error('Failed');
          // Refresh list and clear details
          await loadSets();
          document.getElementById('set-details').innerHTML = '';
        } catch (err) {
          alert('Error deleting set');
        }
      });
    } catch (err) {
      setDetails.innerHTML = '<div class="text-danger">Error loading set details</div>';
    }
  }

  // Initial load
  loadSets();

  console.log('card.js loaded');
  const addBtn = document.getElementById('add-flashcard');
  const container = document.getElementById('cards-container');
  const template = document.getElementById('card-template');

  if (!addBtn || !container || !template) return;

  let nextId = 1;

  function addCard(ev) {
    // Prevent form submission if button is inside a form
    if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();

    const idNum = nextId++;
    const frag = template.content.cloneNode(true);

    // Set title
    const title = frag.querySelector('.card-title');
    if (title) title.textContent = `Card ${idNum}`;

    // Wire up Term
    const termInput = frag.querySelector('.card-term');
    const termLabel = frag.querySelector('label[for="card-term-__ID__"]');
    if (termInput) {
      const termId = `card-term-${idNum}`;
      termInput.id = termId;
      termInput.name = `cards[${idNum - 1}][term]`;
      if (termLabel) termLabel.setAttribute('for', termId);
    }

    // Wire up Definition
    const defInput = frag.querySelector('.card-definition');
    const defLabel = frag.querySelector('label[for="card-def-__ID__"]');
    if (defInput) {
      const defId = `card-def-${idNum}`;
      defInput.id = defId;
      defInput.name = `cards[${idNum - 1}][definition]`;
      if (defLabel) defLabel.setAttribute('for', defId);
    }

    container.appendChild(frag);
  }

  // Bind once to avoid duplicate cards if script is loaded twice
  if (!addBtn.dataset.bound) {
    addBtn.addEventListener('click', addCard);
    addBtn.dataset.bound = '1';
  }

  // Gather inputs and POST to the API
  const saveSetBtn = document.getElementById('save-set');
  if (saveSetBtn && !saveSetBtn.dataset.bound) {
    saveSetBtn.addEventListener('click', async (ev) => {
      // Prevent native form submit and duplicate propagation
      if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
      ev.stopPropagation?.();

      const title = document.getElementById('flashcard-title')?.value || '';
      const description = document.getElementById('flashcard-description')?.value || '';
      const cards = [...document.querySelectorAll('#cards-container section')].map(section => ({
        term: section.querySelector('.card-term')?.value || '',
        definition: section.querySelector('.card-definition')?.value || ''
      }));
      const saveBtn = ev.currentTarget;
      const editingId = saveBtn?.dataset?.editingId;

      // Disable to avoid double clicks
      saveBtn.disabled = true;

      try {
        const url = editingId ? `/api/flashcard-sets/${editingId}` : '/api/flashcard-sets';
        const method = editingId ? 'PATCH' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, cards })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save');
        alert(editingId ? 'Updated!' : `Saved! id: ${data.id}`);
        // Clear editing state and reload list
        if (saveBtn) delete saveBtn.dataset.editingId;
        await loadSets();
      } catch (err) {
        console.error(err);
        alert('Error saving set');
      } finally {
        saveBtn.disabled = false;
      }
    });
    saveSetBtn.dataset.bound = '1';
  }
});