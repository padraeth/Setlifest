import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, Check, Clock3, ExternalLink, FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import type { CourseSection, Lesson } from '../../../shared/types';
import { useWorkspace } from '../../state/WorkspaceContext';
import { useToast } from '../../components/Feedback';
import { Badge, Button, Field, Modal, SelectField, TextAreaField } from '../../components/ui';
import { courseProgress } from '../../lib/calculations';
import { formatDate, newId } from '../../lib/format';

export function CourseDetailPage() {
  const { courseId } = useParams();
  const { workspace, createRecord, updateRecord, deleteRecord } = useWorkspace();
  const { notify } = useToast();
  const course = workspace.courses.find((item) => item.id === courseId);
  const sections = workspace.courseSections.filter((section) => section.courseId === courseId).sort((a, b) => a.order - b.order);
  const lessons = workspace.lessons.filter((lesson) => sections.some((section) => section.id === lesson.sectionId));
  const [modal, setModal] = useState<'section' | 'lesson' | 'edit-lesson' | 'delete-course' | null>(null);
  const [sectionForLesson, setSectionForLesson] = useState<string>('');
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [noteDraft, setNoteDraft] = useState(course?.notes ?? '');
  const [noteSaving, setNoteSaving] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const progress = useMemo(() => courseProgress(lessons, workspace.lessonProgress, course?.progressMode), [lessons, workspace.lessonProgress, course?.progressMode]);
  const completedCount = lessons.filter((lesson) => workspace.lessonProgress.some((item) => item.lessonId === lesson.id && item.completed)).length;
  const nextLesson = lessons.find((lesson) => !workspace.lessonProgress.some((item) => item.lessonId === lesson.id && item.completed));

  useEffect(() => { setNoteDraft(course?.notes ?? ''); }, [course?.id, course?.notes]);
  useEffect(() => {
    if (!course?.lastAccessedLessonId) return;
    const timer = window.setTimeout(() => document.getElementById(`lesson-${course.lastAccessedLessonId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    return () => window.clearTimeout(timer);
  }, [course?.id, course?.lastAccessedLessonId]);

  async function toggleLesson(lesson: Lesson) {
    const existing = workspace.lessonProgress.find((item) => item.lessonId === lesson.id);
    try {
      if (existing) await updateRecord('lessonProgress', { ...existing, completed: !existing.completed, completedAt: existing.completed ? null : new Date().toISOString().slice(0, 10) }, existing.id);
      else await createRecord('lessonProgress', { id: newId(), lessonId: lesson.id, completed: true, completedAt: new Date().toISOString().slice(0, 10) });
      notify(existing?.completed ? 'Lesson reopened.' : 'Lesson progress saved.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not save lesson progress.', 'error'); }
  }
  async function markOpened(lesson: Lesson) {
    if (!course) return;
    setResumeId(lesson.id);
    try { await updateRecord('courses', { ...course, lastAccessedLessonId: lesson.id }, course.id); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not save your place.', 'error'); }
  }
  async function saveNotes() {
    if (!course) return;
    setNoteSaving(true);
    try { await updateRecord('courses', { ...course, notes: noteDraft }, course.id); notify('Course notes saved.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not save your notes.', 'error'); }
    finally { setNoteSaving(false); }
  }
  async function addSection(title: string) {
    if (!course || !title.trim()) return;
    try { await createRecord('courseSections', { id: newId(), courseId: course.id, title: title.trim(), order: sections.length }); setModal(null); notify('Section added.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not add a section.', 'error'); }
  }
  async function saveLesson(values: Omit<Lesson, 'id'>) {
    try {
      if (editingLesson) await updateRecord('lessons', { ...values, id: editingLesson.id }, editingLesson.id);
      else await createRecord('lessons', { ...values, id: newId() });
      setModal(null); setEditingLesson(null); notify(editingLesson ? 'Lesson updated.' : 'Lesson added.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not save this lesson.', 'error'); }
  }
  async function moveLesson(lesson: Lesson, direction: -1 | 1) {
    const siblings = lessons.filter((item) => item.sectionId === lesson.sectionId).sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((item) => item.id === lesson.id); const other = siblings[index + direction];
    if (!other) return;
    try { await Promise.all([updateRecord('lessons', { ...lesson, order: other.order }, lesson.id), updateRecord('lessons', { ...other, order: lesson.order }, other.id)]); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not reorder lessons.', 'error'); }
  }
  async function removeLesson(lesson: Lesson) {
    if (!window.confirm(`Delete “${lesson.title}” and its completion record?`)) return;
    try { await deleteRecord('lessons', lesson.id); notify('Lesson deleted.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not delete the lesson.', 'error'); }
  }
  async function deleteCourse() {
    if (!course) return;
    try { await deleteRecord('courses', course.id); setModal(null); window.location.assign('/courses'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Unlink the course before deleting it.', 'error'); }
  }
  if (!course) return <div className="page"><Link className="back-link" to="/courses"><ArrowLeft size={15} /> Back to learning</Link><div className="empty-module"><h2>Course not found.</h2><p>This course may have been deleted or moved.</p><Link to="/courses" className="text-link">Open your learning space</Link></div></div>;

  return <div className="page course-detail-page">
    <Link className="back-link" to="/courses"><ArrowLeft size={15} /> Learning space</Link>
    <header className="course-detail-hero"><div><span className="eyebrow">{course.category || 'PERSONAL STUDY'}{course.instructor ? ` / ${course.instructor}` : ''}</span><h1>{course.name}</h1><p>{course.description || 'Your course, organized into manageable lessons.'}</p><div className="course-detail-meta"><Badge tone={course.status === 'completed' ? 'green' : course.status === 'paused' ? 'amber' : 'blue'}>{course.status === 'active' ? 'In progress' : course.status}</Badge>{course.targetDate && <span><Clock3 size={14} /> Target {formatDate(course.targetDate)}</span>}{course.progressMode === 'weighted' && <span>Weighted progress</span>}</div></div><div className="course-detail-progress"><div className="course-ring" style={{ '--course-progress': `${progress}%` } as React.CSSProperties}><span>{progress}<small>%</small></span></div><span>{completedCount} / {lessons.length} lessons</span></div></header>
    <div className="course-detail-grid"><section className="course-curriculum"><div className="curriculum-heading"><div><span className="small-kicker">THE CURRICULUM</span><h2>Course outline</h2></div><Button variant="secondary" size="sm" onClick={() => setModal('section')}><Plus size={14} /> Add section</Button></div>
      {sections.length === 0 ? <div className="curriculum-empty"><FileText size={22} /><h3>Give your course a shape.</h3><p>Add sections, then add lessons as small, finishable pieces.</p><Button onClick={() => setModal('section')}><Plus size={15} /> Add first section</Button></div> : sections.map((section) => {
        const sectionLessons = lessons.filter((lesson) => lesson.sectionId === section.id).sort((a, b) => a.order - b.order);
        const sectionDone = sectionLessons.filter((lesson) => workspace.lessonProgress.some((item) => item.lessonId === lesson.id && item.completed)).length;
        return <section className="section-block" key={section.id}><header className="section-block-head"><div><span>SECTION {String(section.order + 1).padStart(2, '0')}</span><h3>{section.title}</h3><small>{sectionDone} of {sectionLessons.length} complete</small></div><Button variant="quiet" size="sm" onClick={() => { setSectionForLesson(section.id); setEditingLesson(null); setModal('lesson'); }}><Plus size={14} /> Add lesson</Button></header>
          {sectionLessons.length ? <div className="lesson-list">{sectionLessons.map((lesson, index) => {
            const state = workspace.lessonProgress.find((item) => item.lessonId === lesson.id && item.completed);
            const isNext = nextLesson?.id === lesson.id;
            return <article className={`lesson-row ${state ? 'lesson-done' : ''} ${resumeId === lesson.id ? 'lesson-resume' : ''}`} key={lesson.id} id={`lesson-${lesson.id}`}>
              <button type="button" className={`lesson-check ${state ? 'lesson-check-done' : ''}`} aria-label={state ? `Reopen ${lesson.title}` : `Mark ${lesson.title} complete`} onClick={() => void toggleLesson(lesson)}>{state ? <Check size={14} /> : <span />}</button>
              <div className="lesson-copy"><span className="lesson-index">{String(index + 1).padStart(2, '0')}{isNext && <Badge tone="blue">Up next</Badge>}</span><h4>{lesson.title}</h4>{lesson.notes && <p>{lesson.notes}</p>}<div className="lesson-meta">{lesson.durationMinutes && <span><Clock3 size={12} /> {lesson.durationMinutes} min</span>}{course.progressMode === 'weighted' && <span>Weight {lesson.weight}</span>}</div></div>
              <div className="lesson-actions">{lesson.externalUrl && <a href={lesson.externalUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${lesson.title} source`} onClick={() => void markOpened(lesson)}><ExternalLink size={15} /></a>}<button type="button" aria-label={`Move ${lesson.title} up`} disabled={index === 0} onClick={() => void moveLesson(lesson, -1)}><ArrowUp size={14} /></button><button type="button" aria-label={`Move ${lesson.title} down`} disabled={index === sectionLessons.length - 1} onClick={() => void moveLesson(lesson, 1)}><ArrowDown size={14} /></button><button type="button" aria-label={`Edit ${lesson.title}`} onClick={() => { setEditingLesson(lesson); setSectionForLesson(section.id); setModal('edit-lesson'); }}><Pencil size={14} /></button><button type="button" aria-label={`Delete ${lesson.title}`} onClick={() => void removeLesson(lesson)}><Trash2 size={14} /></button></div>
            </article>;
          })}</div> : <p className="section-no-lessons">Add the first lesson to this section.</p>}
        </section>;
      })}
      {sections.length > 0 && <Button variant="quiet" onClick={() => { setSectionForLesson(sections[0].id); setModal('lesson'); }}><Plus size={15} /> Add a lesson</Button>}
    </section>
    <aside className="course-side-panel"><section className="course-notes-card"><span className="small-kicker">YOUR NOTES</span><h3>Keep a thought close.</h3><TextAreaField label="Course notes" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Questions, ideas, useful links…" rows={7} /><Button variant="secondary" size="sm" onClick={() => void saveNotes()} disabled={noteSaving}>{noteSaving ? 'Saving…' : 'Save notes'}</Button></section>
      <section className="course-intention-card"><span className="small-kicker">A SMALL INTENTION</span><p>{nextLesson ? `Your next lesson is “${nextLesson.title}”. No need to rush it.` : lessons.length ? 'You’ve completed every listed lesson. Take a moment to notice that.' : 'Add one lesson to make it easier to begin.'}</p>{course.externalUrl && <a href={course.externalUrl} target="_blank" rel="noopener noreferrer" onClick={() => nextLesson && void markOpened(nextLesson)}>Open course source <ExternalLink size={13} /></a>}</section>
      <Button variant="danger" size="sm" onClick={() => setModal('delete-course')}>Delete course</Button>
    </aside></div>
    <Modal open={modal === 'section'} title="Add a section" description="Group a few related lessons." onClose={() => setModal(null)} size="sm"><SimpleSectionForm onCancel={() => setModal(null)} onSave={addSection} /></Modal>
    <Modal open={modal === 'lesson' || modal === 'edit-lesson'} title={editingLesson ? 'Edit lesson' : 'Add a lesson'} description="Keep the next step concrete. External URLs open at their source." onClose={() => { setModal(null); setEditingLesson(null); }} size="md"><LessonForm key={editingLesson?.id ?? sectionForLesson} initial={editingLesson} sections={sections} sectionId={sectionForLesson} onCancel={() => { setModal(null); setEditingLesson(null); }} onSave={saveLesson} /></Modal>
    <Modal open={modal === 'delete-course'} title="Delete this course?" description="All course sections, lessons, and lesson completion history will be removed." onClose={() => setModal(null)} size="sm"><div className="modal-body"><div className="form-actions"><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button variant="danger" onClick={() => void deleteCourse()}>Delete course</Button></div></div></Modal>
  </div>;
}

