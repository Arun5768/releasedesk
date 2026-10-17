'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Box,
  Check, CheckCheck, ChevronDown, ChevronRight, CircleAlert, CircleCheck,
  Clock3, Code2, Download, ExternalLink, FileJson, FileText, FolderGit2, GitBranch,
  Github, HelpCircle, LayoutDashboard, Link2, ListChecks, Loader2, LockKeyhole,
  Menu, Plus, RefreshCw, Search, Settings2, ShieldCheck, Sparkles,
  Terminal, Trash2, Upload, X, Zap,
} from 'lucide-react';
import { useWorkspace } from '@/components/workspace-provider';
import { downloadText, exportMarkdown, formatDate, relativeTime } from '@/lib/utils';
import type { CheckStatus, FixTask, Scan, TaskStatus, Workspace } from '@/lib/types';
import './dashboard.css';

const navigation = [
  { label: 'Overview', href: '/workspace', icon: LayoutDashboard },
  { label: 'Repositories', href: '/workspace/repositories', icon: FolderGit2 },
  { label: 'Fix queue', href: '/workspace/queue', icon: ListChecks },
  { label: 'Reports', href: '/workspace/reports', icon: FileText },
  { label: 'Integrations', href: '/workspace/integrations', icon: Link2 },
];
const statusLabels: Record<CheckStatus, string> = { pass: 'Passed', warn: 'Review', fail: 'Needs attention', unknown: 'Unavailable' };
const taskLabels: Record<TaskStatus, string> = { todo: 'To do', in_progress: 'In progress', done: 'Done' };
const categoryIcons = { Automation: Zap, Documentation: BookOpen, Release: Box, Maintenance: Activity };

function snapshotTime(value: string) {
  return new Date(value).toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function latestRepositories(scans: Scan[]) {
  const seen = new Set<string>();
  return [...scans].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).filter(scan => {
    if (seen.has(scan.repo.fullName)) return false;
    seen.add(scan.repo.fullName);
    return true;
  });
}

function Score({ value, small = false }: { value: number | null; small?: boolean }) {
  return <span className={`desk-score ${small ? 'desk-score-small' : ''} ${value === null ? 'is-muted' : value >= 80 ? 'is-green' : value >= 50 ? 'is-yellow' : 'is-red'}`}>
    {value ?? '—'}{!small && value !== null && <span>/100</span>}
  </span>;
}

function Badge({ status }: { status: CheckStatus }) {
  const Icon = status === 'pass' ? CircleCheck : status === 'unknown' ? HelpCircle : status === 'warn' ? Clock3 : CircleAlert;
  return <span className={`desk-status desk-status-${status}`}><Icon size={12} />{statusLabels[status]}</span>;
}

function Source({ scan }: { scan: Scan }) {
  return <span className={`desk-source ${scan.source === 'demo' ? 'is-sample' : ''}`}><span />{scan.source === 'demo' ? 'Sample data' : 'GitHub snapshot'}</span>;
}

function Empty({ icon: Icon = FolderGit2, title, text, action }: { icon?: typeof FolderGit2; title: string; text: string; action?: React.ReactNode }) {
  return <div className="desk-empty"><div className="desk-empty-icon"><Icon size={26} /></div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function ScanChart({ scans }: { scans: Scan[] }) {
  const [repository, setRepository] = useState('all');
  const repositories = [...new Set(scans.map(s => s.repo.fullName))];
  const points = [...scans].filter(s => s.score !== null && (repository === 'all' || s.repo.fullName === repository)).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)).slice(-12);
  const width = 700, height = 200;
  const coordinates = points.map((s, i) => ({ x: points.length === 1 ? width / 2 : 18 + i * (width - 36) / (points.length - 1), y: 12 + (100 - (s.score ?? 0)) * (height - 24) / 100, scan: s }));
  const path = coordinates.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = coordinates.length > 1 ? `${path} L ${coordinates.at(-1)!.x} ${height} L ${coordinates[0].x} ${height} Z` : '';
  const newest = points.at(-1);
  return <section className="desk-panel desk-chart-panel">
    <div className="desk-panel-head"><div><h2>Evidence over time</h2><p>Saved scores from six repository checks</p></div><select aria-label="Chart repository" value={repository} onChange={e => setRepository(e.target.value)} className="desk-select desk-chart-select"><option value="all">All repositories</option>{repositories.map(repo => <option key={repo}>{repo}</option>)}</select></div>
    {points.length ? <>
      <div className="desk-chart-summary"><Score value={newest?.score ?? null} /><span>Latest scan <i />{newest?.repo.fullName.split('/').at(-1)}</span></div>
      <div className="desk-chart-area"><div className="desk-chart-axis">{[100, 75, 50, 25, 0].map(n => <span key={n}>{n}</span>)}</div><svg className="desk-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Evidence scores: ${points.map(s => `${s.repo.fullName}, ${s.score}, ${formatDate(s.createdAt)}`).join('; ')}`} preserveAspectRatio="none">
        <defs><linearGradient id="desk-chart-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#f0b90b" stopOpacity=".20" /><stop offset="100%" stopColor="#f0b90b" stopOpacity="0" /></linearGradient></defs>
        {[0, 25, 50, 75, 100].map(n => <line key={n} x1="0" y1={12 + n * (height - 24) / 100} x2={width} y2={12 + n * (height - 24) / 100} stroke="#2b3139" strokeDasharray="3 5" />)}
        {area && <path d={area} fill="url(#desk-chart-gradient)" />}{coordinates.length > 1 && <path d={path} fill="none" stroke="#f0b90b" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />}
        {coordinates.map((p, i) => <g key={p.scan.id}><circle cx={p.x} cy={p.y} r={i === coordinates.length - 1 ? 6 : 4} fill="#0b0e11" stroke="#f0b90b" strokeWidth="2"><title>{`${p.scan.repo.fullName}: ${p.scan.score}/100 · ${formatDate(p.scan.createdAt)}`}</title></circle></g>)}
      </svg></div>
      <div className="desk-chart-dates"><span>{formatDate(points[0].createdAt)}</span><span>{points.length} saved {points.length === 1 ? 'snapshot' : 'snapshots'}</span><span>{points.length > 1 ? formatDate(points.at(-1)!.createdAt) : 'Scan again to see change'}</span></div>
    </> : <Empty icon={Activity} title="Your baseline starts here" text="Scan a repository to collect six release signals. Every new scan becomes another point in your evidence history." />}
  </section>;
}

