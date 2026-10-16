'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { FixTask, Scan, Workspace } from '@/lib/types';
import { addScan, createWorkspace, demoWorkspace, STORAGE_KEY, validateWorkspace } from '@/lib/storage';
interface Context {
  workspace: Workspace | null; ready: boolean; scanning: boolean; error: string | null;
  create(name: string, role: string, demo?: boolean): void;
  scanRepository(input: string, options?: { save?: boolean }): Promise<Scan>;
  saveScan(scan: Scan): void;
  updateTask(id: string, patch: Partial<FixTask>): void;
  rename(name: string): void; removeScan(id: string): void; reset(): boolean; importWorkspace(data: unknown): void;
}
const WorkspaceContext = createContext<Context | null>(null);
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const ref = useRef<Workspace | null>(null);
  const scanLock = useRef(false);
  const generation = useRef(0);
  const [ready, setReady] = useState(false); const [scanning, setScanning] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { const data = validateWorkspace(JSON.parse(saved)); ref.current = data; setWorkspace(data); } }
    catch { setError('The saved workspace could not be loaded. You can create a new workspace or restore a valid backup.'); }
    setReady(true);
  }, []);
  const persist = useCallback((next: Workspace, requireDurable = false) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setError(null); }
    catch {
      const message = requireDurable ? 'Import could not be saved because browser storage is full or unavailable. Your existing workspace was kept.' : 'Browser storage is full or unavailable. Export a backup before closing this page.';
      setError(message);
      if (requireDurable) throw new Error(message);
    }
    ref.current = next; setWorkspace(next);
  }, []);
  const create = useCallback((name: string, role: string, demo = false) => { generation.current += 1; persist(demo ? demoWorkspace(name, role) : createWorkspace(name, role)); }, [persist]);
  const saveScan = useCallback((scan: Scan) => { persist(addScan(ref.current || createWorkspace('My workspace','Independent builder'), scan)); }, [persist]);
  const scanRepository = useCallback(async (repository: string, options?: { save?: boolean }): Promise<Scan> => {
    if (scanLock.current) throw new Error('A scan is already running.');
    scanLock.current = true; setScanning(true); setError(null);
    const startedAt = generation.current;
    try {
      const response = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repository }), signal: AbortSignal.timeout(30000) });
      const body = await response.json();
      if (startedAt !== generation.current) throw new Error('Scan cancelled because the workspace changed.');
      if (!response.ok) throw new Error(`${body.error || 'Scan failed.'}${body.retryAt ? ` Reset: ${new Date(body.retryAt).toLocaleTimeString()}.` : ''}`);
      const scan = validateWorkspace({ ...createWorkspace('validation',''), scans: [body.scan] }).scans[0];
      if (options?.save !== false) saveScan(scan); return scan;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The scan could not finish.'; if (startedAt === generation.current) setError(message); throw new Error(message);
    } finally { scanLock.current = false; setScanning(false); }
  }, [saveScan]);
  const updateTask = useCallback((id: string, patch: Partial<FixTask>) => { if (ref.current) persist({ ...ref.current, tasks: ref.current.tasks.map(t => t.id === id ? { ...t, ...(patch.status ? { status: patch.status } : {}), ...(patch.notes !== undefined ? { notes: patch.notes.slice(0, 5000) } : {}) } : t) }); }, [persist]);
  const rename = useCallback((name: string) => { if (ref.current && name.trim()) persist({ ...ref.current, name: name.trim().slice(0,80) }); }, [persist]);
  const removeScan = useCallback((id: string) => { if (ref.current) persist({ ...ref.current, scans: ref.current.scans.filter(s => s.id !== id), tasks: ref.current.tasks.filter(t => t.scanId !== id) }); }, [persist]);
  const reset = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); }
    catch { setError('Browser storage is unavailable. The workspace could not be reset.'); return false; }
    generation.current += 1; ref.current = null; setWorkspace(null); setError(null); return true;
  }, []);
  const importWorkspace = useCallback((data: unknown) => { const next = validateWorkspace(data); persist(next, true); generation.current += 1; }, [persist]);
  return <WorkspaceContext.Provider value={{ workspace, ready, scanning, error, create, saveScan, scanRepository, updateTask, rename, removeScan, reset, importWorkspace }}>{children}</WorkspaceContext.Provider>;
}
export function useWorkspace() { const context = useContext(WorkspaceContext); if (!context) throw new Error('WorkspaceProvider is required.'); return context; }
