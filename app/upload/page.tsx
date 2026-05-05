'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import FileUploadZone from '../../components/FileUploadZone';
import LoadingSpinner from '../../components/LoadingSpinner';
import styles from '../../styles/upload.module.css';

type ProcessingStep = 'idle' | 'checking' | 'extracting' | 'summarizing' | 'creating_mcqs' | 'done' | 'error';

const STEP_MESSAGES: Record<ProcessingStep, string> = {
  idle: '',
  checking: 'Checking AI service...',
  extracting: 'Extracting text from your file...',
  summarizing: 'Generating AI summary...',
  creating_mcqs: 'Creating MCQs and flashcards...',
  done: 'Processing complete!',
  error: 'Something went wrong.',
};

interface AIStatus {
  status: 'checking' | 'ok' | 'error';
  provider?: string;
  message?: string;
}

export default function UploadPage() {
  const { status } = useSession();
  const router = useRouter();
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [notesId, setNotesId] = useState<string | null>(null);
  const [mcqId, setMcqId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [aiStatus, setAiStatus] = useState<AIStatus>({ status: 'checking' });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  // Check AI health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (data.status === 'ok') {
          setAiStatus({ status: 'ok', provider: data.provider, message: data.message });
        } else {
          setAiStatus({ status: 'error', provider: data.provider, message: data.message });
          setError(data.message || 'AI service unavailable');
        }
      } catch {
        setAiStatus({ status: 'error', message: 'Cannot reach AI service' });
        setError('Cannot reach AI service. Check Settings to configure a provider.');
      }
    };
    checkHealth();
  }, []);

  if (status === 'loading' || status === 'unauthenticated') {
    return <LoadingSpinner message="Loading..." />;
  }

  const handleUploadComplete = async (data: Record<string, unknown>) => {
    const fileId = data.fileId as string;
    if (!fileId) {
      setError('Upload succeeded but no file ID was returned.');
      return;
    }

    setProcessingStep('checking');
    setError('');

    try {
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();
      if (healthData.status !== 'ok') {
        throw new Error(healthData.message || 'AI service is not available. Go to Settings to configure a provider.');
      }
    } catch (err) {
      setProcessingStep('error');
      setError(err instanceof Error ? err.message : 'AI service check failed');
      return;
    }

    setProcessingStep('extracting');

    try {
      const progressInterval = setInterval(() => {
        setProcessingStep((prev) => {
          if (prev === 'extracting') return 'summarizing';
          if (prev === 'summarizing') return 'creating_mcqs';
          return prev;
        });
      }, 3000);

      const res = await fetch('/api/process-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Processing failed');
      }

      const result = await res.json();
      setNotesId(result.notesId);
      setMcqId(result.mcqId);
      setProcessingStep('done');
    } catch (err) {
      setProcessingStep('error');
      const msg = err instanceof Error ? err.message : 'Processing failed.';
      if (msg.includes('rate') || msg.includes('429')) {
        setError('Rate limit hit — the AI service is temporarily busy. Please wait a moment and try again.');
      } else {
        setError(msg);
      }
    }
  };

  const getStepIndex = (step: ProcessingStep): number => {
    const steps: ProcessingStep[] = ['checking', 'extracting', 'summarizing', 'creating_mcqs', 'done'];
    return steps.indexOf(step);
  };

  const isStepCompleted = (step: ProcessingStep): boolean => {
    return getStepIndex(processingStep) > getStepIndex(step);
  };

  const isStepActive = (step: ProcessingStep): boolean => {
    return processingStep === step;
  };

  const providerLabel: Record<string, string> = {
    groq: '⚡ Groq',
    gemini: '✨ Gemini',
    ollama: '🖥️ Ollama (Local)',
  };

  return (
    <div>
      <Navbar />
      <main className={styles.uploadPage}>
        <div className={styles.uploadHeader}>
          <h1 className={styles.uploadTitle}>Upload Your Notes</h1>
          <p className={styles.uploadSubtitle}>
            Upload a PDF or PPTX file and let AI create summaries, MCQs, and flashcards for you.
          </p>
        </div>

        {/* AI Status Banner */}
        {aiStatus.status === 'error' && processingStep === 'idle' && (
          <div style={{
            background: 'rgba(229, 62, 62, 0.1)',
            border: '1px solid rgba(229, 62, 62, 0.3)',
            borderRadius: 'var(--radius)',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            color: 'var(--error, #e53e3e)',
          }}>
            <strong>AI Not Ready:</strong> {error}
            <br />
            <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
              Go to{' '}
              <Link href="/settings" style={{ color: 'var(--error, #e53e3e)', textDecoration: 'underline' }}>
                Settings
              </Link>{' '}
              to configure your AI provider (Groq / Gemini are free).
            </span>
          </div>
        )}

        {aiStatus.status === 'ok' && processingStep === 'idle' && (
          <div style={{
            background: 'rgba(72, 187, 120, 0.1)',
            border: '1px solid rgba(72, 187, 120, 0.3)',
            borderRadius: 'var(--radius)',
            padding: '0.75rem 1.25rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: 'var(--success, #48bb78)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>
              AI Ready — {aiStatus.provider ? providerLabel[aiStatus.provider] || aiStatus.provider : 'connected'}
            </span>
            <Link href="/settings" style={{ color: 'var(--success, #48bb78)', fontSize: '0.8rem' }}>
              Change provider
            </Link>
          </div>
        )}

        <div className={styles.uploadContent}>
          {processingStep === 'idle' && (
            <FileUploadZone onUploadComplete={handleUploadComplete} />
          )}

          {processingStep !== 'idle' && (
            <div className={styles.processingStatus}>
              {(['checking', 'extracting', 'summarizing', 'creating_mcqs'] as ProcessingStep[]).map((step) => (
                <div key={step} className={styles.statusText}>
                  <span className={styles.statusIcon}>
                    {isStepCompleted(step) ? '✅' : isStepActive(step) ? '⏳' : '⭕'}
                  </span>
                  <span>{STEP_MESSAGES[step]}</span>
                </div>
              ))}

              {processingStep === 'done' && (
                <div className={styles.statusText}>
                  <span className={styles.statusIcon}>✅</span>
                  <span>{STEP_MESSAGES.done}</span>
                </div>
              )}

              {processingStep === 'error' && (
                <div className={styles.statusText} style={{ color: 'var(--error)' }}>
                  <span className={styles.statusIcon}>❌</span>
                  <span>{error || STEP_MESSAGES.error}</span>
                </div>
              )}
            </div>
          )}

          {processingStep === 'done' && notesId && (
            <div className={styles.uploadActions}>
              <Link href={`/notes/${notesId}`} className="btn btn-primary">
                View Notes
              </Link>
              {mcqId && (
                <Link href={`/mcq/${mcqId}`} className="btn btn-outline">
                  Take Quiz
                </Link>
              )}
            </div>
          )}

          {processingStep === 'error' && (
            <div className={styles.uploadActions}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setProcessingStep('idle');
                  setError('');
                  setNotesId(null);
                  setMcqId(null);
                }}
              >
                Try Again
              </button>
              <Link href="/settings" className="btn btn-outline">
                Check AI Settings
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