function RepositoryTable({ scans, onScan, compact = false }: { scans: Scan[]; onScan: () => void; compact?: boolean }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const latest = latestRepositories(scans);
  const filtered = latest.filter(s => s.repo.fullName.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || (filter === 'attention' ? s.checks.some(c => c.status === 'fail' || c.status === 'warn') : s.source === filter)));
  return <section className="desk-panel desk-repository-panel">
    <div className="desk-panel-head"><div className="desk-inline-title"><h2>Your repositories</h2><span className="desk-count">{latest.length}</span></div>{compact ? <Link className="desk-text-link" href="/workspace/repositories">View all <ArrowUpRight size={15} /></Link> : <button className="desk-button desk-button-yellow desk-button-sm" onClick={onScan}><Plus size={14} />Scan repository</button>}</div>
    {!compact && <div className="desk-table-tools"><label className="desk-search"><Search size={16} /><input placeholder="Search repositories…" aria-label="Search repositories" value={search} onChange={e => setSearch(e.target.value)} /></label><select className="desk-select" aria-label="Filter repositories" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All repositories</option><option value="attention">Needs attention</option><option value="github">GitHub scans</option><option value="demo">Sample data</option></select></div>}
    {filtered.length ? <div className="desk-table-wrap"><table className="desk-table"><thead><tr><th>Repository</th><th>Evidence score</th><th>Checks passed</th><th>Last scan</th><th aria-label="Open repository" /></tr></thead><tbody>{filtered.slice(0, compact ? 4 : undefined).map(scan => <tr key={scan.id}><td><Link className="desk-repo-cell" href={`/workspace/repositories/${scan.id}`}><span className="desk-repo-avatar"><Code2 size={19} /></span><span><strong>{scan.repo.fullName.split('/').at(-1)}</strong><small>{scan.repo.fullName.split('/')[0]} <span>·</span> {scan.repo.language || 'Unknown'}</small></span></Link></td><td><div className="desk-table-score"><Score value={scan.score} small /><div className="desk-mini-meter"><span style={{ width: `${scan.score ?? 0}%`, background: scan.score !== null && scan.score >= 80 ? 'var(--desk-green)' : 'var(--desk-yellow)' }} /></div></div></td><td><span className="desk-check-count"><CheckCheck size={14} />{scan.checks.filter(c => c.status === 'pass').length}<span>/ {scan.checks.length}</span></span><Source scan={scan} /></td><td><span className="desk-table-date" title={formatDate(scan.createdAt)}>{relativeTime(scan.createdAt)}</span></td><td><Link href={`/workspace/repositories/${scan.id}`} aria-label={`View ${scan.repo.fullName}`} className="desk-arrow-button"><ArrowUpRight size={18} /></Link></td></tr>)}</tbody></table></div> : <Empty title={latest.length ? 'No matching repositories' : 'Bring your first repository'} text={latest.length ? 'Try another name or change your filter.' : 'Start with a public GitHub URL. We turn repository signals into a focused release checklist.'} action={!latest.length && <button className="desk-button desk-button-yellow" onClick={onScan}><Plus size={15} />Scan a repository</button>} />}
  </section>;
}

