import type { Scan } from './types';
export function formatDate(date: string): string { return new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }); }
export function relativeTime(date: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  return minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
}
export function downloadText(filename: string, text: string, mimeType = 'text/plain'): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const escape = (value: string) => value.replace(/[\[\]<>\\`*_]/g, c => `\\${c}`).replace(/\r?\n/g, ' ');
export function exportMarkdown(scan: Scan): string {
  return `# ReleaseDesk · ${escape(scan.repo.fullName)}\n\n${scan.source === 'demo' ? '**SAMPLE DATA — illustrative, not a live repository scan.**\n\n' : ''}Scanned: ${scan.createdAt}\n\nEvidence score: ${scan.score ?? 'Unknown'}/100 · Evidence coverage: ${scan.coverage}%\n\nRepository: ${scan.repo.url}\n\nThis report checks observable release-preparation signals. It is not a security audit or a guarantee of production readiness.\n\n## Evidence\n\n${scan.checks.map(c => `### ${escape(c.title)} — ${c.status.toUpperCase()}\n\n${escape(c.description)}\n\nNext step: ${escape(c.recommendation)}${c.evidenceUrl ? `\n\nEvidence: ${c.evidenceUrl}` : ''}`).join('\n\n')}\n\n## Limitations\n\nScores award full weight for pass, half for attention, and zero for fail. Unknown checks are excluded; coverage shows the share of weighted evidence available. Workflow results reflect recent observed runs, not every workflow or release commit.\n${scan.warnings.map(w => `\n- ${escape(w)}`).join('')}\n`;
}
