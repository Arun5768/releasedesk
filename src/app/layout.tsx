import type { Metadata } from 'next';
import { WorkspaceProvider } from '@/components/workspace-provider';
import './globals.css';
export const metadata: Metadata = { title: { default: 'ReleaseDesk — Ship with evidence', template: '%s · ReleaseDesk' }, description: 'Turn public GitHub signals into a clear release checklist, fix queue, and shareable handoff report.', icons: { icon: '/icon.svg' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body><a className="skip-link" href="#main-content">Skip to content</a><WorkspaceProvider>{children}</WorkspaceProvider></body></html>;
}
