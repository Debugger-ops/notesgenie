'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import styles from '../../styles/dashboard.module.css';

interface FileRecord {
  _id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  notes: { _id: string; title: string }[];
  mcqs: { _id: string }[];
}

/* ── confirm row for deleting a notes record (completed cards) ── */
function NotesDeleteConfirm({
  notesId,
  onDeleted,
  onCancel,
}: {
  notesId: string;
  onDeleted: () => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    const res = await fetch(`/api/notes/${notesId}`, { method: 'DELETE' });
    if (res.ok) onDeleted();
    else setBusy(false);
  };
  return <InlineConfirm label="Delete these notes permanently?" onConfirm={go} onCancel={onCancel} busy={busy} />;
}

/* ── confirm row for removing a whole file record (failed/uploaded cards) ── */
function FileDeleteConfirm({
  fileId,
  onDeleted,
  onCancel,
}: {
  fileId: string;
  onDeleted: () => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
    if (res.ok) onDeleted();
    else setBusy(false);
  };
  return <InlineConfirm label="Remove this file permanently?" onConfirm={go} onCancel={onCancel} busy={busy} />;
}

/* ── shared confirm UI ── */
function InlineConfirm({ label, onConfirm, onCancel, busy }: {
  label: string; onConfirm: () => void; onCancel: () => void; busy: boolean;
}) {
  return (
    <div style={{
      marginTop: '0.75rem', padding: '0.75rem',
      background: '#fff5f5', border: '1px solid #fed7d7',
      borderRadius: '8px', fontSize: '0.82rem',
    }}>
      <p style={{ marginBottom: '0.5rem', color: '#c53030', fontWeight: 600 }}>{label}</p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={onConfirm} disabled={busy} style={{
          flex: 1, padding: '0.4rem', background: '#e53e3e', color: '#fff',
          border: 'none', borderRadius: '6px', fontWeight: 700,
          cursor: busy ? 'not-allowed' : 'pointer', fontSize: '0.8rem', opacity: busy ? 0.7 : 1,
        }}>
          {busy ? 'Removing…' : 'Yes, remove'}
        </button>
        <button onClick={onCancel} disabled={busy} style={{
          flex: 1, padding: '0.4rem', background: '#fff', color: '#555',
          border: '1px solid #e2e8f0', borderRadius: '6px',
          fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem',
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDeleteNotes, setConfirmDeleteNotes] = useState<string | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    setIsLoading(true);
    fetch('/api/history')
      .then((r) => r.json())
      .then((data) => setFiles(data.history || []))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setIsLoading(false));
  }, [status]);

  const removeFile = (fileId: string) => {
    setConfirmDeleteFile(null);
    setFiles((prev) => prev.filter((f) => f._id !== fileId));
  };

  const removeNotes = (fileId: string, notesId: string) => {
    setConfirmDeleteNotes(null);
    setFiles((prev) =>
      prev.map((f) =>
        f._id === fileId ? { ...f, notes: f.notes.filter((n) => n._id !== notesId) } : f
      )
    );
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return <LoadingSpinner message="Loading..." />;
  }

  const totalUploads = files.length;
  const notesGenerated = files.filter((f) => f.notes?.length > 0).length;
  const mcqsCreated = files.filter((f) => f.mcqs?.length > 0).length;
  const completedFiles = files.filter((f) => f.status === 'completed').length;

  const getStatusBadge = (s: string) => {
    if (s === 'completed') return 'badge badge-success';
    if (s === 'processing') return 'badge badge-warning';
    if (s === 'failed') return 'badge badge-error';
    return 'badge';
  };

  const getStatusLabel = (s: string) => {
    if (s === 'completed') return 'Completed';
    if (s === 'processing') return 'Processing';
    if (s === 'failed') return 'Failed';
    if (s === 'uploaded') return 'Uploaded';
    return s;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const removeBtn: React.CSSProperties = {
    background: 'transparent',
    color: '#e53e3e',
    border: '1px solid #e53e3e',
    borderRadius: '6px',
    padding: '0.3rem 0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.8rem',
  };

  return (
    <div>
      <Navbar />
      <main className={styles.dashboard}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>
              Welcome back, {session?.user?.name || 'Student'}!
            </h1>
          </div>
          <div className={styles.headerActions}>
            <Link href="/upload" className="btn btn-primary">+ Upload Notes</Link>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <StatsCard icon="📂" value={totalUploads} label="Total Uploads" color="var(--primary)" />
          <StatsCard icon="📝" value={notesGenerated} label="Notes Generated" color="var(--accent)" />
          <StatsCard icon="❓" value={mcqsCreated} label="MCQs Created" color="var(--warning)" />
          <StatsCard icon="✅" value={completedFiles} label="Completed" color="var(--success)" />
        </div>

        {error && (
          <div style={{ background: '#fff5f5', color: 'var(--error)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {/* File History */}
        <section className={styles.fileSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Your Uploads</h2>
            {files.some((f) => f.status === 'failed' || f.status === 'uploaded') && (
              <button
                onClick={() => {
                  const failedIds = files
                    .filter((f) => f.status === 'failed' || f.status === 'uploaded')
                    .map((f) => f._id);
                  if (!window.confirm(`Remove all ${failedIds.length} failed/pending uploads?`)) return;
                  Promise.all(failedIds.map((id) => fetch(`/api/files/${id}`, { method: 'DELETE' }))).then(() => {
                    setFiles((prev) => prev.filter((f) => f.status !== 'failed' && f.status !== 'uploaded'));
                  });
                }}
                style={{
                  ...removeBtn,
                  padding: '0.4rem 1rem',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                🗑️ Clear all failed
              </button>
            )}
          </div>

          {isLoading ? (
            <div style={{ padding: '40px' }}>
              <LoadingSpinner message="Loading your files..." />
            </div>
          ) : files.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📚</div>
              <h3 className={styles.emptyTitle}>No uploads yet</h3>
              <p className={styles.emptyText}>
                Upload your first set of notes to get started with AI-powered summaries.
              </p>
              <Link href="/upload" className="btn btn-primary">Upload Your First Notes</Link>
            </div>
          ) : (
            <div className={styles.fileGrid}>
              {files.map((file) => (
                <div
                  key={file._id}
                  className={styles.fileCard}
                  style={file.status === 'failed' ? { borderColor: '#fed7d7', background: '#fff5f5' } : undefined}
                >
                  <div className={styles.fileCardHeader}>
                    <span className={styles.fileIcon}>
                      {file.fileType === 'pdf' ? '📄' : '📊'}
                    </span>
                    <span className={getStatusBadge(file.status)}>
                      {getStatusLabel(file.status)}
                    </span>
                  </div>

                  <h3 className={styles.fileTitle}>{file.originalName || file.fileName}</h3>

                  <div className={styles.fileMeta}>
                    <span className="badge">{file.fileType.toUpperCase()}</span>
                    <span>{formatDate(file.createdAt)}</span>
                  </div>

                  {/* Failed or stuck-uploaded: show Remove button */}
                  {(file.status === 'failed' || file.status === 'uploaded') && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <Link href="/upload" className={styles.actionButton} style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem' }}>
                        Retry Upload
                      </Link>
                      <button
                        style={removeBtn}
                        onClick={() =>
                          setConfirmDeleteFile(
                            confirmDeleteFile === file._id ? null : file._id
                          )
                        }
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  )}

                  {/* Completed: view / edit / delete notes */}
                  {file.status === 'completed' && (
                    <div className={styles.fileActions}>
                      {file.notes.length > 0 && (
                        <>
                          <Link href={`/notes/${file.notes[0]._id}`} className={styles.actionButton}>
                            View Notes
                          </Link>
                          <button
                            className={styles.actionButton}
                            onClick={() => router.push(`/notes/${file.notes[0]._id}?edit=1`)}
                            style={{ background: 'transparent', color: 'var(--primary, #6c63ff)', border: '1px solid var(--primary, #6c63ff)' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className={styles.actionButton}
                            onClick={() =>
                              setConfirmDeleteNotes(
                                confirmDeleteNotes === file.notes[0]._id ? null : file.notes[0]._id
                              )
                            }
                            style={{ background: 'transparent', color: '#e53e3e', border: '1px solid #e53e3e' }}
                          >
                            🗑️ Delete
                          </button>
                        </>
                      )}
                      {file.mcqs.length > 0 && (
                        <Link href={`/mcq/${file.mcqs[0]._id}`} className={styles.actionButton}>
                          Take Quiz
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Inline confirms */}
                  {confirmDeleteFile === file._id && (
                    <FileDeleteConfirm
                      fileId={file._id}
                      onDeleted={() => removeFile(file._id)}
                      onCancel={() => setConfirmDeleteFile(null)}
                    />
                  )}
                  {file.notes.length > 0 && confirmDeleteNotes === file.notes[0]._id && (
                    <NotesDeleteConfirm
                      notesId={file.notes[0]._id}
                      onDeleted={() => removeNotes(file._id, file.notes[0]._id)}
                      onCancel={() => setConfirmDeleteNotes(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
