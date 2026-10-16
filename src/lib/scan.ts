import type { EvidenceCheck, Scan, Workflow } from './types';
import { calculateScore } from './scoring';
export { calculateScore } from './scoring';

export class ScanError extends Error {
  constructor(message: string, public status = 400, public retryAt?: string) { super(message); }
}

export function parseRepository(input: string): { owner: string; name: string } {
  let value = input.trim();
  if (value.length > 300) throw new ScanError('Enter a GitHub repository as owner/repository.');
  if (/^https?:\/\//i.test(value)) {
    let url: URL;
    try { url = new URL(value); } catch { throw new ScanError('That repository URL is not valid.'); }
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash) {
      throw new ScanError('Use an HTTPS github.com repository URL without credentials or query parameters.');
    }
    value = url.pathname.replace(/^\//, '').replace(/\/$/, '');
  }
  value = value.replace(/\.git$/, '');
  const parts = value.split('/');
  if (parts.length !== 2 || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/.test(parts[0]) || !/^[a-zA-Z0-9_.-]{1,100}$/.test(parts[1]) || ['.', '..'].includes(parts[1])) {
    throw new ScanError('Use owner/repository, for example vercel/next.js. Links to issues or files are not repositories.');
  }
  return { owner: parts[0], name: parts[1] };
}

interface GithubRepo { id: number; private: boolean; full_name: string; description: string | null; html_url: string; default_branch: string; language: string | null; stargazers_count: number; forks_count: number; open_issues_count: number; pushed_at: string; archived: boolean }
interface Community { files: { readme: { html_url: string } | null; license: { html_url: string } | null; contributing: { html_url: string } | null } }
interface GithubRun { id: number; workflow_id: number; name: string; status: string; conclusion: string | null; html_url: string; created_at: string; head_branch: string }
interface GithubRelease { id: number; name: string; tag_name: string; published_at: string; html_url: string; prerelease: boolean; draft?: boolean }
interface GithubCommit { sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } } }
type Fetcher = typeof fetch;

async function github<T>(path: string, fetcher: Fetcher): Promise<T> {
  const response = await fetcher(`https://api.github.com${path}`, {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ReleaseDesk/0.1', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
    signal: AbortSignal.timeout(12000), cache: 'no-store', redirect: 'error'
  });
  if (response.status === 403 || response.status === 429) {
    const reset = response.headers.get('x-ratelimit-reset');
    throw new ScanError('GitHub is limiting requests. Your saved reports are still available. Try again after the reset time.', 429, reset && /^\d+$/.test(reset) ? new Date(Number(reset) * 1000).toISOString() : undefined);
  }
  if (response.status === 404) throw new ScanError('Repository not found. This version supports public GitHub repositories only.', 404);
  if (!response.ok) throw new ScanError('GitHub could not return this evidence. Please try again shortly.', 502);
  return await response.json() as T;
}

