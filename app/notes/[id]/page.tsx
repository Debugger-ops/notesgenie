'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import LoadingSpinner from '../../../components/LoadingSpinner';
import styles from '../../../styles/notes.module.css';

interface ConceptNode {
  concept: string;
  relatedConcepts: string[];
}

interface NotesData {
  _id: string;
  title: string;
  summary: string[];
  examNotes: string[];
  keyFormulas: string[];
  rawText?: string;
  createdAt: string;
  fileType: string;
  fileId?: { fileType: string } | string;
  topics?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime?: number;
  conceptMap?: ConceptNode[];
  studyTips?: string[];
  hasDeepAnalysis?: boolean;
}

type Tab = 'summary' | 'exam-notes' | 'formulas' | 'deep-analysis';

const DIFFICULTY_COLORS = {
  beginner: '#48bb78',
  intermediate: '#ed8936',
  advanced: '#e53e3e',
};

/* ── small helper: textarea-based list editor ── */
function ListEditor({
  label,
  items,
  onChange,
  placeholder,
  mono = false,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  const text = items.join('\n');
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.4rem' }}>
        {label}
      </label>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginBottom: '0.4rem' }}>
        One item per line
      </p>
      <textarea
        rows={Math.max(4, items.length + 1)}
        value={text}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.split('\n').map((s) => s.trimEnd()))}
        style={{
          width: '100%',
          padding: '0.75rem',
          border: '1.5px solid var(--primary, #6c63ff)',
          borderRadius: '8px',
          fontSize: mono ? '0.85rem' : '0.9rem',
          fontFamily: mono ? "'SF Mono','Fira Code','Consolas',monospace" : 'inherit',
          lineHeight: 1.6,
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

/* ── delete confirmation modal ── */
function DeleteModal({ title, onConfirm, onCancel, isDeleting }: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '1rem' }}>🗑️</div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem' }}>
          Delete these notes?
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          <strong>"{title}"</strong> will be permanently deleted. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              flex: 1, padding: '0.75rem',
              border: '1.5px solid var(--border, #e2e8f0)',
              borderRadius: '8px', background: '#fff',
              fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              flex: 1, padding: '0.75rem',
              border: 'none', borderRadius: '8px',
              background: '#e53e3e', color: '#fff',
              fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem', opacity: isDeleting ? 0.7 : 1,
            }}
          >
            {isDeleting ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   MAIN PAGE
═══════════════════════════════════ */
export default function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [notes, setNotes] = useState<NotesData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState<string[]>([]);
  const [editExamNotes, setEditExamNotes] = useState<string[]>([]);
  const [editKeyFormulas, setEditKeyFormulas] = useState<string[]>([]);
  const [editStudyTips, setEditStudyTips] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Deep analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    setIsLoading(true);
    fetch(`/api/notes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const n = data.notes || data;
        if (n.fileId && typeof n.fileId === 'object') n.fileType = n.fileId.fileType;
        setNotes(n);
        // Auto-open edit mode if ?edit=1 was passed (e.g. from dashboard)
        if (searchParams.get('edit') === '1') {
          setEditTitle(n.title);
          setEditSummary([...n.summary]);
          setEditExamNotes([...n.examNotes]);
          setEditKeyFormulas([...n.keyFormulas]);
          setEditStudyTips(n.studyTips ? [...n.studyTips] : []);
          setIsEditing(true);
        }
      })
      .catch(() => setError('Failed to load notes. Please try again.'))
      .finally(() => setIsLoading(false));
  }, [status, id, searchParams]);

  /* ── open edit mode ── */
  const openEdit = useCallback(() => {
    if (!notes) return;
    setEditTitle(notes.title);
    setEditSummary([...notes.summary]);
    setEditExamNotes([...notes.examNotes]);
    setEditKeyFormulas([...notes.keyFormulas]);
    setEditStudyTips(notes.studyTips ? [...notes.studyTips] : []);
    setSaveError('');
    setIsEditing(true);
  }, [notes]);

  const cancelEdit = () => { setIsEditing(false); setSaveError(''); };

  /* ── save edits ── */
  const saveEdit = async () => {
    if (!notes) return;
    if (!editTitle.trim()) { setSaveError('Title cannot be empty.'); return; }
    setIsSaving(true);
    setSaveError('');
    try {
      const clean = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean);
      const res = await fetch(`/api/notes/${notes._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          summary: clean(editSummary),
          examNotes: clean(editExamNotes),
          keyFormulas: clean(editKeyFormulas),
          studyTips: clean(editStudyTips),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Save failed');
      }
      const data = await res.json();
      const updated = data.notes || data;
      if (updated.fileId && typeof updated.fileId === 'object') updated.fileType = updated.fileId.fileType;
      setNotes(updated);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── delete ── */
  const confirmDelete = async () => {
    if (!notes) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/notes/${notes._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.push('/dashboard');
    } catch {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  /* ── deep analysis ── */
  const handleDeepAnalysis = async () => {
    if (!notes) return;
    setIsAnalyzing(true);
    setAnalyzeError('');
    try {
      const res = await fetch('/api/analyze-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesId: notes._id }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Analysis failed');
      }
      const data = await res.json();
      setNotes((prev) => prev ? {
        ...prev,
        ...data.analysis,
        summary: data.analysis.summary?.length > 0 ? data.analysis.summary : prev.summary,
        examNotes: data.analysis.examNotes?.length > 0 ? data.analysis.examNotes : prev.examNotes,
        keyFormulas: data.analysis.keyFormulas?.length > 0 ? data.analysis.keyFormulas : prev.keyFormulas,
        hasDeepAnalysis: true,
      } : prev);
      setActiveTab('deep-analysis');
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* ── helpers ── */
  const getNotesText = (): string => {
    if (!notes) return '';
    const lines: string[] = [`# ${notes.title}\n`];
    if (notes.summary.length > 0) { lines.push('## Summary'); notes.summary.forEach((x) => lines.push(`- ${x}`)); lines.push(''); }
    if (notes.examNotes.length > 0) { lines.push('## Exam Notes'); notes.examNotes.forEach((x) => lines.push(`- ${x}`)); lines.push(''); }
    if (notes.keyFormulas.length > 0) { lines.push('## Key Formulas'); notes.keyFormulas.forEach((x) => lines.push(`- ${x}`)); lines.push(''); }
    if (notes.studyTips?.length) { lines.push('## Study Tips'); notes.studyTips.forEach((x) => lines.push(`- ${x}`)); lines.push(''); }
    return lines.join('\n');
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(getNotesText()); }
    catch { const t = document.createElement('textarea'); t.value = getNotesText(); document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([getNotesText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${notes?.title || 'notes'}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = notes ? [...notes.summary, ...notes.examNotes, ...notes.keyFormulas].join(' ').split(/\s+/).filter(Boolean).length : 0;

  /* ── render guards ── */
  if (status === 'loading' || status === 'unauthenticated') return <LoadingSpinner message="Loading..." />;
  if (isLoading) return <div><Navbar /><LoadingSpinner message="Loading your notes..." /></div>;
  if (error || !notes) return (
    <div><Navbar />
      <main className={styles.notesPage}>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>{error || 'Notes not found'}</h2>
          <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>Back to Dashboard</Link>
        </div>
      </main>
    </div>
  );

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'summary', label: 'Summary', count: notes.summary.length },
    { key: 'exam-notes', label: 'Exam Notes', count: notes.examNotes.length },
    { key: 'formulas', label: 'Key Formulas', count: notes.keyFormulas.length },
    ...(notes.hasDeepAnalysis ? [{ key: 'deep-analysis' as Tab, label: '🔬 Deep Analysis' }] : []),
  ];

  /* ══════════ EDIT MODE ══════════ */
  if (isEditing) {
    return (
      <div>
        <Navbar />
        <main className={styles.notesPage}>
          {/* Edit header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '1.5rem', paddingBottom: '1rem',
            borderBottom: '1px solid var(--border)',
          }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>✏️ Editing Notes</h1>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={cancelEdit} disabled={isSaving} style={outlineBtn}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={isSaving} className="btn btn-primary">
                {isSaving ? 'Saving…' : '💾 Save Changes'}
              </button>
            </div>
          </div>

          {saveError && (
            <div style={{ background: '#fff5f5', color: '#c53030', border: '1px solid #fed7d7', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
              ❌ {saveError}
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.4rem' }}>
              Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem',
                border: '1.5px solid var(--primary, #6c63ff)',
                borderRadius: '8px', fontSize: '1.05rem', fontWeight: 700,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <ListEditor
            label="Summary"
            items={editSummary}
            onChange={setEditSummary}
            placeholder="Add summary points, one per line…"
          />
          <ListEditor
            label="Exam Notes"
            items={editExamNotes}
            onChange={setEditExamNotes}
            placeholder="Add exam notes, one per line…"
          />
          <ListEditor
            label="Key Formulas"
            items={editKeyFormulas}
            onChange={setEditKeyFormulas}
            placeholder="Add formulas, one per line…"
            mono
          />
          {notes.hasDeepAnalysis && (
            <ListEditor
              label="Study Tips"
              items={editStudyTips}
              onChange={setEditStudyTips}
              placeholder="Add study tips, one per line…"
            />
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button onClick={cancelEdit} disabled={isSaving} style={outlineBtn}>Cancel</button>
            <button onClick={saveEdit} disabled={isSaving} className="btn btn-primary">
              {isSaving ? 'Saving…' : '💾 Save Changes'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  /* ══════════ VIEW MODE ══════════ */
  return (
    <div>
      <Navbar />

      {showDeleteModal && (
        <DeleteModal
          title={notes.title}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={isDeleting}
        />
      )}

      <main className={styles.notesPage}>
        <div className={styles.notesHeader}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <h1 className={styles.notesTitle}>{notes.title}</h1>
            {/* Edit & Delete buttons top-right */}
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, marginTop: '0.25rem' }}>
              <button
                onClick={openEdit}
                title="Edit notes"
                style={{
                  padding: '0.45rem 1rem',
                  border: '1.5px solid var(--primary, #6c63ff)',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'var(--primary, #6c63ff)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                title="Delete notes"
                style={{
                  padding: '0.45rem 1rem',
                  border: '1.5px solid #e53e3e',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: '#e53e3e',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>

          <div className={styles.notesMeta}>
            {notes.fileType && <span className="badge">{notes.fileType.toUpperCase()}</span>}
            {notes.difficulty && (
              <span style={{
                background: `${DIFFICULTY_COLORS[notes.difficulty]}20`,
                color: DIFFICULTY_COLORS[notes.difficulty],
                border: `1px solid ${DIFFICULTY_COLORS[notes.difficulty]}40`,
                borderRadius: '4px', padding: '2px 8px',
                fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
              }}>
                {notes.difficulty}
              </span>
            )}
            <span>{new Date(notes.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span>{wordCount} words</span>
            <span>{notes.estimatedReadTime ? `~${notes.estimatedReadTime} min read` : `${Math.max(1, Math.ceil(wordCount / 200))} min read`}</span>
          </div>

          {/* Topic chips */}
          {notes.topics && notes.topics.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}>
              {notes.topics.map((t, i) => (
                <span key={i} style={{
                  background: 'var(--primary, #6c63ff)20', color: 'var(--primary, #6c63ff)',
                  borderRadius: '20px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 500,
                }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Quick action row */}
          <div className={styles.notesActions}>
            <button className={styles.actionButton} onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
            <button className={styles.actionButton} onClick={handleDownload}>Download</button>
            <button className={styles.actionButton} onClick={() => window.print()}>Print</button>
            {!notes.hasDeepAnalysis && (
              <button
                className={styles.actionButton}
                onClick={handleDeepAnalysis}
                disabled={isAnalyzing}
                style={{ background: isAnalyzing ? 'var(--muted)' : 'var(--primary, #6c63ff)', color: '#fff', border: 'none', cursor: isAnalyzing ? 'not-allowed' : 'pointer' }}
              >
                {isAnalyzing ? '⏳ Analyzing…' : '🔬 Deep Analysis'}
              </button>
            )}
          </div>
          {analyzeError && <p style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '0.5rem' }}>❌ {analyzeError}</p>}
          {isAnalyzing && <p style={{ color: 'var(--primary, #6c63ff)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Running deep analysis — this may take 30–60 seconds…</p>}
        </div>

        {/* Tabs */}
        <nav className={styles.tabNav}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <section className={styles.section}>
          {activeTab === 'summary' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h2 className={styles.sectionTitle}>Summary</h2>
                <button onClick={openEdit} style={inlineEditBtn}>✏️ Edit</button>
              </div>
              {notes.summary.length > 0 ? (
                <ul className={styles.summaryList}>
                  {notes.summary.map((item, i) => <li key={i} className={styles.summaryItem}>{item}</li>)}
                </ul>
              ) : <EmptySection label="summary" onEdit={openEdit} />}
            </>
          )}

          {activeTab === 'exam-notes' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h2 className={styles.sectionTitle}>Exam Notes</h2>
                <button onClick={openEdit} style={inlineEditBtn}>✏️ Edit</button>
              </div>
              {notes.examNotes.length > 0 ? (
                <ul className={styles.summaryList}>
                  {notes.examNotes.map((item, i) => <li key={i} className={styles.summaryItem}>{item}</li>)}
                </ul>
              ) : <EmptySection label="exam notes" onEdit={openEdit} />}
            </>
          )}

          {activeTab === 'formulas' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h2 className={styles.sectionTitle}>Key Formulas</h2>
                <button onClick={openEdit} style={inlineEditBtn}>✏️ Edit</button>
              </div>
              {notes.keyFormulas.length > 0 ? (
                <div className={styles.formulaBox}>
                  {notes.keyFormulas.map((formula, i) => <div key={i} className={styles.formulaItem}>{formula}</div>)}
                </div>
              ) : <EmptySection label="formulas" onEdit={openEdit} />}
            </>
          )}

          {activeTab === 'deep-analysis' && notes.hasDeepAnalysis && (
            <div>
              <h2 className={styles.sectionTitle}>🔬 Deep Analysis</h2>

              {notes.studyTips && notes.studyTips.length > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, #6c63ff15, #4f46e510)',
                  border: '1px solid #6c63ff30', borderRadius: '12px',
                  padding: '1.25rem', marginBottom: '1.5rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary, #6c63ff)', margin: 0 }}>💡 Personalized Study Tips</h3>
                    <button onClick={openEdit} style={inlineEditBtn}>✏️ Edit</button>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    {notes.studyTips.map((tip, i) => <li key={i} style={{ marginBottom: '0.4rem', lineHeight: 1.6 }}>{tip}</li>)}
                  </ul>
                </div>
              )}

              {notes.conceptMap && notes.conceptMap.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>🗺️ Concept Map</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                    {notes.conceptMap.map((node, i) => (
                      <div key={i} style={{ border: '1px solid var(--border, #e2e8f0)', borderRadius: '10px', padding: '0.9rem', background: 'var(--card-bg, #fff)' }}>
                        <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--primary, #6c63ff)' }}>{node.concept}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {node.relatedConcepts.map((rc, j) => (
                            <span key={j} style={{ background: 'var(--bg-secondary, #f7fafc)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem' }}>{rc}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {notes.summary.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>📝 Enhanced Summary</h3>
                  <ul className={styles.summaryList}>
                    {notes.summary.map((item, i) => <li key={i} className={styles.summaryItem}>{item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Bottom actions */}
        <div className={styles.actionsBar}>
          <Link href={`/mcq/${id}`} className={styles.actionButton}>Take Quiz</Link>
          <Link href={`/revision/${id}`} className={styles.actionButton}>Start Revision</Link>
          <Link href="/upload" className={styles.actionButton} style={{ background: 'var(--text-light)' }}>Upload Another</Link>
        </div>
      </main>
    </div>
  );
}

/* ── tiny helpers ── */
function EmptySection({ label, onEdit }: { label: string; onEdit: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)', background: 'var(--bg-secondary, #f7fafc)', borderRadius: '10px' }}>
      <p style={{ marginBottom: '0.75rem' }}>No {label} yet.</p>
      <button onClick={onEdit} style={{ ...inlineEditBtn, padding: '0.5rem 1.25rem' }}>+ Add {label}</button>
    </div>
  );
}

const inlineEditBtn: React.CSSProperties = {
  padding: '0.3rem 0.8rem',
  border: '1px solid var(--border, #e2e8f0)',
  borderRadius: '6px',
  background: '#fff',
  color: 'var(--text-light)',
  fontSize: '0.8rem',
  cursor: 'pointer',
  fontWeight: 500,
};

const outlineBtn: React.CSSProperties = {
  padding: '0.6rem 1.25rem',
  border: '1.5px solid var(--border, #e2e8f0)',
  borderRadius: '8px',
  background: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.9rem',
};
