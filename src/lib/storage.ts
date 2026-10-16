import type { EvidenceCheck, FixTask, Scan, Workspace } from './types';
import { calculateScore } from './scoring';
export const STORAGE_KEY = 'releasedesk.workspace.v1';
export function createWorkspace(name: string, role: string): Workspace {
  return { version: 1, name: name.trim().slice(0, 80) || 'My workspace', role: role.slice(0, 80), scans: [], tasks: [] };
}
export function tasksFromScan(scan: Scan): FixTask[] {
  return scan.checks.filter(c => c.status === 'fail' || c.status === 'warn').map(c => ({ id: `${scan.id}:${c.id}`, scanId: scan.id, checkId: c.id, title: c.title, repoFullName: scan.repo.fullName, status: 'todo', priority: c.status === 'fail' ? 'high' : 'medium', notes: '' }));
}
export function addScan(workspace: Workspace, scan: Scan): Workspace {
  if (workspace.scans.some(s => s.id === scan.id)) return workspace;
  const currentTasks = workspace.tasks.filter(t => t.repoFullName !== scan.repo.fullName);
  const observedChecks = new Map(scan.checks.map(check => [check.id, check.status]));
  // Missing evidence cannot resolve a task or erase the user's investigation notes.
  // Keep the original evidence reference until there is a new observed result.
  const unverifiedTasks = workspace.tasks.filter(task => task.repoFullName === scan.repo.fullName &&
    (!observedChecks.has(task.checkId) || observedChecks.get(task.checkId) === 'unknown'));
  const nextTasks = tasksFromScan(scan).map(task => {
    const previous = workspace.tasks.find(t => t.repoFullName === task.repoFullName && t.checkId === task.checkId);
    // A fresh scan reopens an unresolved check even if a user marked the old task done.
    return previous ? { ...task, notes: previous.notes, status: previous.status === 'done' ? 'todo' as const : previous.status } : task;
  });
  return { ...workspace, scans: [scan, ...workspace.scans].slice(0, 100), tasks: [...nextTasks, ...unverifiedTasks, ...currentTasks].slice(0, 600) };
}

