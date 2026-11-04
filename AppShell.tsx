import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Compass, GraduationCap, LayoutDashboard, ListTodo, LogOut, Map, MoreHorizontal, Plus, Settings2, Sparkles, Target } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { Button, IconButton } from '../components/ui';
import { ErrorBanner } from '../components/Feedback';
import { useWorkspace } from '../state/WorkspaceContext';
import { greetingName } from '../lib/format';

const navItems = [
  { label: 'Today', to: '/', icon: LayoutDashboard },
  { label: 'Habits', to: '/habits', icon: Sparkles },
  { label: 'Tasks', to: '/tasks', icon: ListTodo },
  { label: 'Goals', to: '/goals', icon: Target },
  { label: 'Roadmap', to: '/roadmap', icon: Map },
  { label: 'Learning', to: '/courses', icon: GraduationCap },
];
const titles: Record<string, string> = { '/': 'Today', '/habits': 'Habits', '/tasks': 'Tasks', '/goals': 'Goals', '/roadmap': 'Roadmap', '/courses': 'Learning', '/settings': 'Settings' };

export function AppShell({ children, workspaceError, onRetry }: { children: ReactNode; workspaceError: string | null; onRetry: () => void }) {
  const { auth, workspace, signOut } = useWorkspace();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const currentTitle = location.pathname.startsWith('/courses/') ? 'Course detail' : (titles[location.pathname] ?? 'Today');
  useEffect(() => {
    const root = document.documentElement;
    const theme = workspace.preferences.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : workspace.preferences.theme;
    root.dataset.theme = theme;
  }, [workspace.preferences.theme]);

  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand"><Link to="/" aria-label="Setlifest home"><BrandMark compact={collapsed} /></Link><IconButton label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={() => setCollapsed((value) => !value)} className="sidebar-collapse">{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</IconButton></div>
      <div className="sidebar-section"><span className="sidebar-caption">YOUR SPACE</span><nav className="nav-list">{navItems.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`} title={collapsed ? label : undefined}><Icon size={18} strokeWidth={1.75} /><span>{label}</span>{!collapsed && to === '/' && <span className="nav-bullet" />}</NavLink>)}</nav></div>
      <div className="sidebar-bottom"><div className="sidebar-divider" /><NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`} title={collapsed ? 'Settings' : undefined}><Settings2 size={18} /><span>Settings</span></NavLink><div className="sidebar-note"><span className="sidebar-note-mark"><Compass size={15} /></span>{!collapsed && <span>One day at a time.<br /><b>On your terms.</b></span>}</div></div>
    </aside>
    <div className="workspace-frame">
      <header className="topbar">
        <div className="mobile-brand"><Link to="/" aria-label="Setlifest home"><BrandMark compact /></Link><span>setlifest</span></div>
        <div className="topbar-context"><span className="crumb-muted">Workspace</span><ChevronRight size={14} /><span>{currentTitle}</span></div>
        <div className="topbar-actions">
          <div className="quick-wrap"><Button variant="secondary" size="sm" onClick={() => setQuickOpen((value) => !value)} aria-expanded={quickOpen}><Plus size={15} /> <span>Quick add</span><ChevronDown size={13} /></Button>{quickOpen && <div className="quick-menu" role="menu"><Link role="menuitem" to="/tasks" onClick={() => setQuickOpen(false)}><ListTodo size={15} /> Add a task</Link><Link role="menuitem" to="/habits" onClick={() => setQuickOpen(false)}><Sparkles size={15} /> Add a habit</Link><Link role="menuitem" to="/goals" onClick={() => setQuickOpen(false)}><Target size={15} /> Set a goal</Link></div>}</div>
          <div className="profile-wrap"><button type="button" className="profile-button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen} aria-label="Account menu"><span className="avatar">{greetingName(auth.user?.name ?? 'S').slice(0, 1).toUpperCase()}</span><span className="profile-name">{greetingName(auth.user?.name ?? 'Member')}</span><ChevronDown size={13} /></button>{profileOpen && <div className="profile-menu"><div className="profile-menu-head"><b>{auth.user?.name}</b><span>{auth.user?.email ?? 'Private workspace'}</span></div><Link to="/settings" onClick={() => setProfileOpen(false)}><Settings2 size={15} /> Preferences</Link><button type="button" onClick={() => void signOut()}><LogOut size={15} /> Sign out</button></div>}</div>
        </div>
      </header>
      <main className="main-content" id="main-content">
        {workspaceError && <ErrorBanner message={workspaceError} onRetry={onRetry} />}
        {children}
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `mobile-nav-link ${isActive ? 'mobile-active' : ''}`}><Icon size={19} strokeWidth={1.8} /><span>{label === 'Roadmap' ? 'Map' : label}</span></NavLink>)}<NavLink to="/settings" className={({ isActive }) => `mobile-nav-link ${isActive ? 'mobile-active' : ''}`}><MoreHorizontal size={19} /><span>More</span></NavLink></nav>
    </div>
  </div>;
}
