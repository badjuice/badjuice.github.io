// Saves the GitHub profile and public repos to data/github.json.
// The page uses this copy when the live GitHub API can't be reached
// (it allows 60 requests an hour per visitor IP without a token).
import { writeFileSync } from 'node:fs';

const LOGIN = 'badjuice';
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'badjuice.github.io-snapshot' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const get = async (path) => {
  const r = await fetch(`https://api.github.com${path}`, { headers });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
};

const user = await get(`/users/${LOGIN}`);
const repos = await get(`/users/${LOGIN}/repos?per_page=100&type=owner&sort=pushed`);
const keep = ['name', 'html_url', 'description', 'language', 'stargazers_count', 'pushed_at', 'homepage', 'has_pages', 'fork', 'private'];
const data = {
  user: { followers: user.followers, created_at: user.created_at, location: user.location },
  repos: repos.map((r) => Object.fromEntries(keep.map((k) => [k, r[k]]))),
};
writeFileSync(new URL('../data/github.json', import.meta.url), JSON.stringify(data, null, 2) + '\n');
console.log(`saved ${data.repos.length} repos`);