export function demoWorkspace(name = 'Northstar Studio', role = 'Independent builder'): Workspace {
  let workspace = createWorkspace(name, role);
  for (const [index, fullName] of ['northstar/atlas-web', 'northstar/orbit-api'].entries()) {
    for (let day = 3; day >= 0; day--) {
      const createdAt = new Date(Date.now() - day * 86400000 - index * 3600000).toISOString();
      const checks: EvidenceCheck[] = [
        { id: 'readme', title: 'Project README', category: 'Documentation', status: 'pass', weight: 15, description: 'Sample: README includes a setup guide and usage examples.', recommendation: 'Keep setup instructions in sync with the application.' },
        { id: 'license', title: 'License declared', category: 'Documentation', status: day > 1 ? 'warn' : 'pass', weight: 10, description: day > 1 ? 'Sample: license has not been declared.' : 'Sample: a license file was detected.', recommendation: 'Decide and document the appropriate license.' },
        { id: 'contributing', title: 'Contribution guide', category: 'Documentation', status: 'warn', weight: 10, description: 'Sample: no contribution guide was detected.', recommendation: 'Add setup, verification, and contribution instructions.' },
        { id: 'automation', title: 'Default-branch workflows', category: 'Automation', status: day > 1 || index === 1 ? 'fail' : 'pass', weight: 35, description: day > 1 || index === 1 ? 'Sample: the latest test workflow failed.' : 'Sample: recent default-branch workflows succeeded.', recommendation: 'Review the failing check and rerun it after a fix.' },
        { id: 'release', title: 'Published stable release', category: 'Release', status: day > 0 ? 'warn' : 'pass', weight: 15, description: day > 0 ? 'Sample: release notes are not published.' : 'Sample: v1.4.0 is published.', recommendation: 'Write a concise changelog for the next release.' },
        { id: 'maintenance', title: 'Repository is active', category: 'Maintenance', status: 'pass', weight: 15, description: 'Sample: repository is not archived.', recommendation: 'Confirm ongoing ownership before handoff.' }
      ];
      const scan: Scan = { id: `demo-${index}-${day}`, source: 'demo', createdAt, checks, ...calculateScore(checks), warnings: ['Illustrative sample data. These repositories and results are not live GitHub scans.'],
        repo: { id: `demo-${index}`, fullName, description: index ? 'The service layer behind the next big thing.' : 'A better home for ambitious side projects.', url: 'https://github.com', defaultBranch: 'main', language: index ? 'Python' : 'TypeScript', stars: 0, forks: 0, openIssues: index ? 8 : 3, pushedAt: createdAt, archived: false },
        workflows: [{ id: index + 1, name: 'Build & test', status: 'completed', conclusion: index || day > 1 ? 'failure' : 'success', url: 'https://github.com/features/actions', createdAt, branch: 'main' }, { id: index + 10, name: 'Type check', status: 'completed', conclusion: 'success', url: 'https://github.com/features/actions', createdAt, branch: 'main' }],
        releases: day ? [] : [{ id: index + 1, name: 'A clearer path to launch', tag: 'v1.4.0', publishedAt: createdAt, url: 'https://github.com', prerelease: false }],
        commits: [{ sha: 'sample01', message: 'Add project settings and export controls', author: 'Sample contributor', date: createdAt, url: 'https://github.com' }, { sha: 'sample02', message: 'Improve keyboard navigation', author: 'Sample contributor', date: createdAt, url: 'https://github.com' }]
      };
      workspace = addScan(workspace, scan);
    }
  }
  return workspace;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid workspace backup.');
  return value as Record<string, unknown>;
}
function str(value: unknown, max = 2000): string { if (typeof value !== 'string' || value.length > max) throw new Error('Invalid text in workspace backup.'); return value; }
function scanId(value: unknown): string { const id = str(value, 100); if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Invalid scan ID in workspace backup.'); return id; }
function num(value: unknown): number { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Invalid number in workspace backup.'); return value; }
function date(value: unknown): string { const text = str(value, 60); if (!Number.isFinite(Date.parse(text))) throw new Error('Invalid date in workspace backup.'); return text; }
function url(value: unknown): string { const text = str(value, 1500); const parsed = new URL(text); if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Backup links must use HTTPS.'); return text; }
function list(value: unknown, max: number): unknown[] { if (!Array.isArray(value) || value.length > max) throw new Error('Invalid or oversized backup.'); return value; }
function option<T extends string>(value: unknown, allowed: readonly T[]): T { if (!allowed.includes(value as T)) throw new Error('Invalid status in workspace backup.'); return value as T; }
export function validateWorkspace(data: unknown): Workspace {
  const w = object(data);
  if (w.version !== 1) throw new Error('This backup version is not supported.');
  const scans = list(w.scans, 100).map(item => {
    const s = object(item); const r = object(s.repo);
    const checks = list(s.checks, 30).map(item => {
      const c = object(item);
      const weight = num(c.weight); if (weight > 100) throw new Error('Invalid check weight.');
      return { id: str(c.id, 100), title: str(c.title, 200), description: str(c.description), recommendation: str(c.recommendation), status: option(c.status, ['pass','warn','fail','unknown'] as const), category: option(c.category, ['Automation','Documentation','Release','Maintenance'] as const), weight, ...(c.evidenceUrl ? { evidenceUrl: url(c.evidenceUrl) } : {}) };
    });
    if (typeof r.archived !== 'boolean') throw new Error('Invalid repository status.');
    return { id: scanId(s.id), source: option(s.source, ['github','demo'] as const), createdAt: date(s.createdAt), checks, ...calculateScore(checks),
      repo: { id: str(r.id, 100), fullName: str(r.fullName, 150), description: str(r.description), url: url(r.url), defaultBranch: str(r.defaultBranch, 200), language: str(r.language, 100), stars: num(r.stars), forks: num(r.forks), openIssues: num(r.openIssues), pushedAt: date(r.pushedAt), archived: r.archived },
      workflows: list(s.workflows, 30).map(item => { const v = object(item); return { id: num(v.id), name: str(v.name, 300), status: str(v.status, 100), conclusion: v.conclusion === null ? null : str(v.conclusion, 100), url: url(v.url), createdAt: date(v.createdAt), branch: str(v.branch, 200) }; }),
      releases: list(s.releases, 30).map(item => { const v = object(item); if (typeof v.prerelease !== 'boolean') throw new Error('Invalid release.'); return { id: num(v.id), name: str(v.name, 300), tag: str(v.tag, 300), publishedAt: date(v.publishedAt), url: url(v.url), prerelease: v.prerelease }; }),
      commits: list(s.commits, 50).map(item => { const v = object(item); return { sha: str(v.sha, 100), message: str(v.message), author: str(v.author, 300), date: date(v.date), url: url(v.url) }; }), warnings: list(s.warnings, 30).map(v => str(v))
    } satisfies Scan;
  });
  if (new Set(scans.map(s => s.id)).size !== scans.length) throw new Error('Duplicate scan IDs in backup.');
  const tasks = list(w.tasks, 600).map(item => { const t = object(item); return { id: str(t.id, 250), scanId: scanId(t.scanId), checkId: str(t.checkId, 100), title: str(t.title, 200), repoFullName: str(t.repoFullName, 150), status: option(t.status, ['todo','in_progress','done'] as const), priority: option(t.priority, ['high','medium','low'] as const), notes: str(t.notes, 5000) } satisfies FixTask; });
  return { version: 1, name: str(w.name, 80), role: str(w.role, 80), scans, tasks };
}
