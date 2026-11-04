import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, BookOpen, ExternalLink, GraduationCap, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Course } from '../../../shared/types';
import { useWorkspace } from '../../state/WorkspaceContext';
import { useToast } from '../../components/Feedback';
import { Badge, Button, Field, Modal, PageHeading, ProgressBar, SelectField, TextAreaField } from '../../components/ui';
import { courseProgress } from '../../lib/calculations';
import { formatDate, newId, todayKey } from '../../lib/format';
import { courseInputSchema } from '../../lib/validation';

const covers = ['blue', 'clay', 'sage', 'violet', 'sunset'];

export function CoursesPage() {
  const { workspace, createRecord, updateRecord, deleteRecord } = useWorkspace();
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'active' | 'all' | 'completed'>('active');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [removeCourse, setRemoveCourse] = useState<Course | null>(null);
  const [busy, setBusy] = useState(false);
  const courses = useMemo(() => workspace.courses.filter((course) => {
    const visible = filter === 'all' ? course.status !== 'archived' : filter === 'completed' ? course.status === 'completed' : course.status === 'active';
    return visible && `${course.name} ${course.description} ${course.category} ${course.instructor}`.toLowerCase().includes(search.toLowerCase());
  }), [workspace.courses, filter, search]);

  async function saveCourse(values: Omit<Course, 'id' | 'createdAt'>) {
    setBusy(true);
    const course: Course = { ...values, id: editing?.id ?? newId(), createdAt: editing?.createdAt ?? new Date().toISOString() };
    const parsed = courseInputSchema.safeParse(course);
    if (!parsed.success) { notify(parsed.error.issues[0]?.message ?? 'Check the course details.', 'error'); setBusy(false); return; }
    try {
      if (editing) await updateRecord('courses', course, course.id);
      else await createRecord('courses', course);
      setFormOpen(false); setEditing(null); notify(editing ? 'Course updated.' : 'Course added to your learning space.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not save this course.', 'error'); }
    finally { setBusy(false); }
  }
  async function changeStatus(course: Course, status: Course['status']) {
    try { await updateRecord('courses', { ...course, status }, course.id); notify(status === 'completed' ? 'Course marked complete.' : 'Course status updated.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not update the course.', 'error'); }
  }
  async function confirmDelete() {
    if (!removeCourse) return;
    try { await deleteRecord('courses', removeCourse.id); setRemoveCourse(null); notify('Course removed with its sections and lessons.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Unlink this course from its goal before deleting it.', 'error'); }
  }

  return <div className="page">
    <PageHeading eyebrow="CURIOSITY, WITH A PLACE TO LAND" title="Learning" description="Keep courses and lessons together. Track what you’ve actually completed." action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={16} /> Add course</Button>} />
    <section className="learning-banner"><div className="learning-banner-symbol"><GraduationCap size={24} /></div><div><span className="small-kicker">YOUR LEARNING SPACE</span><h2>{workspace.courses.filter((course) => course.status === 'active').length} course{workspace.courses.filter((course) => course.status === 'active').length === 1 ? '' : 's'} in motion</h2><p>Progress comes from lessons completed, never guessed.</p></div><div className="learning-banner-orbit"><span /><span /><span /></div></section>
    <div className="module-toolbar course-toolbar"><div className="filter-pills" role="tablist" aria-label="Course views">{(['active', 'all', 'completed'] as const).map((value) => <button type="button" role="tab" aria-selected={filter === value} className={filter === value ? 'filter-pill selected' : 'filter-pill'} onClick={() => setFilter(value)} key={value}>{value === 'active' ? 'In progress' : value === 'all' ? 'All courses' : 'Completed'}<span>{workspace.courses.filter((course) => value === 'active' ? course.status === 'active' : value === 'all' ? course.status !== 'archived' : course.status === 'completed').length}</span></button>)}</div><label className="search-wrap"><Search size={15} /><input aria-label="Search courses" placeholder="Find a course" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
    {courses.length === 0 ? <div className="empty-module"><div className="empty-orbit"><BookOpen size={26} /></div><p className="eyebrow">LEARN AT YOUR OWN PACE</p><h2>{search ? 'Nothing found for that search.' : 'Make space for the next thing you want to learn.'}</h2><p>{search ? 'Try another course, instructor, or category.' : 'Add a course, then shape it into sections and lessons.'}</p>{!search && filter !== 'completed' && <Button onClick={() => setFormOpen(true)}><Plus size={16} /> Add a course</Button>}</div> : <div className="course-grid">{courses.map((course, index) => {
      const sections = workspace.courseSections.filter((section) => section.courseId === course.id);
      const lessons = workspace.lessons.filter((lesson) => sections.some((section) => section.id === lesson.sectionId));
      const progress = courseProgress(lessons, workspace.lessonProgress, course.progressMode);
      const nextLesson = lessons.find((lesson) => !workspace.lessonProgress.some((item) => item.lessonId === lesson.id && item.completed));
      const goal = workspace.goals.find((item) => item.id === course.goalId);
      return <article className="course-card" key={course.id} style={{ animationDelay: `${index * 45}ms` }}>
        <Link to={`/courses/${course.id}`} className={`course-cover cover-${covers.includes(course.cover) ? course.cover : 'blue'}`} aria-label={`Open ${course.name}`}><div className="cover-geometry"><span /><span /><span /></div><div className="cover-topline"><span>{course.category || 'PERSONAL STUDY'}</span><span className="cover-index">S / {String(index + 1).padStart(2, '0')}</span></div><span className="cover-title">{course.name}</span><span className="cover-icon"><BookOpen size={19} /></span></Link>
        <div className="course-card-body"><div className="course-card-title"><div><div className="course-status-row"><Badge tone={course.status === 'completed' ? 'green' : course.status === 'paused' ? 'amber' : 'blue'}>{course.status === 'active' ? 'In progress' : course.status}</Badge>{course.instructor && <span>{course.instructor}</span>}</div><h3><Link to={`/courses/${course.id}`}>{course.name}</Link></h3></div><div className="course-card-actions"><button type="button" className="icon-button tiny-icon" aria-label={`Edit ${course.name}`} onClick={() => { setEditing(course); setFormOpen(true); }}><Pencil size={14} /></button><button type="button" className="icon-button tiny-icon" aria-label={`Delete ${course.name}`} onClick={() => setRemoveCourse(course)}><Trash2 size={14} /></button></div></div>
          {course.description && <p className="course-description">{course.description}</p>}
          <div className="course-card-stats"><span>{sections.length} section{sections.length === 1 ? '' : 's'}</span><span>{lessons.length} lesson{lessons.length === 1 ? '' : 's'}</span>{course.targetDate && <span>Target {formatDate(course.targetDate)}</span>}</div>
          <div className="course-progress-row"><ProgressBar value={progress} label={`${course.name} progress`} /><strong>{progress}%</strong></div>
          {goal && <div className="course-goal-link"><span>Linked to</span><b>{goal.title}</b></div>}
          <div className="course-card-footer"><Link to={`/courses/${course.id}`}>{nextLesson ? `Continue · ${nextLesson.title}` : lessons.length ? 'Review lessons' : 'Shape your course'} <ArrowRight size={14} /></Link>{course.externalUrl && <a href={course.externalUrl} target="_blank" rel="noreferrer noopener" aria-label="Open course source"><ExternalLink size={14} /></a>}</div>
          {course.status !== 'completed' && progress === 100 && lessons.length > 0 && <button type="button" className="course-complete-link" onClick={() => void changeStatus(course, 'completed')}>Mark course complete <CheckIcon /></button>}
        </div>
      </article>;
    })}</div>}
    <Modal open={formOpen} title={editing ? 'Edit course' : 'Add a course'} description="Track your own courses and learning progress. External material stays on its source site." onClose={() => { setFormOpen(false); setEditing(null); }} size="lg"><CourseForm key={editing?.id ?? 'new-course'} initial={editing} goals={workspace.goals} busy={busy} onCancel={() => { setFormOpen(false); setEditing(null); }} onSave={saveCourse} /></Modal>
    <Modal open={Boolean(removeCourse)} title="Remove this course?" description="Its sections, lessons, and completion records will be removed too." onClose={() => setRemoveCourse(null)} size="sm"><div className="modal-body"><p className="modal-copy">Remove <strong>{removeCourse?.name}</strong> from your learning space?</p><div className="form-actions"><Button variant="secondary" onClick={() => setRemoveCourse(null)}>Keep course</Button><Button variant="danger" onClick={() => void confirmDelete()}>Remove course</Button></div></div></Modal>
  </div>;
}

