import { profile } from './profile.js';

const CACHE_KEY = 'gh-cache-v2';
const CACHE_MS = 60 * 60 * 1000;

// GitHub's linguist colours for the languages on this account.
const LANG = { TypeScript: '#3178c6', JavaScript: '#f1e05a', PowerShell: '#4f8fd8', Python: '#3572a5', 'C#': '#178600', Kotlin: '#a97bff' };

/** Public repos, live from the GitHub API (cached for an hour), else the snapshot the deploy job saved. */
async function loadRepos() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.repos;
  } catch {
    /* ignore */
  }
  try {
    const r = await fetch(`https://api.github.com/users/${profile.login}/repos?per_page=100&type=owner&sort=pushed`);
    if (!r.ok) throw new Error(String(r.status));
    const repos = await r.json();
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), repos }));
    } catch {
      /* ignore */
    }
    return repos;
  } catch {
    return (await fetch('data/github.json').then((r) => r.json())).repos;
  }
}

function liveUrl(repo) {
  if (repo.homepage) return repo.homepage;
  if (repo.has_pages) return `https://${profile.login}.github.io/${repo.name}/`;
  return null;
}

const el = (tag, className, text) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
};

const month = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

/** Language, stars and last push, as a row of small items. */
function meta(target, repo) {
  if (repo.language) {
    const lang = el('span', 'lang', repo.language);
    lang.style.setProperty('--lang', LANG[repo.language] ?? 'var(--sub)');
    target.append(lang);
  }
  target.append(el('span', null, `★ ${repo.stargazers_count}`), el('span', null, `updated ${month(repo.pushed_at)}`));
}

function card(repo) {
  const li = el('li', 'card');
  const name = el('a', 'card-name', repo.name);
  name.href = repo.html_url;
  const head = el('div', 'card-head');
  head.append(name, el('span', 'arrow', '↗'));
  li.append(head, el('p', 'card-desc', repo.description || 'No description yet.'));

  const topics = (repo.topics ?? []).slice(0, 4);
  if (topics.length) {
    const ul = el('ul', 'topics');
    ul.append(...topics.map((t) => el('li', null, t)));
    li.append(ul);
  }

  const foot = el('p', 'meta');
  meta(foot, repo);
  const live = liveUrl(repo);
  if (live) {
    const open = el('a', 'open', 'open ↗');
    open.href = live;
    foot.append(open);
  }
  li.append(foot);
  return li;
}

function featured(repo) {
  const { title, play } = profile.featured;
  document.getElementById('featured-title').textContent = title;
  document.getElementById('featured-desc').textContent = repo.description ?? '';
  document.getElementById('featured-play').href = play;
  document.getElementById('featured-play-label').textContent = `Play ${title}`;
  document.getElementById('featured-source').href = repo.html_url;
  meta(document.getElementById('featured-meta'), repo);
  document.getElementById('featured').hidden = false;
}

const list = document.getElementById('projects');
loadRepos()
  .then((repos) => {
    const own = repos.filter((r) => !r.fork && !r.private && !profile.hide.includes(r.name));
    const top = own.find((r) => r.name === profile.featured.repo);
    if (top) featured(top);
    const rank = (r) => {
      const i = profile.pin.indexOf(r.name);
      return i < 0 ? profile.pin.length : i;
    };
    const rest = own.filter((r) => r !== top);
    rest.sort((a, b) => rank(a) - rank(b) || new Date(b.pushed_at) - new Date(a.pushed_at));
    list.replaceChildren(...rest.map(card));
  })
  .catch(() => {
    list.innerHTML = '<li class="card-desc">Couldn’t load the list. See <a href="https://github.com/badjuice">github.com/badjuice</a>.</li>';
  });
