import { profile } from './profile.js';

document.getElementById('bio').textContent = profile.bio;

const CACHE_KEY = 'gh-cache-v2';
const CACHE_MS = 60 * 60 * 1000;

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
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), repos }));
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

function item(repo) {
  const li = document.createElement('li');
  const row = document.createElement('div');
  row.className = 'row';

  const name = document.createElement('a');
  name.className = 'name';
  name.href = repo.html_url;
  name.textContent = repo.name;
  row.append(name);

  const live = liveUrl(repo);
  if (live) {
    const play = document.createElement('a');
    play.className = 'play';
    play.href = live;
    play.textContent = repo.name === 'tximtxom' ? 'play' : 'open';
    row.append(play);
  }

  if (repo.language) {
    const lang = document.createElement('span');
    lang.className = 'lang';
    lang.textContent = repo.language;
    row.append(lang);
  }
  li.append(row);

  if (repo.description) {
    const p = document.createElement('p');
    p.className = 'desc';
    p.textContent = repo.description;
    li.append(p);
  }
  return li;
}

const list = document.getElementById('projects');
loadRepos()
  .then((repos) => {
    const own = repos.filter((r) => !r.fork && !r.private && !profile.hide.includes(r.name));
    const rank = (r) => {
      const i = profile.pin.indexOf(r.name);
      return i < 0 ? profile.pin.length : i;
    };
    own.sort((a, b) => rank(a) - rank(b) || new Date(b.pushed_at) - new Date(a.pushed_at));
    list.replaceChildren(...own.map(item));
  })
  .catch(() => {
    list.innerHTML = '<li class="desc">Couldn’t load the list. See <a href="https://github.com/badjuice">github.com/badjuice</a>.</li>';
  });
