import { profile } from './profile.js';

// ------------------------------------------------------------------ typing test

const wordsEl = document.getElementById('words');
const modeEl = document.getElementById('mode');
const liveEl = document.getElementById('live');
const hintEl = document.getElementById('hint');
const resultEl = document.getElementById('result');
document.getElementById('bio-text').textContent = profile.bio;

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touchOnly = matchMedia('(hover: none)').matches;
const words = profile.bio.split(' ');

let caret;
let state; // { wi, typed: string[], keys, correctKeys, start, mode }
let autoTimer = null;

function render() {
  wordsEl.innerHTML = '';
  words.forEach((w, wi) => {
    const wordEl = document.createElement('span');
    wordEl.className = 'word';
    const typed = state.typed[wi] ?? '';
    const len = Math.max(w.length, typed.length);
    for (let i = 0; i < len; i++) {
      const l = document.createElement('span');
      l.className = 'letter';
      if (i < w.length) {
        l.textContent = w[i];
        if (i < typed.length) l.classList.add(typed[i] === w[i] ? 'correct' : 'incorrect');
      } else {
        l.textContent = typed[i];
        l.classList.add('extra');
      }
      wordEl.appendChild(l);
    }
    wordsEl.appendChild(wordEl);
  });
  caret = document.createElement('span');
  caret.className = 'caret';
  wordsEl.appendChild(caret);
  placeCaret();
}

function placeCaret() {
  const wordEl = wordsEl.children[state.wi];
  if (!wordEl || !caret) return;
  const typedLen = (state.typed[state.wi] ?? '').length;
  const letters = wordEl.children;
  let left, top;
  if (typedLen < letters.length) {
    left = letters[typedLen].offsetLeft;
    top = letters[typedLen].offsetTop;
  } else {
    const last = letters[letters.length - 1];
    left = last.offsetLeft + last.offsetWidth;
    top = last.offsetTop;
  }
  caret.style.left = `${left - 1}px`;
  caret.style.top = `${top + 6}px`;
}

function reset(mode) {
  clearTimeout(autoTimer);
  state = { wi: 0, typed: [''], keys: 0, correctKeys: 0, start: 0, mode };
  resultEl.hidden = true;
  liveEl.textContent = '';
  modeEl.textContent = mode === 'auto' ? 'watching' : 'your turn';
  hintEl.textContent =
    mode === 'auto' ? (touchOnly ? '' : 'press any key to type it yourself') : 'type the text above · esc to stop';
  render();
  caret.classList.toggle('blink', mode === 'user');
}

/** One keystroke, shared by the autoplay and the player. */
function type(ch) {
  if (!state.start) state.start = performance.now();
  const target = words[state.wi];
  const cur = state.typed[state.wi];
  if (ch === ' ') {
    if (cur.length === 0) return;
    state.keys++;
    if (cur === target) state.correctKeys++;
    if (state.wi < words.length - 1) {
      state.wi++;
      state.typed[state.wi] = '';
    }
  } else if (ch === 'Backspace') {
    if (cur.length > 0) state.typed[state.wi] = cur.slice(0, -1);
    else if (state.wi > 0 && state.typed[state.wi - 1] !== words[state.wi - 1]) {
      state.wi--; // like Monkeytype: you can go back into a word with mistakes
    }
  } else {
    if (cur.length >= target.length + 8) return;
    state.keys++;
    if (target[cur.length] === ch) state.correctKeys++;
    state.typed[state.wi] = cur + ch;
  }
  render();
  if (state.mode === 'user') updateLive();
  const last = state.wi === words.length - 1 && state.typed[state.wi] === words[words.length - 1];
  if (last) finish();
}

function correctChars() {
  let n = 0;
  words.forEach((w, i) => {
    const t = state.typed[i] ?? '';
    if (i < state.wi && t === w) n += w.length + 1;
    else if (i === state.wi) for (let k = 0; k < Math.min(t.length, w.length); k++) if (t[k] === w[k]) n++;
  });
  return n;
}

function wpm() {
  const minutes = (performance.now() - state.start) / 60000;
  return minutes > 0 ? Math.round(correctChars() / 5 / minutes) : 0;
}

function updateLive() {
  liveEl.textContent = state.start ? String(wpm()) : '';
}

function finish() {
  clearTimeout(autoTimer);
  if (state.mode === 'auto') {
    // The bio ends mid-word on purpose ("character lim"). Pause, then start over.
    caret.classList.add('blink');
    hintEl.textContent = touchOnly ? '' : 'press any key to type it yourself';
    autoTimer = setTimeout(() => {
      reset('auto');
      autoplay();
    }, 6000);
    return;
  }
  const secs = (performance.now() - state.start) / 1000;
  document.getElementById('r-wpm').textContent = wpm();
  document.getElementById('r-acc').textContent = `${Math.round((100 * state.correctKeys) / Math.max(1, state.keys))}%`;
  document.getElementById('r-time').textContent = `${Math.round(secs)}s`;
  document.getElementById('r-chars').textContent = correctChars();
  resultEl.hidden = false;
  liveEl.textContent = '';
  hintEl.textContent = 'tab + enter to try again · esc to watch';
  state.mode = 'done';
  caret.classList.add('blink');
}

