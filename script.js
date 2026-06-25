const SHEET_ID = '1edQluuSI99deIJtjZO4wJP9c36E74tH3VAQv5pNCChM';
const SHEET_GID = '';

let songs = [];
let tags = [];
let activeTag = null;
let query = '';
let sheetTimeout = null;

const palette = [
  ['#ff7aa2', '#fff0f5'],
  ['#ff8fb1', '#fff3f7'],
  ['#f48fb1', '#fff1f6'],
  ['#e879a3', '#fff5f8'],
  ['#ff9ebc', '#fff0f4'],
  ['#d96b9f', '#fff4f8'],
  ['#f7a8c4', '#fff6f9'],
  ['#ff85aa', '#fff1f5'],
  ['#e89ab3', '#fff5f7'],
  ['#f06f9f', '#fff2f6'],
  ['#c96b8f', '#fff4f8'],
  ['#ffb3c7', '#fff7fa'],
  ['#e76f9e', '#fff2f7'],
  ['#f2a1b9', '#fff6f8'],
  ['#ff6f9f', '#fff1f5']
];

function cell(row, i) {
  const c = row && row.c ? row.c[i] : null;
  return c ? String(c.f || c.v || '').trim() : '';
}

function parseTags(text) {
  return String(text || '')
    .replace(/[｜|／\/;；、，\n\r]/g, ',')
    .split(',')
    .map(t => t.trim())
    .filter(t => t && t !== '-' && t !== '—' && t !== '標籤');
}

