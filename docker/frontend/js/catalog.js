const OMDB_KEY = '3190cfbd';
let allMedia = [];
let activeFilter = 'all';
let searchTimeout = null;

async function loadMedia() {
  try {
    const res = await api.getMedia();
    allMedia = res.data;
    renderMedia();
  } catch (err) {
    console.error(err);
  }
}

function renderMedia() {
  const grid = document.getElementById('media-grid');
  const empty = document.getElementById('empty-state');
  let items = allMedia;
  if (activeFilter === 'to_watch') items = items.filter(i => i.status === 'to_watch');
  else if (activeFilter === 'watched') items = items.filter(i => i.status === 'watched');
  else if (activeFilter === 'film') items = items.filter(i => i.type === 'film');
  else if (activeFilter === 'series') items = items.filter(i => i.type === 'series');
  grid.innerHTML = '';
  if (!items.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  items.forEach(item => grid.appendChild(createCard(item)));
}

function createCard(item) {
  const card = document.createElement('div');
  card.className = 'media-card';

  const posterBlock = item.poster_url
    ? `<div class="card-poster"><img src="${escHtml(item.poster_url)}" alt="${escHtml(item.title)}" loading="lazy"/></div>`
    : `<div class="card-poster card-poster--empty"><span>🎬</span></div>`;

  const reviewBlock = item.status === 'watched' ? `
    <div class="user-review" id="review-${item.id}">
      <div class="review-label">Моя оцінка</div>
      <div class="review-stars">
        ${[1,2,3,4,5,6,7,8,9,10].map(n => `
          <span class="star ${(item.user_rating || 0) >= n ? 'active' : ''}"
                data-id="${item.id}" data-val="${n}">★</span>
        `).join('')}
        <span class="user-rating-num">${item.user_rating ? `${item.user_rating}/10` : 'не оцінено'}</span>
      </div>
      <div class="review-comment-wrap">
        <textarea class="review-textarea" id="comment-${item.id}"
          placeholder="Мій коментар..."
        >${item.user_comment || ''}</textarea>
        <button class="review-save-btn hidden" id="save-btn-${item.id}" onclick="saveReview(${item.id})">Зберегти</button>
      </div>
    </div>
  ` : '';

  card.innerHTML = `
    <div class="card-inner">
      ${posterBlock}
      <div class="card-body">
        <div class="card-header">
          <div class="card-title">${escHtml(item.title)}</div>
          <div class="card-actions">
            <button class="card-btn edit" onclick="openEdit(${item.id})">✏️</button>
            <button class="card-btn delete" onclick="confirmDelete(${item.id}, '${escHtml(item.title)}')">🗑️</button>
          </div>
        </div>
        <div class="card-badges">
          <span class="badge badge-${item.type}">${item.type === 'film' ? '🎬 Фільм' : '📺 Серіал'}</span>
          <span class="badge badge-${item.status}">${item.status === 'watched' ? '✅ Переглянуто' : '🕐 До перегляду'}</span>
        </div>
        <div class="card-meta">
          ${item.genre ? `<span>${escHtml(item.genre)}</span>` : ''}
          ${item.year ? `<span>${item.year}</span>` : ''}
          ${item.rating ? `<span class="card-rating">⭐ IMDB: ${item.rating}/10</span>` : ''}
        </div>
        ${item.notes ? `<div class="card-plot">${escHtml(item.notes)}</div>` : ''}
        ${reviewBlock}
      </div>
    </div>
  `;

  // Зірочки — клік
  card.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', async () => {
      const id = parseInt(star.dataset.id);
      const val = parseInt(star.dataset.val);
      await api.quickReview(id, { user_rating: val });
      const idx = allMedia.findIndex(i => i.id === id);
      if (idx !== -1) allMedia[idx].user_rating = val;
      const block = document.getElementById(`review-${id}`);
      block.querySelectorAll('.star').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.val) <= val);
      });
      block.querySelector('.user-rating-num').textContent = `${val}/10`;
    });
  });

  // Показуємо кнопку "Зберегти" тільки при фокусі на textarea
  const textarea = card.querySelector(`#comment-${item.id}`);
  const saveBtn = card.querySelector(`#save-btn-${item.id}`);
  if (textarea && saveBtn) {
    textarea.addEventListener('focus', () => saveBtn.classList.remove('hidden'));
    textarea.addEventListener('blur', () => {
      // Затримка щоб клік на кнопку встиг спрацювати
      setTimeout(() => saveBtn.classList.add('hidden'), 200);
    });
  }

  return card;
}