/** Types the bio at about 85 wpm, with the odd typo that gets fixed. */
function autoplay() {
  if (reduceMotion) {
    words.forEach((w, i) => (state.typed[i] = w));
    state.wi = words.length - 1;
    render();
    return;
  }
  const step = () => {
    if (state.mode !== 'auto') return;
    const target = words[state.wi];
    const cur = state.typed[state.wi];
    let next;
    if (cur !== target.slice(0, cur.length)) next = 'Backspace';
    else if (cur.length < target.length) next = Math.random() < 0.025 ? 'qwertyuiopasdfghjklzxcvbnm'[Math.floor(Math.random() * 26)] : target[cur.length];
    else next = ' ';
    type(next);
    if (state.mode !== 'auto' || (state.wi === words.length - 1 && state.typed[state.wi] === target)) return;
    const base = next === ' ' ? 170 : next === 'Backspace' ? 260 : 110;
    autoTimer = setTimeout(step, base * (0.55 + Math.random() * 0.9));
  };
  autoTimer = setTimeout(step, 900);
}

let tabHeld = false;
addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target instanceof HTMLElement && e.target.closest('input, textarea, button, a') && e.key !== 'Escape' && e.key !== 'Tab') return;
  if (e.key === 'Tab') {
    tabHeld = true;
    if (state.mode !== 'auto') e.preventDefault();
    return;
  }
  if (e.key === 'Enter' && tabHeld) {
    e.preventDefault();
    reset('user');
    return;
  }
  if (e.key === 'Escape') {
    reset('auto');
    autoplay();
    return;
  }
  const printable = e.key.length === 1 || e.key === 'Backspace';
  if (!printable) return;
  if (state.mode === 'auto') {
    reset('user');
    document.getElementById('type').scrollIntoView({ block: 'nearest' });
  }
  if (state.mode !== 'user') return;
  e.preventDefault();
  type(e.key);
});
addEventListener('keyup', (e) => {
  if (e.key === 'Tab') tabHeld = false;
});
setInterval(() => state?.mode === 'user' && updateLive(), 1000);
addEventListener('resize', () => placeCaret());

reset('auto');
document.fonts.ready.then(() => {
  placeCaret();
  autoplay();
});

// ------------------------------------------------------------------ GitHub data

const LANG_COLORS = {
  TypeScript: '#7fa480',
  JavaScript: '#c87e74',
  'C#': '#080909',
  PowerShell: '#6f8fa6',
  Python: '#c9a85c',
};
const CACHE_KEY = 'gh-cache-v1';
const CACHE_MS = 60 * 60 * 1000;

/** Live from the GitHub API (cached for an hour), else the snapshot the deploy job saved. */
async function loadGitHub() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;
  } catch {
    /* ignore */
  }
  try {
    const [user, repos] = await Promise.all([
      fetch(`https://api.github.com/users/${profile.login}`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      fetch(`https://api.github.com/users/${profile.login}/repos?per_page=100&type=owner&sort=pushed`).then((r) =>
        r.ok ? r.json() : Promise.reject(r.status),
      ),
    ]);
    const data = { user, repos };
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
    return data;
  } catch {
    return fetch('data/github.json').then((r) => r.json());
  }
}

function ago(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function liveUrl(repo) {
  if (repo.homepage) return repo.homepage;
  if (repo.has_pages) return `https://${profile.login}.github.io/${repo.name}/`;
  return null;
}

function card(repo) {
  const el = document.createElement('article');
  el.className = 'card';
  const live = liveUrl(repo);
  const lang = repo.language;
  el.innerHTML = `
    <h3><a></a></h3>
    <p></p>
    <div class="meta">
      ${lang ? `<span><span class="dot" style="background:${LANG_COLORS[lang] ?? 'var(--sub)'}"></span>${lang.toLowerCase()}</span>` : ''}
      ${repo.stargazers_count ? `<span>★ ${repo.stargazers_count}</span>` : ''}
      <span>${ago(repo.pushed_at)}</span>
      ${live ? `<a class="live-link" href="${live}">${repo.name === 'tximtxom' ? 'play' : 'open'} →</a>` : ''}
    </div>`;
  const a = el.querySelector('h3 a');
  a.textContent = repo.name;
  a.href = repo.html_url;
  const p = el.querySelector('p');
  p.textContent = repo.description || 'no description yet';
  if (!repo.description) p.classList.add('sub');
  return el;
}

function renderProjects(repos) {
  const cardsEl = document.getElementById('cards');
  const filtersEl = document.getElementById('filters');
  const langs = [...new Set(repos.map((r) => r.language).filter(Boolean))].sort();
  let active = 'all';
  const draw = () => {
    cardsEl.innerHTML = '';
    for (const r of repos) if (active === 'all' || r.language === active) cardsEl.appendChild(card(r));
    for (const b of filtersEl.children) b.setAttribute('aria-pressed', String(b.dataset.lang === active));
  };
  filtersEl.innerHTML = '';
  for (const l of ['all', ...langs]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.lang = l;
    b.textContent = l.toLowerCase();
    b.addEventListener('click', () => {
      active = l;
      draw();
    });
    filtersEl.appendChild(b);
  }
  draw();
}

loadGitHub()
  .then(({ user, repos }) => {
    const own = repos.filter((r) => !r.fork && !r.private && !profile.hide.includes(r.name));
    const rank = (r) => {
      const i = profile.pin.indexOf(r.name);
      return i < 0 ? profile.pin.length : i;
    };
    own.sort((a, b) => rank(a) - rank(b) || new Date(b.pushed_at) - new Date(a.pushed_at));
    document.getElementById('s-repos').textContent = own.length;
    document.getElementById('s-stars').textContent = own.reduce((s, r) => s + r.stargazers_count, 0);
    document.getElementById('s-followers').textContent = user.followers;
    document.getElementById('s-years').textContent = Math.floor((Date.now() - new Date(user.created_at)) / (365.25 * 86400000));
    document.getElementById('s-location').textContent = profile.location || user.location || '';
    renderProjects(own);
  })
  .catch(() => {
    document.getElementById('cards').innerHTML = '<p class="sub">couldn\'t load projects right now. see <a href="https://github.com/badjuice">github.com/badjuice</a></p>';
  });