function normalizeSettingKey(value) {
  return String(value || '')
    .replace(/[：:]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function addSetting(settings, key, value) {
  const normalizedKey = normalizeSettingKey(key);
  const normalizedValue = String(value || '').trim();

  if (!normalizedKey || !normalizedValue) return;

  if (normalizedKey.includes('網站標題')) settings['網站標題'] = normalizedValue;
  if (normalizedKey.includes('網站小標題')) settings['網站小標題'] = normalizedValue;
  if (normalizedKey.includes('抽歌視窗標題') || normalizedKey.includes('彈窗標題')) settings['抽歌視窗標題'] = normalizedValue;
  if (normalizedKey.includes('關閉按鈕文字') || normalizedKey.includes('關閉按鈕')) settings['關閉按鈕文字'] = normalizedValue;
}

function isSettingKey(text) {
  const key = normalizeSettingKey(text);
  return (
    key.includes('網站標題') ||
    key.includes('網站小標題') ||
    key.includes('抽歌視窗標題') ||
    key.includes('彈窗標題') ||
    key.includes('關閉按鈕文字') ||
    key.includes('關閉按鈕')
  );
}

function applySiteSettings(rows) {
  const settings = {};

  rows.forEach(function (row) {
    const hKey = cell(row, 7);
    const iValue = cell(row, 8);

    addSetting(settings, hKey, iValue);

    for (let i = 0; i < 20; i++) {
      const current = cell(row, i);
      const next = cell(row, i + 1);

      addSetting(settings, current, next);

      const inlineMatch = current.match(/^(網站標題|網站小標題|抽歌視窗標題|彈窗標題|關閉按鈕文字|關閉按鈕)\s*[：:]\s*(.+)$/);
      if (inlineMatch) {
        addSetting(settings, inlineMatch[1], inlineMatch[2]);
      }
    }
  });

  const title = settings['網站標題'] || '';
  const subtitle = settings['網站小標題'] || '';
  const modalTitle = settings['抽歌視窗標題'] || '';
  const closeText = settings['關閉按鈕文字'] || '';

  const siteTitle = document.getElementById('siteTitle');
  const siteSubtitle = document.getElementById('siteSubtitle');
  const modalTitleEl = document.getElementById('modalTitle');
  const closeModal = document.getElementById('closeModal');

  if (siteTitle) siteTitle.textContent = title;
  if (siteSubtitle) siteSubtitle.textContent = subtitle;
  if (modalTitleEl && modalTitle) modalTitleEl.textContent = modalTitle;
  if (closeModal && closeText) closeModal.textContent = closeText;

  document.title = title || 'Loading...';
}

function buildSheetUrl(callbackName) {
  const gidPart = SHEET_GID ? 'gid=' + encodeURIComponent(SHEET_GID) + '&' : '';

  return (
    'https://docs.google.com/spreadsheets/d/' +
    SHEET_ID +
    '/gviz/tq?' +
    gidPart +
    'headers=0&tqx=out:json;responseHandler:' +
    callbackName +
    '&t=' +
    Date.now()
  );
}

function loadSheet() {
  const status = document.getElementById('status');

  if (status) {
    status.textContent = '讀取中…';
  }

  const oldScript = document.getElementById('sheetJsonp');

  if (oldScript) {
    oldScript.remove();
  }

  const callbackName = 'playlistSheetCallback_' + Date.now();
  const url = buildSheetUrl(callbackName);

  window[callbackName] = function (response) {
    clearTimeout(sheetTimeout);

    try {
      if (response && response.status && response.status !== 'ok') {
        showSheetError('試算表讀取失敗，請確認 Google 試算表權限是「知道連結的任何人可檢視」。');
        return;
      }

      const rows =
        response && response.table && response.table.rows
          ? response.table.rows
          : [];

      applySiteSettings(rows);

      const loadedSongs = [];
      const masterTags = [];

      rows.forEach(function (row) {
        const title = cell(row, 0);
        const artist = cell(row, 1);
        const category = cell(row, 2);
        const link = cell(row, 3);
        const masterTagCell = cell(row, 5);

        parseTags(masterTagCell).forEach(function (t) {
          masterTags.push(t);
        });

        const looksLikeHeader = ['歌名', '歌曲', '曲名', 'title'].includes(title.toLowerCase());

        if (title && !looksLikeHeader && !isSettingKey(title)) {
          loadedSongs.push({
            title: title,
            artist: artist || '未填歌手',
            category: category || '未分類',
            link: /^https?:\/\//i.test(link) ? link : ''
          });
        }
      });

      songs = loadedSongs;

      if (masterTags.length) {
        tags = Array.from(new Set(masterTags));
      } else {
        const fromSongs = [];

        songs.forEach(function (s) {
          parseTags(s.category).forEach(function (t) {
            fromSongs.push(t);
          });
        });

        tags = Array.from(new Set(fromSongs));
      }

      if (status) {
        status.textContent = '';
      }

      renderTags();
      renderSongs();
    } catch (err) {
      console.error(err);
      showSheetError('試算表格式解析失敗，請確認 A欄歌名、B欄歌手、C欄分類、F欄標籤，H欄/I欄可放網站設定。');
    } finally {
      delete window[callbackName];

      const s = document.getElementById('sheetJsonp');

      if (s) {
        s.remove();
      }
    }
  };

  const script = document.createElement('script');
  script.id = 'sheetJsonp';
  script.src = url;

  script.onerror = function () {
    clearTimeout(sheetTimeout);
    showSheetError('讀取不到試算表，請確認共用權限是「知道連結的任何人可檢視」。');
    delete window[callbackName];
  };

  document.body.appendChild(script);

  sheetTimeout = setTimeout(function () {
    showSheetError('讀取試算表逾時，請重新整理頁面或確認試算表權限。');
    delete window[callbackName];

    const s = document.getElementById('sheetJsonp');

    if (s) {
      s.remove();
    }
  }, 12000);
}

function showSheetError(message) {
  songs = [];
  tags = [];

  const status = document.getElementById('status');

  if (status) {
    status.textContent = message;
  }

  renderTags();
  renderSongs();
}

function renderTags() {
  const box = document.getElementById('tags');

  if (!box) return;

  box.innerHTML = '';

  tags.forEach(function (t, i) {
    const colors = palette[i % palette.length];

    const b = document.createElement('button');
    b.className = 'tag' + (activeTag === t ? ' active' : '');
    b.textContent = t;
    b.style.setProperty('--tag', colors[0]);
    b.style.setProperty('--tagLight', colors[1]);

    b.onclick = function () {
      activeTag = activeTag === t ? null : t;
      renderTags();
      renderSongs();
    };

    box.appendChild(b);
  });
}

function matchSong(s) {
  const q = query.trim().toLowerCase();
  const categories = parseTags(s.category);
  const text = (s.title + ' ' + s.artist + ' ' + s.category).toLowerCase();

  const tagOk =
    !activeTag ||
    categories.includes(activeTag) ||
    s.artist === activeTag ||
    s.category.includes(activeTag);

  return tagOk && (!q || text.includes(q));
}

function renderSongs() {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const count = document.getElementById('count');

  if (!grid) return;

  grid.innerHTML = '';

  const list = songs.filter(matchSong);

  if (count) {
    count.textContent = '共 ' + list.length + ' 首 / 全部 ' + songs.length + ' 首';
  }

  if (empty) {
    empty.style.display = list.length ? 'none' : 'block';
  }

  list.forEach(function (s) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.title = s.title;

    const title = document.createElement('h3');
    title.className = 'song';
    title.textContent = s.title;

    const artist = document.createElement('div');
    artist.className = 'artist';
    artist.textContent = s.artist;

    const cat = document.createElement('span');
    cat.className = 'cat';
    cat.textContent = parseTags(s.category).join(' ') || '未分類';

    const copy = document.createElement('button');
    copy.className = 'copy';
    copy.type = 'button';
    copy.textContent = '複製';

    copy.onclick = async function () {
      const text = s.title + ' - ' + s.artist;

      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }

      copy.textContent = '✓ 已複製';
      copy.classList.add('done');

      setTimeout(function () {
        copy.textContent = '複製';
        copy.classList.remove('done');
      }, 1300);
    };

    card.append(title, artist, cat, copy);

    if (s.link) {
      card.addEventListener('dblclick', function () {
        window.open(s.link, '_blank', 'noopener,noreferrer');
      });

      card.title = '雙擊開啟歌曲連結';
    }

    grid.appendChild(card);
  });
}

