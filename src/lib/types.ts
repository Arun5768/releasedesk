export type CheckStatus = 'pass' | 'warn' | 'fail' | 'unknown';
export type CheckCategory = 'Automation' | 'Documentation' | 'Release' | 'Maintenance';
export interface EvidenceCheck {
  id: string;
  title: string;
  description: string;
  status: CheckStatus;
  category: CheckCategory;
  evidenceUrl?: string;
  recommendation: string;
  weight: number;
}
export interface Repository {
  id: string;
  fullName: string;
  description: string;
  url: string;
  defaultBranch: string;
  language: string;
  stars: number;
  forks: number;
  openIssues: number;
  pushedAt: string;
  archived: boolean;
}
export interface Workflow {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  url: string;
  createdAt: string;
  branch: string;
}
export interface Release {
  id: number;
  name: string;
  tag: string;
  publishedAt: string;
  url: string;
  prerelease: boolean;
}
export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}
export interface Scan {
  id: string;
  repo: Repository;
  createdAt: string;
  checks: EvidenceCheck[];
  score: number | null;
  coverage: number;
  workflows: Workflow[];
  releases: Release[];
  commits: Commit[];
  warnings: string[];
  source: 'github' | 'demo';
}
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export interface FixTask {
  id: string;
  scanId: string;
  checkId: string;
  title: string;
  repoFullName: string;
  status: TaskStatus;
  priority: 'high' | 'medium' | 'low';
  notes: string;
}
export interface Workspace {
  version: 1;
  name: string;
  role: string;
  scans: Scan[];
  tasks: FixTask[];
}