async function saveReview(id) {
  const comment = document.getElementById(`comment-${id}`).value;
  await api.quickReview(id, { user_comment: comment });
  const idx = allMedia.findIndex(i => i.id === id);
  if (idx !== -1) allMedia[idx].user_comment = comment;
  const btn = document.getElementById(`save-btn-${id}`);
  btn.textContent = '✓ Збережено';
  setTimeout(() => { btn.textContent = 'Зберегти'; btn.classList.add('hidden'); }, 1500);
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// --- OMDB ---
async function searchOMDB(query) {
  if (!query || query.length < 2) return [];
  try {
    const res = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${OMDB_KEY}`);
    const data = await res.json();
    if (data.Response === 'True') return data.Search.slice(0, 6);
    return [];
  } catch { return []; }
}

async function fetchOMDBDetails(imdbId) {
  try {
    const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`);
    return await res.json();
  } catch { return null; }
}

function showSuggestions(results) {
  let dropdown = document.getElementById('omdb-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'omdb-dropdown';
    dropdown.className = 'omdb-dropdown';
    document.getElementById('f-title').parentNode.appendChild(dropdown);
  }
  if (!results.length) { dropdown.innerHTML = ''; dropdown.classList.add('hidden'); return; }
  dropdown.innerHTML = results.map(r => `
    <div class="omdb-item" data-id="${r.imdbID}">
      <img src="${r.Poster !== 'N/A' ? r.Poster : ''}" onerror="this.style.display='none'" class="omdb-poster"/>
      <div class="omdb-info">
        <div class="omdb-title">${escHtml(r.Title)}</div>
        <div class="omdb-meta">${r.Year} · ${r.Type === 'movie' ? '🎬 Фільм' : '📺 Серіал'}</div>
      </div>
    </div>
  `).join('');
  dropdown.classList.remove('hidden');

  dropdown.querySelectorAll('.omdb-item').forEach(el => {
    el.addEventListener('click', async () => {
      const imdbId = el.dataset.id;
      dropdown.innerHTML = '<div class="omdb-loading">Завантаження...</div>';
      const details = await fetchOMDBDetails(imdbId);
      if (details && details.Response === 'True') {
        document.getElementById('f-title').value = details.Title;
        document.getElementById('f-type').value = details.Type === 'movie' ? 'film' : 'series';
        document.getElementById('f-year').value = details.Year?.slice(0,4) || '';
        if (details.Genre && details.Genre !== 'N/A') {
          document.getElementById('f-genre').value = details.Genre.split(',')[0].trim();
        }
        if (details.imdbRating && details.imdbRating !== 'N/A') {
          const r = Math.round(parseFloat(details.imdbRating));
          document.getElementById('f-rating').value = r;
          document.getElementById('rating-val').textContent = `${r}/10`;
        }
        if (details.Plot && details.Plot !== 'N/A') {
          document.getElementById('f-notes').value = details.Plot;
        }
        // Зберігаємо постер
        if (details.Poster && details.Poster !== 'N/A') {
          document.getElementById('f-poster').value = details.Poster;
          document.getElementById('poster-preview').src = details.Poster;
          document.getElementById('poster-preview').classList.remove('hidden');
        } else {
          document.getElementById('f-poster').value = '';
          document.getElementById('poster-preview').classList.add('hidden');
        }
      }
      dropdown.innerHTML = '';
      dropdown.classList.add('hidden');
    });
  });
}