function initSearch() {
  const search = document.getElementById('search');

  if (!search) return;

  search.addEventListener('input', function (e) {
    query = e.target.value;
    renderSongs();
  });
}

function initRandomButton() {
  const randomBtn = document.getElementById('randomBtn');

  if (!randomBtn) return;

  randomBtn.onclick = function (e) {
    e.preventDefault();

    const list = songs.filter(matchSong);

    if (!list.length) return;

    const s = list[Math.floor(Math.random() * list.length)];

    const pickSong = document.getElementById('pickSong');
    const pickArtist = document.getElementById('pickArtist');
    const modal = document.getElementById('modal');

    if (pickSong) {
      pickSong.textContent = s.title;
    }

    if (pickArtist) {
      pickArtist.textContent =
        s.artist + '｜' + (parseTags(s.category).join(' ') || '未分類');
    }

    if (modal) {
      modal.classList.add('show');
    }
  };
}

function initModal() {
  const closeModal = document.getElementById('closeModal');
  const modal = document.getElementById('modal');

  if (closeModal) {
    closeModal.onclick = function () {
      if (modal) {
        modal.classList.remove('show');
      }
    };
  }

  if (modal) {
    modal.onclick = function (e) {
      if (e.target.id === 'modal') {
        e.currentTarget.classList.remove('show');
      }
    };
  }
}

function initFloats() {
  const symbols = ['♪', '♫', '♡', '♬', '✦'];
  const layer = document.getElementById('floatLayer');

  if (!layer) return;

  layer.innerHTML = '';

  for (let i = 0; i < 28; i++) {
    const el = document.createElement('span');
    el.className = 'float';
    el.textContent = symbols[i % symbols.length];
    el.style.setProperty('--left', Math.random() * 100 + '%');
    el.style.setProperty('--dur', 10 + Math.random() * 14 + 's');
    el.style.setProperty('--delay', -Math.random() * 16 + 's');
    layer.appendChild(el);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  initSearch();
  initRandomButton();
  initModal();
  initFloats();
  loadSheet();
});