function Overview({ workspace, onScan }: { workspace: Workspace; onScan: () => void }) {
  const latest = latestRepositories(workspace.scans);
  const scores = latest.map(s => s.score).filter((s): s is number => s !== null);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const allChecks = latest.flatMap(s => s.checks);
  const passed = allChecks.filter(c => c.status === 'pass').length;
  const open = workspace.tasks.filter(t => t.status !== 'done');
  const priorities = [...open].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority])).slice(0, 3);
  return <>
    <div className="desk-page-heading"><div><div className="desk-eyebrow"><span />YOUR RELEASE CONTROL ROOM</div><h1>A clear path to your next release<span>.</span></h1><p>See the signals. Review the gaps. Build your release evidence.</p></div><button className="desk-button desk-button-yellow" onClick={onScan}><Plus size={17} />Scan repository</button></div>
    <div className="desk-stat-grid">
      <div className="desk-stat"><div><span>Evidence score</span><ShieldCheck size={17} /></div><Score value={average} /><small><span className="desk-dot is-yellow" />Average across latest scans</small></div>
      <div className="desk-stat"><div><span>Tracked repositories</span><FolderGit2 size={17} /></div><strong>{latest.length}<span>repositories</span></strong><small>{workspace.scans.length} saved {workspace.scans.length === 1 ? 'snapshot' : 'snapshots'}</small></div>
      <div className="desk-stat"><div><span>Checks passing</span><CircleCheck size={17} /></div><strong>{passed}<span>/ {allChecks.length}</span></strong><small><span className="desk-dot is-green" />Verified from scan evidence</small></div>
      <div className="desk-stat"><div><span>Open fixes</span><ListChecks size={17} /></div><strong>{open.length}<span>to review</span></strong><small><span className="desk-dot is-red" />{open.filter(t => t.priority === 'high').length} high priority</small></div>
    </div>
    <div className="desk-overview-middle"><ScanChart scans={workspace.scans} /><section className="desk-panel desk-health-panel"><div className="desk-panel-head"><div><h2>Under the hood</h2><p>Your release signals, organized</p></div><div className="desk-icon-square"><Activity size={18} /></div></div><div className="desk-health-list">{(['Automation', 'Documentation', 'Release', 'Maintenance'] as const).map(category => {
      const checks = allChecks.filter(c => c.category === category), count = checks.filter(c => c.status === 'pass').length, Icon = categoryIcons[category];
      return <div key={category}><div className="desk-health-label"><span><Icon size={16} />{category}</span><strong>{count}<small> / {checks.length}</small></strong></div><div className="desk-health-meter"><span style={{ width: `${checks.length ? count / checks.length * 100 : 0}%` }} /></div></div>;
    })}</div><div className="desk-health-foot"><ShieldCheck size={15} /><span>A signal check. Always review your code.</span></div></section></div>
    <RepositoryTable scans={workspace.scans} onScan={onScan} compact />
    <div className="desk-bottom-grid"><section className="desk-panel"><div className="desk-panel-head"><div className="desk-inline-title"><h2>Next best moves</h2><span className="desk-count">{open.length}</span></div><Link href="/workspace/queue" className="desk-text-link">Open queue <ArrowUpRight size={15} /></Link></div>{priorities.length ? <div className="desk-next-list">{priorities.map(task => <Link key={task.id} href="/workspace/queue" className="desk-next-item"><span className={`desk-priority-dot desk-priority-${task.priority}`} /><div><strong>{task.title}</strong><small>{task.repoFullName}</small></div><span className={`desk-priority desk-priority-${task.priority}`}>{task.priority}</span><ChevronRight size={16} /></Link>)}</div> : <div className="desk-no-fixes"><CircleCheck size={25} /><span>{latest.length ? 'Your queue is clear. Nice work.' : 'Actionable fixes will appear after your first scan.'}</span></div>}</section><section className="desk-getting-started"><span className="desk-feature-kicker"><Sparkles size={15} />A BETTER RELEASE RITUAL</span><h2>From “looks good”<br />to “here’s the evidence.”</h2><p>Share a clear, portable report with your team. Source links keep the supporting context close.</p><Link className="desk-text-link" href="/workspace/reports">Create a release report <ArrowRight size={16} /></Link><div className="desk-feature-orbit" aria-hidden="true"><Box size={40} /></div></section></div>
  </>;
}

