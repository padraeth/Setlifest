import { useState } from 'react';
import { ArrowDownToLine, Check, Database, LogOut, Monitor, Moon, Sun, UserRound } from 'lucide-react';
import { useWorkspace } from '../../state/WorkspaceContext';
import { useToast } from '../../components/Feedback';
import { Button, PageHeading, SelectField, Switch } from '../../components/ui';

const widgets = [
  { id: 'habits', label: 'Daily habits', description: 'Your scheduled habits and check-ins.' },
  { id: 'tasks', label: 'Priority tasks', description: 'The next actionable items from your list.' },
  { id: 'goals', label: 'Active goals', description: 'Progress and milestones for open goals.' },
  { id: 'learning', label: 'Learning queue', description: 'Active courses and lesson progress.' },
];
const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function SettingsPage() {
  const { auth, workspace, savePreferences, signOut } = useWorkspace();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(workspace.preferences.displayName);
  async function updatePreference(change: Partial<typeof workspace.preferences>) {
    setSaving(true);
    try { await savePreferences({ ...workspace.preferences, ...change }); notify('Preference saved.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not save this preference.', 'error'); }
    finally { setSaving(false); }
  }
  function exportWorkspace() {
    const payload = { product: 'Setlifest', schemaVersion: 1, exportedAt: new Date().toISOString(), workspace };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `setlifest-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    notify('Your private workspace export has been downloaded.');
  }
  const selectedWidgets = new Set(workspace.preferences.dashboardWidgets);
  function toggleWidget(id: string, checked: boolean) {
    const next = checked ? [...selectedWidgets, id] : workspace.preferences.dashboardWidgets.filter((item) => item !== id);
    void updatePreference({ dashboardWidgets: [...new Set(next)] });
  }
  function saveDisplayName() { void updatePreference({ displayName: displayName.trim() }); }
  return <div className="page settings-page">
    <PageHeading eyebrow="MAKE IT FEEL LIKE YOURS" title="Settings" description="Shape how Setlifest fits the way you plan and move through a week." />
    <div className="settings-layout"><nav className="settings-nav" aria-label="Settings sections"><a href="#profile" className="settings-nav-active"><UserRound size={15} /> Account</a><a href="#preferences"><Monitor size={15} /> Preferences</a><a href="#dashboard"><Check size={15} /> Dashboard</a><a href="#data"><Database size={15} /> Your data</a></nav>
      <div className="settings-content">
        <section className="settings-section" id="profile"><div className="settings-section-heading"><div><p className="eyebrow">YOUR ACCOUNT</p><h2>Profile</h2><p>The identity connected to this private workspace.</p></div><span className="settings-icon"><UserRound size={17} /></span></div><div className="settings-profile-row"><div className="settings-avatar">{(auth.user?.name || 'S').slice(0, 1).toUpperCase()}</div><div className="settings-profile-copy"><strong>{auth.user?.name || 'Setlifest member'}</strong><span>{auth.user?.email || 'Signed in with Manus'}</span><small>Account information is provided by the sign-in service.</small></div><Button variant="secondary" size="sm" onClick={() => void signOut()}><LogOut size={14} /> Sign out</Button></div></section>
        <section className="settings-section" id="preferences"><div className="settings-section-heading"><div><p className="eyebrow">YOUR ENVIRONMENT</p><h2>Preferences</h2><p>Choose a visual mode and the first day of your week.</p></div><span className="settings-icon"><Monitor size={17} /></span></div><div className="settings-row"><div className="settings-row-copy"><strong>Appearance</strong><span>System follows your device’s current light or dark setting.</span></div><div className="theme-select">{([['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', Monitor, 'System']] as const).map(([value, Icon, label]) => <button type="button" key={value} disabled={saving} aria-pressed={workspace.preferences.theme === value} className={workspace.preferences.theme === value ? 'theme-choice theme-choice-active' : 'theme-choice'} onClick={() => void updatePreference({ theme: value })}><Icon size={15} />{label}</button>)}</div></div><div className="settings-row"><div className="settings-row-copy"><strong>Week starts on</strong><span>Sets the calendar order for weekly habit summaries.</span></div><SelectField label="Week starts on" aria-label="Week starts on" disabled={saving} value={workspace.preferences.weekStartsOn} onChange={(event) => void updatePreference({ weekStartsOn: Number(event.target.value) })}>{weekDays.map((day, index) => <option key={day} value={index}>{day}</option>)}</SelectField></div><div className="settings-row settings-row-input"><label htmlFor="display-name"><strong>Name shown on your dashboard</strong><span>Only changes your Setlifest greeting, not your sign-in identity.</span></label><div className="settings-name-controls"><input id="display-name" className="input settings-display-name" maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={auth.user?.name ?? 'Your name'} /><Button variant="secondary" size="sm" disabled={saving || displayName.trim() === workspace.preferences.displayName} onClick={saveDisplayName}>{saving ? 'Saving…' : 'Save'}</Button></div></div></section>
        <section className="settings-section" id="dashboard"><div className="settings-section-heading"><div><p className="eyebrow">WHAT YOU SEE FIRST</p><h2>Dashboard widgets</h2><p>Choose which modules appear on your daily dashboard.</p></div><span className="settings-icon"><Check size={17} /></span></div><div className="widget-settings">{widgets.map((widget) => <Switch key={widget.id} disabled={saving} label={widget.label} description={widget.description} checked={selectedWidgets.has(widget.id)} onChange={(checked) => toggleWidget(widget.id, checked)} />)}</div></section>
        <section className="settings-section" id="data"><div className="settings-section-heading"><div><p className="eyebrow">YOUR INFORMATION</p><h2>Data and privacy</h2><p>Your workspace records are stored on the managed backend and associated with your signed-in account.</p></div><span className="settings-icon"><Database size={17} /></span></div><div className="data-counts"><span><b>{workspace.habits.length}</b> habits</span><span><b>{workspace.tasks.length}</b> tasks</span><span><b>{workspace.goals.length}</b> goals</span><span><b>{workspace.courses.length}</b> courses</span></div><div className="export-row"><div><strong>Export your workspace</strong><p>Download a JSON copy of your current records and preferences. This does not include your sign-in session.</p></div><Button variant="secondary" onClick={exportWorkspace}><ArrowDownToLine size={15} /> Download JSON</Button></div><p className="settings-note">Habit reminder times can be stored on a habit; this build does not send push or background notifications.</p></section>
      </div>
    </div>
  </div>;
}