export async function scanRepository(input: string, fetcher: Fetcher = fetch): Promise<Scan> {
  const { owner, name } = parseRepository(input);
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  let repo: GithubRepo;
  try { repo = await github<GithubRepo>(base, fetcher); }
  catch (error) { if (error instanceof ScanError) throw error; throw new ScanError('GitHub could not be reached. Check your connection and try again.', 502); }
  if (repo.private) throw new ScanError('This version supports public GitHub repositories only.', 404);
  const [community, runs, releases, commits] = await Promise.allSettled([
    github<Community>(`${base}/community/profile`, fetcher),
    github<{ workflow_runs: GithubRun[] }>(`${base}/actions/runs?branch=${encodeURIComponent(repo.default_branch)}&per_page=20`, fetcher),
    github<GithubRelease[]>(`${base}/releases?per_page=5`, fetcher),
    github<GithubCommit[]>(`${base}/commits?sha=${encodeURIComponent(repo.default_branch)}&per_page=12`, fetcher)
  ]);
  const url = repo.html_url;
  const checks: EvidenceCheck[] = [];
  const warnings: string[] = [];
  for (const [key, label, weight] of [['readme', 'Project README', 15], ['license', 'License declared', 10], ['contributing', 'Contribution guide', 10]] as const) {
    const file = community.status === 'fulfilled' ? community.value.files[key] : undefined;
    checks.push({ id: key, title: label, category: 'Documentation', weight,
      status: file === undefined ? 'unknown' : file ? 'pass' : 'warn',
      description: file === undefined ? 'GitHub community-file evidence was unavailable.' : file ? 'GitHub detected this file. Its contents have not been evaluated.' : 'GitHub did not detect this community file.',
      evidenceUrl: file?.html_url || `${url}/community`, recommendation: key === 'readme' ? 'Explain setup, usage, limitations, and how to run the project.' : key === 'license' ? 'Decide appropriate licensing and include the matching license file.' : 'Document setup, contribution expectations, and how changes are verified.' });
  }
  const rawRuns = runs.status === 'fulfilled' ? runs.value.workflow_runs : [];
  const latestByWorkflow = new Map<number, GithubRun>();
  for (const run of rawRuns) if (!latestByWorkflow.has(run.workflow_id)) latestByWorkflow.set(run.workflow_id, run);
  const latestRuns = [...latestByWorkflow.values()];
  const failed = latestRuns.some(r => ['failure', 'timed_out', 'action_required', 'startup_failure'].includes(r.conclusion || ''));
  const allPassed = latestRuns.length > 0 && latestRuns.every(r => r.status === 'completed' && r.conclusion === 'success');
  checks.push({ id: 'automation', title: 'Default-branch workflows', category: 'Automation', weight: 35,
    status: runs.status === 'rejected' ? 'unknown' : failed ? 'fail' : allPassed ? 'pass' : 'warn',
    description: runs.status === 'rejected' ? 'Workflow evidence could not be read.' : !latestRuns.length ? 'No workflow runs were found on the default branch.' : failed ? 'A recent default-branch workflow reported a failure.' : allPassed ? 'The latest observed run of each workflow succeeded.' : 'Some observed runs are pending, skipped, cancelled, or inconclusive.',
    evidenceUrl: `${url}/actions`, recommendation: 'Inspect the linked runs and confirm they cover the current release commit. A passing run is not proof that all code is tested.' });
  const releaseList = releases.status === 'fulfilled' ? releases.value.filter(r => !r.draft) : [];
  const stable = releaseList.find(r => !r.prerelease);
  checks.push({ id: 'release', title: 'Published stable release', category: 'Release', weight: 15,
    status: releases.status === 'rejected' ? 'unknown' : stable ? 'pass' : 'warn', description: releases.status === 'rejected' ? 'Release evidence could not be read.' : stable ? `Stable release ${stable.tag_name} is published.` : 'No stable release was found among the five most recent releases.',
    evidenceUrl: stable?.html_url || `${url}/releases`, recommendation: 'Publish a versioned release with change notes when that fits your delivery process.' });
  checks.push({ id: 'maintenance', title: 'Repository is active', category: 'Maintenance', weight: 15, status: repo.archived ? 'fail' : 'pass',
    description: repo.archived ? 'This repository is archived and read-only.' : 'This repository is not archived. This does not establish maintenance quality.', evidenceUrl: url,
    recommendation: 'Confirm maintainership and the intended repository before a handoff.' });
  for (const [label, result] of [['Community files', community], ['Workflows', runs], ['Releases', releases], ['Recent commits', commits]] as const) {
    if (result.status === 'rejected') warnings.push(`${label} unavailable; missing evidence is not treated as a failed check.`);
  }
  return {
    id: crypto.randomUUID(), createdAt: new Date().toISOString(), source: 'github',
    repo: { id: String(repo.id), fullName: repo.full_name, description: repo.description || '', url, defaultBranch: repo.default_branch, language: repo.language || 'Not specified', stars: repo.stargazers_count, forks: repo.forks_count, openIssues: repo.open_issues_count, pushedAt: repo.pushed_at, archived: repo.archived },
    checks, ...calculateScore(checks), warnings,
    workflows: rawRuns.slice(0, 8).map((r): Workflow => ({ id: r.id, name: r.name || 'Workflow', status: r.status, conclusion: r.conclusion, url: r.html_url, createdAt: r.created_at, branch: r.head_branch })),
    releases: releaseList.map(r => ({ id: r.id, name: r.name || r.tag_name, tag: r.tag_name, publishedAt: r.published_at, url: r.html_url, prerelease: r.prerelease })),
    commits: commits.status === 'fulfilled' ? commits.value.map(c => ({ sha: c.sha, message: c.commit.message.split('\n')[0], author: c.commit.author.name, date: c.commit.author.date, url: c.html_url })) : []
  };
}
