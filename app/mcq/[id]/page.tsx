'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import MCQCard from '../../../components/MCQCard';
import ProgressBar from '../../../components/ProgressBar';
import LoadingSpinner from '../../../components/LoadingSpinner';
import styles from '../../../styles/mcq.module.css';

interface MCQ {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export default function MCQPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState<Record<number, boolean>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  const fetchMCQs = useCallback(async () => {
    if (status !== 'authenticated') return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/mcqs/${id}`);
      if (!res.ok) throw new Error('Failed to load MCQs');
      const data = await res.json();
      const questions = data.mcq?.questions || data.mcqs || [];
      setMcqs(questions);
      if (questions.length === 0) {
        setError('No questions were generated. The AI may need a retry — click "Regenerate" below.');
      }
    } catch {
      setError('Failed to load questions. Make sure Ollama is running.');
    } finally {
      setIsLoading(false);
    }
  }, [status, id]);

  useEffect(() => {
    fetchMCQs();
  }, [fetchMCQs]);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError('');
    try {
      const res = await fetch('/api/generate-mcqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesId: id, count: 10 }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to regenerate');
      }
      const data = await res.json();
      const newId = data.mcqs?._id;
      if (newId) {
        router.push(`/mcq/${newId}`);
      } else {
        await fetchMCQs();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regeneration failed. Is Ollama running?');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAnswer = useCallback((questionIndex: number, selectedIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: selectedIndex }));
    setShowResults((prev) => ({ ...prev, [questionIndex]: true }));
  }, []);

  const goToNext = () => {
    if (currentIndex < mcqs.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleFinish = async () => {
    setIsComplete(true);
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mcqId: id,
          type: 'mcq',
          answers,
          score: getScore(),
          totalQuestions: mcqs.length,
        }),
      });
    } catch {
      // Progress save failed silently
    }
  };

  const getScore = (): number => {
    let correct = 0;
    Object.entries(answers).forEach(([index, answer]) => {
      if (mcqs[Number(index)]?.correctAnswer === answer) {
        correct++;
      }
    });
    return correct;
  };

  const getScorePercentage = (): number => {
    if (mcqs.length === 0) return 0;
    return Math.round((getScore() / mcqs.length) * 100);
  };

  const handleRetry = () => {
    setAnswers({});
    setShowResults({});
    setCurrentIndex(0);
    setIsComplete(false);
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return <LoadingSpinner message="Loading..." />;
  }

  if (isLoading) {
    return (
      <div>
        <Navbar />
        <LoadingSpinner message="Loading questions..." />
      </div>
    );
  }

  if (error || mcqs.length === 0) {
    return (
      <div>
        <Navbar />
        <main className={styles.mcqPage}>
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <h2>{error || 'No questions available'}</h2>
            <p style={{ color: 'var(--text-light)', margin: '1rem 0' }}>
              This can happen if the AI had trouble generating questions from your document.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate MCQs'}
              </button>
              <Link href="/dashboard" className="btn btn-outline">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isComplete) {
    const score = getScore();
    const percentage = getScorePercentage();

    return (
      <div>
        <Navbar />
        <main className={styles.mcqPage}>
          <div className={styles.resultsCard}>
            <div className={styles.scoreCircle}>
              <div className={styles.scoreValue}>{percentage}%</div>
              <div className={styles.scoreLabel}>Score</div>
            </div>
            <div className={styles.resultsSummary}>
              <div className={styles.resultItem}>
                <strong>{score}</strong> correct out of <strong>{mcqs.length}</strong> questions
              </div>
              <div className={styles.resultItem}>
                {percentage >= 80
                  ? 'Excellent work! You have a strong understanding of this material.'
                  : percentage >= 60
                  ? 'Good effort! Review the topics you missed to improve further.'
                  : 'Keep studying! Consider using revision mode to strengthen your knowledge.'}
              </div>
            </div>
            <div className={styles.navigationButtons}>
              <button className={`${styles.navButton} btn btn-outline`} onClick={handleRetry}>
                Retry Quiz
              </button>
              <Link href={`/revision/${id}`} className={`${styles.navButton} btn btn-primary`}>
                Revision Mode
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const currentMCQ = mcqs[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === mcqs.length;

  return (
    <div>
      <Navbar />
      <main className={styles.mcqPage}>
        <div className={styles.mcqHeader}>
          <h1 className={styles.mcqTitle}>MCQ Quiz</h1>
          <span style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>
            Question {currentIndex + 1} of {mcqs.length}
          </span>
        </div>

        <div className={styles.progressSection}>
          <ProgressBar
            current={answeredCount}
            total={mcqs.length}
            label="Progress"
          />
        </div>

        <MCQCard
          question={currentMCQ.question}
          options={currentMCQ.options}
          correctAnswer={currentMCQ.correctAnswer}
          explanation={currentMCQ.explanation}
          questionNumber={currentIndex + 1}
          onAnswer={(selectedIndex) => handleAnswer(currentIndex, selectedIndex)}
          showResult={showResults[currentIndex] || false}
        />

        <div className={styles.navigationButtons}>
          <button
            className={`${styles.navButton} btn btn-outline`}
            onClick={goToPrevious}
            disabled={currentIndex === 0}
          >
            Previous
          </button>

          {currentIndex === mcqs.length - 1 && allAnswered ? (
            <button
              className={`${styles.navButton} btn btn-primary`}
              onClick={handleFinish}
            >
              Finish Quiz
            </button>
          ) : (
            <button
              className={`${styles.navButton} btn btn-primary`}
              onClick={goToNext}
              disabled={currentIndex === mcqs.length - 1}
            >
              Next
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
