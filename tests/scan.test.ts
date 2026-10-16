import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRepository, calculateScore, scanRepository, ScanError } from '../src/lib/scan';
import { addScan, demoWorkspace, validateWorkspace } from '../src/lib/storage';
import { exportMarkdown } from '../src/lib/utils';
import type { EvidenceCheck } from '../src/lib/types';

test('accepts a public GitHub URL or owner/repository', () => {
  assert.deepEqual(parseRepository(' https://github.com/vercel/next.js.git/ '), { owner: 'vercel', name: 'next.js' });
  assert.deepEqual(parseRepository('openai/codex'), { owner: 'openai', name: 'codex' });
});
test('blocks non-GitHub URLs, credentials, encoded path injection and non-repo paths', () => {
  for (const input of ['https://github.com.evil.test/a/b','http://github.com/a/b','https://127.0.0.1/a/b','https://secret@github.com/a/b','https://github.com/a/b/issues','a/..','a/%2e%2e','https://github.com/a/b?x=1','https://github.com:8080/a/b']) assert.throws(() => parseRepository(input), ScanError);
});
test('unknown evidence is excluded from the score but lowers coverage', () => {
  const checks = [{ weight: 50, status: 'pass' }, { weight: 50, status: 'unknown' }] as EvidenceCheck[];
  assert.deepEqual(calculateScore(checks), { score: 100, coverage: 50 });
  assert.deepEqual(calculateScore([{ weight: 100, status: 'unknown' }] as EvidenceCheck[]), { score: null, coverage: 0 });
  assert.deepEqual(calculateScore([{ weight: 60, status: 'pass' },{ weight: 40, status: 'warn' }] as EvidenceCheck[]), { score: 80, coverage: 100 });
});
const repo = { id:1, private:false, full_name:'owner/project', description:'Example',html_url:'https://github.com/owner/project',default_branch:'main',language:'TypeScript',stargazers_count:2,forks_count:0,open_issues_count:1,pushed_at:'2026-10-16T10:00:00Z',archived:false };
const run = (id:number, conclusion:string) => ({ id, workflow_id:1, name:'CI',status:'completed',conclusion,html_url:'https://github.com/owner/project/actions/runs/1',created_at:'2026-10-16T10:00:00Z',head_branch:'main' });
function mockFetch(options: { private?:boolean; unavailable?:boolean; runs?:unknown[]; draft?:boolean } = {}): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/repos/owner/project')) return Response.json({ ...repo, private: options.private || false });
    if (options.unavailable) return new Response('', { status: 503 });
    if (url.includes('community/profile')) return Response.json({ files:{readme:{html_url:'https://github.com/owner/project#readme'},license:null,contributing:null} });
    if (url.includes('actions/runs')) return Response.json({ workflow_runs: options.runs || [run(2,'success'), run(1,'failure')] });
    if (url.includes('releases')) return Response.json([{id:1,name:'v1',tag_name:'v1',published_at:'2026-10-16T10:00:00Z',html_url:'https://github.com/owner/project/releases/tag/v1',prerelease:false,draft:options.draft || false}]);
    return Response.json([]);
  }) as typeof fetch;
}
test('old failed run does not override the latest passing run of the same workflow', async () => {
  const scan = await scanRepository('owner/project', mockFetch());
  assert.equal(scan.checks.find(c=>c.id==='automation')?.status,'pass');
  assert.equal(scan.checks.find(c=>c.id==='license')?.status,'warn');
  assert.equal(scan.coverage,100);
});
test('latest failed run becomes an actionable failure', async () => {
  const scan = await scanRepository('owner/project',mockFetch({runs:[run(3,'failure'),run(2,'success')]}));
  assert.equal(scan.checks.find(c=>c.id==='automation')?.status,'fail');
});
test('partial API outages remain unknown instead of failing the repository', async () => {
  const scan = await scanRepository('owner/project',mockFetch({unavailable:true}));
  assert.equal(scan.checks.filter(c=>c.status==='unknown').length,5);
  assert.equal(scan.coverage,15);
  assert.equal(scan.warnings.length,4);
});
test('private repository data cannot be exposed by a server token', async () => {
  await assert.rejects(scanRepository('owner/project',mockFetch({private:true})), /public GitHub repositories only/);
});
test('draft releases are not exposed or counted as a published release', async () => {
  const scan = await scanRepository('owner/project',mockFetch({draft:true}));
  assert.equal(scan.releases.length,0);
  assert.equal(scan.checks.find(c=>c.id==='release')?.status,'warn');
});
test('rate limits produce a useful reset time', async () => {
  const fetcher = (async () => new Response('',{status:429,headers:{'x-ratelimit-reset':'1792144800'}})) as typeof fetch;
  await assert.rejects(scanRepository('owner/project',fetcher),(error:unknown) => error instanceof ScanError && error.status===429 && !!error.retryAt);
});
test('sample backups round-trip and scores are recalculated instead of trusted', () => {
  const workspace = demoWorkspace();
  workspace.scans[0].score=999;
  const loaded = validateWorkspace(JSON.parse(JSON.stringify(workspace)));
  assert.notEqual(loaded.scans[0].score,999);
  assert.equal(loaded.scans.length,8);
});
test('malformed backups and executable URLs are rejected', () => {
  assert.throws(()=>validateWorkspace({version:2}));
  const workspace=demoWorkspace();
  workspace.scans[0].repo.url='javascript:alert(1)';
  assert.throws(()=>validateWorkspace(workspace),/HTTPS/);
});
test('cached scan IDs do not duplicate history, fresh failed checks reopen local tasks', () => {
  let workspace=demoWorkspace();
  assert.equal(addScan(workspace,workspace.scans[0]).scans.length,workspace.scans.length);
  const task=workspace.tasks[0]; task.status='done'; task.notes='Investigated yesterday';
  const scan={...workspace.scans.find(s=>s.id===task.scanId)!,id:'fresh-scan'};
  workspace=addScan(workspace,scan);
  const updated=workspace.tasks.find(t=>t.repoFullName===task.repoFullName&&t.checkId===task.checkId)!;
  assert.equal(updated.status,'todo');assert.equal(updated.notes,'Investigated yesterday');
});
test('an unavailable follow-up preserves the existing task, notes and last known evidence', () => {
  const workspace = demoWorkspace();
  const task = workspace.tasks.find(t => t.checkId === 'automation')!;
  task.status = 'in_progress'; task.notes = 'Investigating a flaky runner; retry after the outage.';
  const previous = workspace.scans.find(s => s.id === task.scanId)!;
  const unrelatedTasks = workspace.tasks.filter(t => t.repoFullName !== task.repoFullName);
  const next = addScan(workspace, { ...previous, id: 'unknown-followup', checks: previous.checks.map(check =>
    check.id === task.checkId ? { ...check, status: 'unknown' } : check) });
  const matchingTasks = next.tasks.filter(t => t.repoFullName === task.repoFullName && t.checkId === task.checkId);
  assert.deepEqual(matchingTasks, [task]);
  assert.deepEqual(next.tasks.filter(t => t.repoFullName !== task.repoFullName), unrelatedTasks);
  assert.equal(next.scans[0].id, 'unknown-followup');
});