function SimpleSectionForm({ onCancel, onSave }: { onCancel: () => void; onSave: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState('');
  return <form className="modal-body form-stack" onSubmit={(event) => { event.preventDefault(); void onSave(title); }}><Field label="Section title" autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For example: Foundations" /><div className="form-actions"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit">Add section</Button></div></form>;
}

function LessonForm({ initial, sections, sectionId, onCancel, onSave }: { initial: Lesson | null; sections: CourseSection[]; sectionId: string; onCancel: () => void; onSave: (values: Omit<Lesson, 'id'>) => Promise<void> }) {
  const [title, setTitle] = useState(initial?.title ?? ''); const [chosenSection, setChosenSection] = useState(initial?.sectionId ?? sectionId);
  const [duration, setDuration] = useState(initial?.durationMinutes ?? null); const [externalUrl, setExternalUrl] = useState(initial?.externalUrl ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? ''); const [weight, setWeight] = useState(initial?.weight ?? 1); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (externalUrl && !/^https?:\/\//i.test(externalUrl)) { setError('Use a valid https:// or http:// link.'); return; }
    setError(''); await onSave({ sectionId: chosenSection, title, durationMinutes: duration, externalUrl, notes, order: initial?.order ?? 0, weight });
  }
  return <form className="modal-body form-stack" onSubmit={submit}><Field label="Lesson title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A clear next step" required maxLength={160} autoFocus />
    <SelectField label="Section" value={chosenSection} onChange={(event) => setChosenSection(event.target.value)}>{sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</SelectField>
    <div className="form-grid"><Field label="Duration (minutes)" type="number" min={1} value={duration ?? ''} onChange={(event) => setDuration(event.target.value ? Number(event.target.value) : null)} placeholder="Optional" /><Field label="Progress weight" type="number" min={1} max={100} value={weight} onChange={(event) => setWeight(Number(event.target.value))} hint="Used when weighted progress is selected." /></div>
    <Field label="External lesson URL (optional)" type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://…" />
    <TextAreaField label="Lesson notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Keep a reminder or takeaway" />
    {error && <p className="field-error form-error" role="alert">{error}</p>}<div className="form-actions"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit">{initial ? 'Save lesson' : 'Add lesson'}</Button></div>
  </form>;
}