function RepositoryDetail({ scan, workspace, onScan, onRemove }: { scan: Scan; workspace: Workspace; onScan: (input?: string) => void; onRemove: (id: string) => void }) {
  const [category, setCategory] = useState('All checks');
  const [status, setStatus] = useState('all');
  const router = useRouter();
  const passed = scan.checks.filter(c => c.status === 'pass').length;
  const checks = scan.checks.filter(c => (category === 'All checks' || c.category === category) && (status === 'all' || c.status === status));
  const siblings = workspace.scans.filter(s => s.repo.fullName === scan.repo.fullName).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return <>
    <Link className="desk-back-link" href="/workspace/repositories"><ArrowLeft size={15} />All repositories</Link>
    <div className="desk-page-heading"><div><div className="desk-eyebrow"><Github size={14} />REPOSITORY INTELLIGENCE</div><h1>{scan.repo.fullName.split('/').at(-1)}<span>.</span></h1><p>{scan.repo.description || `Release signals for ${scan.repo.fullName}`}</p></div><div className="desk-button-group"><a href={scan.repo.url} target="_blank" rel="noreferrer" className="desk-button desk-button-outline"><Github size={16} />GitHub <ExternalLink size={13} /></a><button className="desk-button desk-button-yellow" onClick={() => onScan(scan.repo.fullName)}><RefreshCw size={16} />Scan again</button></div></div>
    <div className="desk-repo-summary desk-panel"><div className="desk-evidence-ring" style={{ '--score': `${(scan.score ?? 0) * 3.6}deg` } as React.CSSProperties}><div><strong>{scan.score ?? '—'}</strong><span>EVIDENCE</span></div></div><div className="desk-repo-summary-copy"><Source scan={scan} /><h2>{scan.score === null ? 'Some signals are unavailable' : scan.score >= 80 ? 'Strong results on the available checks' : scan.score >= 50 ? 'Review the remaining evidence gaps.' : 'Start with the gaps in this snapshot.'}</h2><p>{passed} of {scan.checks.length} checks passed · {scan.coverage}% evidence coverage</p><small>Scanned {snapshotTime(scan.createdAt)} · {scan.repo.defaultBranch} branch</small></div><div className="desk-repo-facts"><span><GitBranch size={15} />{scan.repo.language || 'Unknown language'}</span><span><Activity size={15} />{scan.repo.openIssues.toLocaleString()} open issues</span><span><Clock3 size={15} />Pushed {relativeTime(scan.repo.pushedAt)}</span></div></div>
    {scan.warnings.length > 0 && <div className="desk-notice"><CircleAlert size={18} /><div><strong>Some evidence needs a closer look</strong>{scan.warnings.map((warning, i) => <p key={i}>{warning}</p>)}</div></div>}
    {siblings.length > 1 && <div className="desk-snapshot-picker"><span><Clock3 size={15} />Viewing snapshot</span><select className="desk-select" aria-label="Select repository snapshot" value={scan.id} onChange={e => router.push(`/workspace/repositories/${e.target.value}`)}>{siblings.map(s => <option key={s.id} value={s.id}>{snapshotTime(s.createdAt)} · {s.score ?? '—'}/100 {s.source === 'demo' ? '(sample)' : ''}</option>)}</select></div>}
    <section className="desk-panel"><div className="desk-panel-head"><div><h2>Release checklist</h2><p>Observable repository signals, with a practical next step</p></div><select className="desk-select" aria-label="Filter check status" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option>{Object.entries(statusLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div><div className="desk-tabs">{['All checks', 'Automation', 'Documentation', 'Release', 'Maintenance'].map(cat => <button key={cat} className={category === cat ? 'is-active' : ''} onClick={() => setCategory(cat)}>{cat}</button>)}</div><div className="desk-check-list">{checks.length ? checks.map(check => <div className="desk-check-item" key={check.id}><span className={`desk-check-symbol desk-check-${check.status}`}>{check.status === 'pass' ? <Check size={18} /> : check.status === 'unknown' ? <HelpCircle size={18} /> : <CircleAlert size={18} />}</span><div className="desk-check-body"><div><h3>{check.title}</h3><Badge status={check.status} /></div><p>{check.description}</p>{check.status !== 'pass' && <div className="desk-recommendation"><ArrowRight size={14} /><span>{check.recommendation}</span></div>}<div className="desk-check-meta"><span>{check.category}</span>{check.evidenceUrl && <a href={check.evidenceUrl} target="_blank" rel="noreferrer">View evidence <ExternalLink size={12} /></a>}</div></div></div>) : <Empty icon={CheckCheck} title="No checks in this view" text="Try another category or status." />}</div></section>
    <div className="desk-bottom-grid"><section className="desk-panel"><div className="desk-panel-head"><h2>Recent workflow runs</h2><Zap size={17} /></div>{scan.workflows.length ? <div className="desk-activity-list">{scan.workflows.slice(0, 5).map(run => <a href={run.url} target="_blank" rel="noreferrer" key={run.id}><span className={`desk-dot ${run.conclusion === 'success' ? 'is-green' : run.conclusion === 'failure' ? 'is-red' : 'is-yellow'}`} /><div><strong>{run.name}</strong><small>{run.branch} · {relativeTime(run.createdAt)}</small></div><span className="desk-run-status">{run.conclusion ?? run.status}</span><ExternalLink size={13} /></a>)}</div> : <div className="desk-small-empty">No workflow runs were returned in this snapshot.</div>}</section><section className="desk-panel"><div className="desk-panel-head"><h2>Latest releases</h2><Box size={17} /></div>{scan.releases.length ? <div className="desk-activity-list">{scan.releases.slice(0, 5).map(release => <a href={release.url} target="_blank" rel="noreferrer" key={release.id}><span className="desk-icon-square"><Box size={15} /></span><div><strong>{release.name || release.tag}</strong><small>{release.tag} · {relativeTime(release.publishedAt)}</small></div><ExternalLink size={13} /></a>)}</div> : <div className="desk-small-empty">No published releases were returned in this snapshot.</div>}</section></div>
    <div className="desk-detail-footer"><p>The evidence score weights six repository checks. Unknown checks are excluded; coverage shows available evidence. It does not establish production readiness or replace a security audit.</p><button className="desk-text-link desk-danger-text" onClick={() => { if (window.confirm('Delete this saved scan and its associated fixes? This cannot be undone.')) { onRemove(scan.id); router.push('/workspace/repositories'); } }}><Trash2 size={14} />Delete snapshot</button></div>
  </>;
}

function Queue({ workspace, updateTask }: { workspace: Workspace; updateTask: (id: string, patch: Partial<FixTask>) => void }) {
  const [filter, setFilter] = useState('all');
  const [priority, setPriority] = useState('all');
  const [search, setSearch] = useState('');
  const filtered = workspace.tasks.filter(t => (filter === 'all' || t.status === filter) && (priority === 'all' || t.priority === priority) && `${t.title} ${t.repoFullName}`.toLowerCase().includes(search.toLowerCase()));
  const done = workspace.tasks.filter(t => t.status === 'done').length;
  return <>
    <div className="desk-page-heading"><div><div className="desk-eyebrow"><ListChecks size={14} />LESS NOISE. MORE PROGRESS.</div><h1>Make your next move<span>.</span></h1><p>A focused fix queue, backed by repository evidence.</p></div><div className="desk-completion"><CircleCheck size={20} /><strong>{done}<span> / {workspace.tasks.length} complete</span></strong></div></div>
    <section className="desk-panel"><div className="desk-tabs desk-queue-tabs">{[['all', 'All fixes'], ['todo', 'To do'], ['in_progress', 'In progress'], ['done', 'Done']].map(([key, label]) => <button key={key} className={filter === key ? 'is-active' : ''} onClick={() => setFilter(key)}>{label}<span>{workspace.tasks.filter(t => key === 'all' || t.status === key).length}</span></button>)}</div><div className="desk-table-tools"><label className="desk-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search fixes" placeholder="Search fixes or repositories…" /></label><select aria-label="Filter by priority" className="desk-select" value={priority} onChange={e => setPriority(e.target.value)}><option value="all">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select></div>
      {filtered.length ? <div className="desk-queue-list">{filtered.map(task => {
        const scan = workspace.scans.find(s => s.id === task.scanId), check = scan?.checks.find(c => c.id === task.checkId);
        return <article className={`desk-task ${task.status === 'done' ? 'is-done' : ''}`} key={task.id}><button className="desk-task-checkbox" aria-label={task.status === 'done' ? `Reopen ${task.title}` : `Mark ${task.title} done`} onClick={() => updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}>{task.status === 'done' && <Check size={15} />}</button><div className="desk-task-content"><div className="desk-task-title"><h3>{task.title}</h3><span className={`desk-priority desk-priority-${task.priority}`}>{task.priority}</span></div><Link className="desk-task-repo" href={`/workspace/repositories/${task.scanId}`}><FolderGit2 size={13} />{task.repoFullName}{scan?.source === 'demo' && <span>Sample</span>}</Link>{check && <p>{check.recommendation}</p>}<label className="desk-task-notes-label">Your notes<textarea key={`${task.id}-notes`} defaultValue={task.notes} maxLength={5000} placeholder="Add implementation notes, context, or a pull request URL…" onBlur={e => { if (e.target.value !== task.notes) updateTask(task.id, { notes: e.target.value }); }} rows={2} /></label><small className="desk-autosave">Notes save when you leave the field.</small></div><select className={`desk-select desk-task-select ${task.status === 'done' ? 'is-done' : ''}`} aria-label={`Status of ${task.title}`} value={task.status} onChange={e => updateTask(task.id, { status: e.target.value as TaskStatus })}>{Object.entries(taskLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></article>;
      })}</div> : <Empty icon={ListChecks} title={workspace.tasks.length ? 'Nothing here. A little breathing room.' : 'Your fix queue starts with a scan'} text={workspace.tasks.length ? 'Try another status, priority, or search term.' : 'Checks that need attention become actionable tasks you can track here.'} action={!workspace.tasks.length && <Link href="/workspace/repositories" className="desk-button desk-button-yellow">Go to repositories <ArrowRight size={15} /></Link>} />}
    </section><div className="desk-inline-note"><LockKeyhole size={14} />Task statuses and notes stay in this browser. Marking a task done does not change its repository score; scan again to verify.</div>
  </>;
}

function Reports({ workspace }: { workspace: Workspace }) {
  const repositories = latestRepositories(workspace.scans);
  const [selected, setSelected] = useState(repositories[0]?.repo.fullName ?? '');
  const [notice, setNotice] = useState('');
  const history = workspace.scans.filter(s => s.repo.fullName === selected).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const latest = history[0], previous = history[1];
  function exportReport(type: 'markdown' | 'json') {
    if (!latest) return;
    const name = `${latest.repo.fullName.replace('/', '-')}-evidence-${latest.createdAt.slice(0, 10)}`;
    if (type === 'markdown') downloadText(`${name}.md`, exportMarkdown(latest), 'text/markdown');
    else downloadText(`${name}.json`, JSON.stringify(latest, null, 2), 'application/json');
    setNotice(`${type === 'markdown' ? 'Markdown report' : 'Snapshot JSON'} exported.`);
  }
  return <>
    <div className="desk-page-heading"><div><div className="desk-eyebrow"><FileText size={14} />BRING THE EVIDENCE</div><h1>Ready for the handoff<span>.</span></h1><p>A clear view of what changed, and a report you can take anywhere.</p></div>{latest && <button className="desk-button desk-button-yellow" onClick={() => exportReport('markdown')}><Download size={16} />Export report</button>}</div>
    {!latest ? <section className="desk-panel"><Empty icon={FileText} title="Your first report is one scan away" text="Scan a public repository to create an evidence report with source links and recommended fixes." action={<Link className="desk-button desk-button-yellow" href="/workspace/repositories">Explore repositories <ArrowRight size={15} /></Link>} /></section> : <>
      <div className="desk-report-toolbar"><label>Repository <select className="desk-select" value={selected} onChange={e => setSelected(e.target.value)}>{repositories.map(s => <option key={s.repo.fullName}>{s.repo.fullName}</option>)}</select></label><span>{history.length} saved {history.length === 1 ? 'snapshot' : 'snapshots'}</span></div>
      <div className="desk-report-layout"><section className="desk-panel desk-report-cover"><div className="desk-report-brand"><span className="desk-brand-mark"><i /><i /><i /></span>ReleaseDesk<span>RELEASE BRIEF</span></div><Source scan={latest} /><h2>{latest.repo.fullName}</h2><p>Repository evidence report</p><div className="desk-report-score"><Score value={latest.score} /><span>Weighted evidence score</span></div><div className="desk-report-metrics"><div><strong>{latest.checks.filter(c => c.status === 'pass').length}/{latest.checks.length}</strong><span>Checks passed</span></div><div><strong>{latest.coverage}%</strong><span>Evidence coverage</span></div><div><strong>{latest.checks.filter(c => c.status === 'fail' || c.status === 'warn').length}</strong><span>Needs attention</span></div></div><div className="desk-report-bottom"><span>Snapshot · {snapshotTime(latest.createdAt)}</span><ShieldCheck size={20} /></div></section><section className="desk-panel desk-export-panel"><div className="desk-panel-head"><div><h2>Built to be shared</h2><p>Your findings. Your format.</p></div></div><button className="desk-export-option" onClick={() => exportReport('markdown')}><span className="desk-export-icon"><FileText size={22} /></span><div><strong>Markdown report</strong><p>Findings, evidence links, and next steps.<br />Ready for a pull request or team doc.</p></div><ArrowDownToLine size={18} /></button><button className="desk-export-option" onClick={() => exportReport('json')}><span className="desk-export-icon"><FileJson size={22} /></span><div><strong>Snapshot JSON</strong><p>Structured data from this exact scan.<br />Use it in your own tools and workflows.</p></div><ArrowDownToLine size={18} /></button><div className="desk-export-note"><LockKeyhole size={17} /><p>Exports are generated in your browser. They include no API keys or account credentials.</p></div>{notice && <div className="desk-success" role="status"><Check size={15} />{notice}</div>}</section></div>
      <section className="desk-panel"><div className="desk-panel-head"><div><h2>What changed?</h2><p>{previous ? 'Your two most recent snapshots, side by side' : 'Scan this repository again to compare your progress'}</p></div>{previous && latest.score !== null && previous.score !== null && <span className={`desk-delta ${latest.score - previous.score >= 0 ? 'is-green' : 'is-red'}`}>{latest.score - previous.score > 0 ? '+' : ''}{latest.score - previous.score} points</span>}</div>{previous ? <div className="desk-table-wrap"><table className="desk-table desk-comparison"><thead><tr><th>Signal</th><th>Previous <small>{snapshotTime(previous.createdAt)}</small></th><th>Latest <small>{snapshotTime(latest.createdAt)}</small></th></tr></thead><tbody>{latest.checks.map(check => <tr key={check.id}><td>{check.title}</td><td>{previous.checks.find(c => c.id === check.id) ? <Badge status={previous.checks.find(c => c.id === check.id)!.status} /> : <span className="desk-muted">Not in snapshot</span>}</td><td><Badge status={check.status} /></td></tr>)}</tbody></table></div> : <div className="desk-comparison-empty"><GitBranch size={28} /><div><h3>One snapshot is a baseline. Two tell a story.</h3><p>Make a change, run a new scan, and see exactly which signals improved.</p></div><Link href={`/workspace/repositories/${latest.id}`} className="desk-button desk-button-outline">View repository <ArrowUpRight size={15} /></Link></div>}</section>
    </>}
  </>;
}

function Integrations({ workspace, importWorkspace, onScan }: { workspace: Workspace; importWorkspace: (data: unknown) => void; onScan: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  async function importFile(file: File | undefined) {
    if (!file) return;
    setError(''); setNotice('');
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Choose a JSON backup smaller than 5 MB.');
      const data: unknown = JSON.parse(await file.text());
      if (!window.confirm('Import this backup? It will replace the workspace currently saved in this browser. Export a backup first if you want to keep it.')) return;
      importWorkspace(data); setNotice('Workspace imported successfully.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not import this backup.'); }
    if (fileRef.current) fileRef.current.value = '';
  }
  return <>
    <div className="desk-page-heading"><div><div className="desk-eyebrow"><Link2 size={14} />YOUR TOOLS. ONE CLEAR PICTURE.</div><h1>Connect the dots<span>.</span></h1><p>Start with public GitHub evidence. Keep your workspace portable.</p></div></div>
    <div className="desk-integration-grid"><section className="desk-panel desk-integration-card"><div className="desk-integration-top"><div className="desk-integration-logo"><Github size={30} /></div><span className="desk-status desk-status-pass"><span className="desk-dot is-green" />Available</span></div><h2>GitHub public repositories</h2><p>Read repository metadata, workflows, releases, and recent commits. Turn observable signals into an actionable checklist.</p><div className="desk-integration-details"><span><Check size={14} />No account connection required</span><span><Check size={14} />Read-only public API access</span><span><Check size={14} />Source links for available evidence</span></div><button className="desk-button desk-button-yellow" onClick={onScan}><Plus size={16} />Scan a public repository</button><small>Public API rate limits apply. Private repositories are not supported.</small></section><section className="desk-panel desk-integration-card"><div className="desk-integration-top"><div className="desk-integration-logo desk-yellow-icon"><FileJson size={28} /></div><span className="desk-status desk-status-pass">Available</span></div><h2>Your workspace, anywhere</h2><p>Export a complete JSON backup with saved scans, tasks, and notes. Import it on another browser to pick up where you left off.</p><div className="desk-backup-preview"><span><FolderGit2 size={17} />{latestRepositories(workspace.scans).length} repositories</span><span><ListChecks size={17} />{workspace.tasks.length} tracked fixes</span><span><Activity size={17} />{workspace.scans.length} snapshots</span></div><div className="desk-button-group"><button className="desk-button desk-button-outline" onClick={() => { downloadText(`releasedesk-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(workspace, null, 2), 'application/json'); setNotice('Workspace backup exported.'); }}><Download size={16} />Export backup</button><button className="desk-button desk-button-outline" onClick={() => fileRef.current?.click()}><Upload size={16} />Import JSON</button><input ref={fileRef} type="file" accept="application/json,.json" className="desk-sr-only" aria-label="Import workspace JSON backup" onChange={e => void importFile(e.target.files?.[0])} /></div><small>Importing replaces this browser’s workspace after confirmation.</small></section></div>
    {notice && <div className="desk-success" role="status"><Check size={16} />{notice}</div>}{error && <div className="desk-error" role="alert"><CircleAlert size={16} />{error}</div>}
    <div className="desk-section-intro"><h2>A connected release workflow</h2><p>Ideas for what comes next. These integrations are not available yet.</p></div><div className="desk-planned-grid">{[{ icon: Terminal, name: 'CI provider webhooks', text: 'Automatically refresh evidence when your pipeline completes.' }, { icon: ListChecks, name: 'Issue tracker sync', text: 'Bring release fixes into the place your team already plans.' }, { icon: LockKeyhole, name: 'Private repositories', text: 'Authenticated access for teams working behind closed doors.' }].map(item => <section className="desk-panel desk-planned-card" key={item.name}><item.icon size={23} /><span>Planned</span><h3>{item.name}</h3><p>{item.text}</p></section>)}</div>
  </>;
}

function Settings({ workspace, rename, reset }: { workspace: Workspace; rename: (name: string) => void; reset: () => boolean }) {
  const [name, setName] = useState(workspace.name);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  return <>
    <div className="desk-page-heading"><div><div className="desk-eyebrow"><Settings2 size={14} />MAKE ROOM FOR GOOD WORK</div><h1>Your workspace<span>.</span></h1><p>A few simple settings. Everything stays under your control.</p></div></div>
    <section className="desk-panel desk-settings-panel"><div className="desk-panel-head"><div><h2>Workspace details</h2><p>Give this browser’s workspace a recognizable name.</p></div></div><form onSubmit={e => { e.preventDefault(); if (name.trim()) { rename(name.trim()); setSaved(true); } }}><label className="desk-field">Workspace name<input value={name} onChange={e => { setName(e.target.value); setSaved(false); }} maxLength={60} required placeholder="My release workspace" /></label><div className="desk-settings-meta"><span>Your focus</span><strong>{workspace.role}</strong></div><div className="desk-settings-form-footer"><button className="desk-button desk-button-yellow" type="submit" disabled={!name.trim()}>Save changes</button>{saved && <span role="status"><Check size={15} />Saved locally</span>}</div></form></section>
    <section className="desk-panel desk-settings-panel"><div className="desk-panel-head"><div><h2>Storage & privacy</h2><p>A local-first workspace, by design.</p></div><LockKeyhole size={20} /></div><div className="desk-storage-info"><div><span>Workspace storage</span><strong>This browser · localStorage</strong></div><div><span>GitHub access</span><strong>Public repositories · read only</strong></div><div><span>Accounts & billing</span><strong>No account or subscription required</strong></div></div><p className="desk-storage-note">Clearing browser data can remove your workspace. Export a JSON backup to keep a copy of your scans, tasks, and notes.</p><Link href="/workspace/integrations" className="desk-button desk-button-outline"><Download size={15} />Manage backups</Link></section>
    <section className="desk-panel desk-settings-panel desk-danger-zone"><div><h2>Reset this workspace</h2><p>Remove all saved scans, fixes, and notes from this browser. Export a backup before resetting.</p></div><button className="desk-button desk-button-danger" onClick={() => { if (window.confirm('Delete this local workspace and every saved scan, task, and note? This cannot be undone without an exported backup.')) { if (reset()) router.push('/onboarding'); } }}><Trash2 size={15} />Reset workspace</button></section>
  </>;
}

export default function Dashboard() {
  const { workspace, ready, scanning, error, scanRepository, create, updateTask, rename, removeScan, reset, importWorkspace } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [repoInput, setRepoInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentNav = navigation.find(n => n.href !== '/workspace' && pathname.startsWith(n.href));
  const currentLabel = pathname.startsWith('/workspace/settings') ? 'Settings' : currentNav?.label ?? 'Overview';
  const isSample = Boolean(workspace?.scans.length && workspace.scans.every(s => s.source === 'demo'));
  const openCount = workspace?.tasks.filter(t => t.status !== 'done').length ?? 0;
  const detailId = pathname.startsWith('/workspace/repositories/') ? decodeURIComponent(pathname.split('/')[3]) : null;
  const detail = detailId ? workspace?.scans.find(s => s.id === detailId) : null;

  useEffect(() => { setSidebarOpen(false); }, [pathname]);
  useEffect(() => {
    if (!scanOpen && !showGuide && !sidebarOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const modal = scanOpen || showGuide ? dialogRef.current : document.querySelector<HTMLElement>('.desk-sidebar');
    (scanOpen ? inputRef.current : modal?.querySelector<HTMLElement>('button, a, input'))?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !scanning) { setScanOpen(false); setShowGuide(false); setSidebarOpen(false); }
      if (event.key === 'Tab' && modal) {
        const focusable = Array.from(modal.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')).filter(el => el.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [scanOpen, showGuide, sidebarOpen, scanning]);

  function openScan(input = '') { setRepoInput(input); setScanError(''); setScanOpen(true); }
  async function submitScan(event: React.FormEvent) {
    event.preventDefault(); setScanError('');
    try { const scan = await scanRepository(repoInput.trim()); setScanOpen(false); router.push(`/workspace/repositories/${scan.id}`); }
    catch (err) { setScanError(err instanceof Error ? err.message : 'The scan could not complete. Try again.'); }
  }

  if (!ready) return <div className="desk-loading"><span className="desk-brand-mark"><i /><i /><i /></span><Loader2 className="desk-spin" size={20} /><p>Opening your workspace…</p></div>;
  if (!workspace) return <main id="main-content" className="desk-welcome"><Link href="/" className="desk-brand"><span className="desk-brand-mark"><i /><i /><i /></span>ReleaseDesk</Link><div className="desk-welcome-card"><div className="desk-empty-icon"><FolderGit2 size={30} /></div><div className="desk-eyebrow">LESS GUESSWORK. BETTER RELEASES.</div><h1>Your next release<br />starts here<span>.</span></h1><p>Create a workspace to scan a public GitHub repository, or explore a clearly labeled sample first.</p><Link href="/onboarding" className="desk-button desk-button-yellow">Create your workspace <ArrowRight size={17} /></Link><button className="desk-button desk-button-outline" onClick={() => create('Sample workspace', 'Solo builder', true)}>Explore sample workspace</button><small><LockKeyhole size={13} />Local to this browser. No account required.</small></div></main>;

  return <div className="desk-shell">
    {sidebarOpen && <button className="desk-sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className={`desk-sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Workspace navigation"><div className="desk-sidebar-brand"><Link href="/" className="desk-brand"><span className="desk-brand-mark"><i /><i /><i /></span>ReleaseDesk<span className="desk-beta">BETA</span></Link><button className="desk-mobile-close desk-icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>
      <Link href="/workspace/settings" className="desk-workspace-switch"><span className="desk-workspace-avatar">{workspace.name.charAt(0).toUpperCase()}</span><span><strong>{workspace.name}</strong><small>{isSample ? 'Sample workspace' : 'Personal workspace'}</small></span><ChevronDown size={15} /></Link>
      <div className="desk-nav-label">WORKSPACE</div><nav>{navigation.map(item => { const active = item.href === '/workspace' ? pathname === '/workspace' : pathname.startsWith(item.href); return <Link key={item.href} className={`desk-nav-item ${active ? 'is-active' : ''}`} href={item.href}><item.icon size={18} /><span>{item.label}</span>{item.label === 'Fix queue' && openCount > 0 && <small>{openCount}</small>}{active && <span className="desk-nav-active-dot" />}</Link>; })}</nav>
      <div className="desk-sidebar-bottom"><div className="desk-local-card"><div><span className="desk-dot is-green" /><strong>Your data. Your browser.</strong></div><p>Local storage. Portable backups.<br />A workspace you control.</p><Link href="/workspace/integrations">Manage backups <ArrowUpRight size={13} /></Link></div><Link className={`desk-nav-item ${pathname.startsWith('/workspace/settings') ? 'is-active' : ''}`} href="/workspace/settings"><Settings2 size={18} />Settings</Link><button className="desk-nav-item" onClick={() => { setSidebarOpen(false); setShowGuide(true); }}><HelpCircle size={18} />Quick guide<ArrowUpRight size={14} /></button><div className="desk-sidebar-footer"><span className="desk-dot is-green" />Workspace saved locally<span>v0.1</span></div></div>
    </aside>
    <div className="desk-main-shell"><header className="desk-topbar"><div><button className="desk-mobile-menu desk-icon-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><Link href="/workspace" className="desk-breadcrumb-root">Workspace</Link><ChevronRight size={13} /><span>{currentLabel}</span>{detail && <><ChevronRight size={13} /><span className="desk-breadcrumb-repo">{detail.repo.fullName.split('/').at(-1)}</span></>}</div><div className="desk-topbar-actions">{isSample && <span className="desk-sample-pill"><Sparkles size={12} />Sample workspace</span>}<span className="desk-local-pill" title="Stored in this browser, without account synchronization"><span />Local workspace</span><button className="desk-icon-button" aria-label="Open quick guide" onClick={() => setShowGuide(true)}><HelpCircle size={19} /></button><Link href="/workspace/settings" className="desk-profile" aria-label="Workspace settings">{workspace.name.charAt(0).toUpperCase()}</Link></div></header>
      <main id="main-content" className="desk-main">
        {error && !scanOpen && <div className="desk-error" role="alert"><CircleAlert size={16} /><span>{error}</span></div>}
        {isSample && <div className="desk-sample-banner"><Sparkles size={15} /><span>You’re exploring sample data. See what your own repository reveals.</span><button onClick={() => openScan()}>Scan your repository <ArrowRight size={14} /></button></div>}
        {currentLabel === 'Overview' && <Overview workspace={workspace} onScan={() => openScan()} />}
        {currentLabel === 'Repositories' && (detailId ? detail ? <RepositoryDetail scan={detail} workspace={workspace} onScan={openScan} onRemove={removeScan} /> : <section className="desk-panel"><Empty title="This snapshot isn’t in your workspace" text="It may have been deleted, or may belong to a different browser’s workspace." action={<Link href="/workspace/repositories" className="desk-button desk-button-yellow">All repositories</Link>} /></section> : <><div className="desk-page-heading"><div><div className="desk-eyebrow"><FolderGit2 size={14} />A HOME FOR EVERY RELEASE</div><h1>Your repositories, in focus<span>.</span></h1><p>One clear view of observed release signals across your repositories.</p></div></div><RepositoryTable scans={workspace.scans} onScan={() => openScan()} /></>)}
        {currentLabel === 'Fix queue' && <Queue workspace={workspace} updateTask={updateTask} />}
        {currentLabel === 'Reports' && <Reports workspace={workspace} />}
        {currentLabel === 'Integrations' && <Integrations workspace={workspace} importWorkspace={importWorkspace} onScan={() => openScan()} />}
        {currentLabel === 'Settings' && <Settings workspace={workspace} rename={rename} reset={reset} />}
        <footer className="desk-page-footer"><span>Built for the last mile before you ship.</span><span><span className="desk-dot is-green" />Your work stays yours.</span></footer>
      </main>
    </div>
    {(scanOpen || showGuide) && <div className="desk-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !scanning) { setScanOpen(false); setShowGuide(false); } }}><div className="desk-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="desk-modal-title"><button className="desk-modal-close desk-icon-button" aria-label="Close dialog" disabled={scanning} onClick={() => { setScanOpen(false); setShowGuide(false); }}><X size={20} /></button>{scanOpen ? <><div className="desk-modal-icon"><Github size={29} /></div><div className="desk-eyebrow">LET’S COLLECT THE EVIDENCE</div><h2 id="desk-modal-title">Bring your repository.</h2><p>Get a release checklist from real public GitHub evidence. No account connection needed.</p><form onSubmit={submitScan}><label className="desk-field">Public GitHub repository<input ref={inputRef} autoComplete="off" spellCheck={false} placeholder="https://github.com/owner/repository" value={repoInput} onChange={e => setRepoInput(e.target.value)} required disabled={scanning} /><small>Paste a GitHub URL or owner/repository.</small></label>{(scanError || error) && <div className="desk-error" role="alert"><CircleAlert size={16} /><span>{scanError || error}</span></div>}<button type="submit" className="desk-button desk-button-yellow desk-full" disabled={scanning || !repoInput.trim()}>{scanning ? <><Loader2 className="desk-spin" size={17} />Reading repository signals…</> : <><Zap size={17} />Run evidence scan <ArrowRight size={16} /></>}</button>{scanning && <p className="desk-scan-progress" role="status">Checking metadata, documentation, workflows, releases, and recent activity. This can take a moment.</p>}</form><div className="desk-modal-foot"><LockKeyhole size={14} /><span>Read only. Public repositories. Results saved in this browser.</span></div></> : <><div className="desk-modal-icon"><BookOpen size={27} /></div><div className="desk-eyebrow">YOUR FIVE-MINUTE GUIDE</div><h2 id="desk-modal-title">A little clarity goes a long way.</h2><p>ReleaseDesk turns public repository signals into a repeatable release ritual.</p><ol className="desk-guide-steps"><li><span>01</span><div><h3>Scan a repository</h3><p>Paste a public GitHub URL. We inspect six repository signals across four release categories.</p></div></li><li><span>02</span><div><h3>Work the fix queue</h3><p>Review recommendations, track progress, and add notes. Evidence links let you verify the findings.</p></div></li><li><span>03</span><div><h3>Scan again. Show the change.</h3><p>Compare snapshots, then export your report as Markdown or JSON.</p></div></li></ol><div className="desk-guide-note"><CircleAlert size={17} /><p>This is a repository signal check, not a security audit. Sample data is labeled. Data stays in this browser until you export it.</p></div><button className="desk-button desk-button-yellow desk-full" onClick={() => { setShowGuide(false); openScan(); }}>Scan a repository <ArrowRight size={16} /></button></>}</div></div>}
  </div>;
}