test('an omitted check retains its task until a later scan positively passes it', () => {
  const workspace = demoWorkspace();
  const task = workspace.tasks.find(t => t.checkId === 'automation')!;
  task.status = 'done'; task.notes = 'Locally fixed; waiting for GitHub evidence.';
  const previous = workspace.scans.find(s => s.id === task.scanId)!;
  const omitted = addScan(workspace, { ...previous, id: 'omitted-followup', checks: previous.checks.filter(check => check.id !== task.checkId) });
  assert.deepEqual(omitted.tasks.find(t => t.id === task.id), task);
  const passed = addScan(omitted, { ...previous, id: 'passing-followup', checks: previous.checks.map(check =>
    check.id === task.checkId ? { ...check, status: 'pass' } : check) });
  assert.equal(passed.tasks.some(t => t.repoFullName === task.repoFullName && t.checkId === task.checkId), false);
});

test('backup scan IDs cannot inject path segments, query strings or fragments into snapshot routes', () => {
  for (const unsafeId of ['', '.', '..', 'one/two', 'one\\two', '%2F', '%', 'scan?tab=reports', 'scan#fragment', 'scan name']) {
    const workspace = demoWorkspace();
    workspace.scans[0].id = unsafeId;
    assert.throws(() => validateWorkspace(workspace), /Invalid scan ID/, unsafeId);
    const taskWorkspace = demoWorkspace();
    taskWorkspace.tasks[0].scanId = unsafeId;
    assert.throws(() => validateWorkspace(taskWorkspace), /Invalid scan ID/, unsafeId);
  }
});

test('backup scan IDs accept generated UUIDs, demo IDs and route-safe identifiers', () => {
  for (const safeId of ['123e4567-e89b-12d3-a456-426614174000', 'demo-2-0', 'scan_AZ09']) {
    const workspace = demoWorkspace();
    const previousId = workspace.scans[0].id;
    workspace.scans[0].id = safeId;
    workspace.tasks = workspace.tasks.map(task => task.scanId === previousId ? { ...task, scanId: safeId } : task);
    assert.equal(validateWorkspace(workspace).scans[0].id, safeId);
  }
});

test('reports distinguish sample data and state evidence limitations', () => {
  const report=exportMarkdown(demoWorkspace().scans[0]);
  assert.match(report,/SAMPLE DATA/);assert.match(report,/not a security audit/);assert.match(report,/coverage/);
});