function CourseForm({ initial, goals, busy, onCancel, onSave }: { initial: Course | null; goals: ReturnType<typeof useWorkspace>['workspace']['goals']; busy: boolean; onCancel: () => void; onSave: (values: Omit<Course, 'id' | 'createdAt'>) => Promise<void> }) {
  const [name, setName] = useState(initial?.name ?? ''); const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'Learning'); const [instructor, setInstructor] = useState(initial?.instructor ?? '');
  const [cover, setCover] = useState(initial?.cover ?? 'blue'); const [externalUrl, setExternalUrl] = useState(initial?.externalUrl ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayKey()); const [targetDate, setTargetDate] = useState(initial?.targetDate ?? '');
  const [status, setStatus] = useState<Course['status']>(initial?.status ?? 'active'); const [progressMode, setProgressMode] = useState<Course['progressMode']>(initial?.progressMode ?? 'lessons');
  const [goalId, setGoalId] = useState(initial?.goalId ?? ''); const [notes, setNotes] = useState(initial?.notes ?? ''); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    const values = { name, description, category, instructor, cover, externalUrl, startDate, targetDate, status, progressMode, goalId: goalId || null, notes, lastAccessedLessonId: initial?.lastAccessedLessonId ?? null };
    const parsed = courseInputSchema.safeParse({ ...values, id: initial?.id ?? newId(), createdAt: initial?.createdAt ?? new Date().toISOString() });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the course details.'); return; }
    setError(''); await onSave(values);
  }
  return <form className="modal-body form-stack" onSubmit={submit}><Field label="Course name" value={name} onChange={(event) => setName(event.target.value)} placeholder="What are you learning?" maxLength={160} required autoFocus /><TextAreaField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Why you chose this course" />
    <div className="form-grid"><Field label="Category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Design, language…" /><Field label="Instructor or source" value={instructor} onChange={(event) => setInstructor(event.target.value)} placeholder="Optional" /></div>
    <Field label="External course URL (optional)" type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://…" />
    <div className="form-grid"><Field label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /><Field label="Target date" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></div>
    <div className="form-grid"><SelectField label="Progress mode" value={progressMode} onChange={(event) => setProgressMode(event.target.value as Course['progressMode'])}><option value="lessons">Equal lesson completion</option><option value="weighted">Weighted lesson completion</option></SelectField><SelectField label="Status" value={status} onChange={(event) => setStatus(event.target.value as Course['status'])}><option value="active">In progress</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="archived">Archived</option></SelectField></div>
    <SelectField label="Connect to a goal (optional)" value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">No linked goal</option>{goals.filter((goal) => goal.status === 'active').map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</SelectField>
    <div className="field"><span className="field-label">Cover palette</span><div className="cover-picker">{covers.map((value) => <button type="button" aria-pressed={cover === value} key={value} onClick={() => setCover(value)} className={`cover-swatch cover-${value}`}><span>{value}</span></button>)}</div></div>
    <TextAreaField label="Course notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Keep a learning intention or a question to return to" />
    {error && <p role="alert" className="field-error form-error">{error}</p>}<div className="form-actions"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save course' : 'Add course'}</Button></div>
  </form>;
}
function CheckIcon() { return <span aria-hidden="true">✓</span>; }