function hideSuggestions() {
  const dropdown = document.getElementById('omdb-dropdown');
  if (dropdown) { dropdown.innerHTML = ''; dropdown.classList.add('hidden'); }
}

// --- MODAL ---
function openAdd() {
  document.getElementById('modal-title').textContent = 'Додати';
  document.getElementById('media-id').value = '';
  document.getElementById('media-form').reset();
  document.getElementById('rating-val').textContent = '—';
  document.getElementById('f-poster').value = '';
  document.getElementById('poster-preview').classList.add('hidden');
  document.getElementById('form-error').classList.add('hidden');
  hideSuggestions();
  document.getElementById('modal').classList.remove('hidden');
}

function openEdit(id) {
  const item = allMedia.find(i => i.id === id);
  if (!item) return;
  document.getElementById('modal-title').textContent = 'Редагувати';
  document.getElementById('media-id').value = item.id;
  document.getElementById('f-title').value = item.title;
  document.getElementById('f-type').value = item.type;
  document.getElementById('f-status').value = item.status;
  document.getElementById('f-genre').value = item.genre || '';
  document.getElementById('f-year').value = item.year || '';
  document.getElementById('f-rating').value = item.rating || 0;
  document.getElementById('rating-val').textContent = item.rating ? `${item.rating}/10` : '—';
  document.getElementById('f-notes').value = item.notes || '';
  document.getElementById('f-poster').value = item.poster_url || '';
  const preview = document.getElementById('poster-preview');
  if (item.poster_url) {
    preview.src = item.poster_url;
    preview.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
  }
  document.getElementById('form-error').classList.add('hidden');
  hideSuggestions();
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  hideSuggestions();
  document.getElementById('modal').classList.add('hidden');
}

let deleteTarget = null;
function confirmDelete(id, title) {
  deleteTarget = id;
  document.getElementById('confirm-text').textContent = `Видалити "${title}"?`;
  document.getElementById('confirm-modal').classList.remove('hidden');
}

async function initCatalog() {
  document.getElementById('btn-add').addEventListener('click', openAdd);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', closeModal);

  document.getElementById('confirm-cancel').addEventListener('click', () => {
    document.getElementById('confirm-modal').classList.add('hidden');
  });
  document.getElementById('confirm-overlay').addEventListener('click', () => {
    document.getElementById('confirm-modal').classList.add('hidden');
  });
  document.getElementById('confirm-ok').addEventListener('click', async () => {
    if (!deleteTarget) return;
    await api.deleteMedia(deleteTarget);
    document.getElementById('confirm-modal').classList.add('hidden');
    deleteTarget = null;
    await loadMedia();
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderMedia();
    });
  });

  document.getElementById('f-rating').addEventListener('input', (e) => {
    const v = parseInt(e.target.value);
    document.getElementById('rating-val').textContent = v > 0 ? `${v}/10` : '—';
  });

  document.getElementById('f-title').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const val = e.target.value.trim();
    if (val.length < 2) { hideSuggestions(); return; }
    searchTimeout = setTimeout(async () => {
      const results = await searchOMDB(val);
      showSuggestions(results);
    }, 400);
  });

  document.getElementById('f-title').addEventListener('blur', () => {
    setTimeout(hideSuggestions, 200);
  });

  document.getElementById('media-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('form-error');
    errEl.classList.add('hidden');
    const id = document.getElementById('media-id').value;
    const rating = parseInt(document.getElementById('f-rating').value);
    const payload = {
      title:      document.getElementById('f-title').value,
      type:       document.getElementById('f-type').value,
      status:     document.getElementById('f-status').value,
      genre:      document.getElementById('f-genre').value || null,
      year:       parseInt(document.getElementById('f-year').value) || null,
      rating:     rating > 0 ? rating : null,
      notes:      document.getElementById('f-notes').value || null,
      poster_url: document.getElementById('f-poster').value || null,
    };
    try {
      if (id) await api.updateMedia(id, payload);
      else await api.createMedia(payload);
      closeModal();
      await loadMedia();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });
}