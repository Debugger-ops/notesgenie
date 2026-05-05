'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import FlashCard from '../../../components/FlashCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import styles from '../../../styles/revision.module.css';

interface CardData {
  question: string;
  answer: string;
  explanation?: string;
}

export default function RevisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const [cards, setCards] = useState<CardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [unknown, setUnknown] = useState<Set<number>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchCards = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/mcqs/${id}`);
        if (!res.ok) throw new Error('Failed to load revision cards');
        const data = await res.json();
        // API returns { mcq: { questions: [...] } }
        const mcqs = data.mcq?.questions || data.mcqs || [];
        setCards(
          mcqs.map((mcq: { question: string; options: string[]; correctAnswer: number; explanation: string }) => ({
            question: mcq.question,
            answer: mcq.options[mcq.correctAnswer],
            explanation: mcq.explanation,
          }))
        );
      } catch {
        setError('Failed to load revision cards. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
  }, [status, id]);

  const goToNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, cards.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const markKnown = useCallback(() => {
    setKnown((prev) => {
      const next = new Set(prev);
      next.add(currentIndex);
      return next;
    });
    setUnknown((prev) => {
      const next = new Set(prev);
      next.delete(currentIndex);
      return next;
    });

    // Auto-advance or complete
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      checkCompletion(currentIndex, true);
    }
  }, [currentIndex, cards.length]);

  const markUnknown = useCallback(() => {
    setUnknown((prev) => {
      const next = new Set(prev);
      next.add(currentIndex);
      return next;
    });
    setKnown((prev) => {
      const next = new Set(prev);
      next.delete(currentIndex);
      return next;
    });

    // Auto-advance or complete
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      checkCompletion(currentIndex, false);
    }
  }, [currentIndex, cards.length]);

  const checkCompletion = (lastIndex: number, lastKnown: boolean) => {
    const totalRated = known.size + unknown.size + 1; // +1 for current
    if (totalRated >= cards.length) {
      setIsComplete(true);
      saveProgress(lastIndex, lastKnown);
    }
  };

  const saveProgress = async (lastIndex: number, lastKnown: boolean) => {
    const knownCount = known.size + (lastKnown ? 1 : 0);
    const unknownCount = unknown.size + (lastKnown ? 0 : 1);

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: id,
          type: 'revision',
          known: knownCount,
          unknown: unknownCount,
          score: Math.round((knownCount / cards.length) * 100),
          total: cards.length,
        }),
      });
    } catch {
      // Progress save failed silently
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());
    setIsComplete(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isComplete || isLoading || cards.length === 0) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleFlip();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'k':
        case 'K':
          if (isFlipped) {
            e.preventDefault();
            markKnown();
          }
          break;
        case 'u':
        case 'U':
          if (isFlipped) {
            e.preventDefault();
            markUnknown();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isComplete, isLoading, cards.length, isFlipped, handleFlip, goToPrevious, goToNext, markKnown, markUnknown]);

  if (status === 'loading' || status === 'unauthenticated') {
    return <LoadingSpinner message="Loading..." />;
  }

  if (isLoading) {
    return (
      <div>
        <Navbar />
        <LoadingSpinner message="Loading revision cards..." />
      </div>
    );
  }

  if (error || cards.length === 0) {
    return (
      <div>
        <Navbar />
        <main className={styles.revisionPage}>
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <h2>{error || 'No revision cards available'}</h2>
            <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (isComplete) {
    const knownCount = known.size;
    const unknownCount = unknown.size;
    const scorePercentage = Math.round((knownCount / cards.length) * 100);

    return (
      <div>
        <Navbar />
        <main className={styles.revisionPage}>
          <div className={styles.completionCard}>
            <h2 className={styles.completionTitle}>Revision Complete!</h2>
            <div className={styles.completionStats}>
              <div className={styles.statItem}>
                <strong>{knownCount}</strong> Known
              </div>
              <div className={styles.statItem}>
                <strong>{unknownCount}</strong> Unknown
              </div>
              <div className={styles.statItem}>
                <strong>{scorePercentage}%</strong> Score
              </div>
            </div>
            <p>
              {scorePercentage >= 80
                ? 'Great job! You have a solid grasp of this material.'
                : scorePercentage >= 60
                ? 'Good progress! Focus on the cards you marked as unknown.'
                : 'Keep practicing! Regular revision will help you improve.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button className={styles.restartButton} onClick={handleRestart}>
                Restart Revision
              </button>
              <Link href={`/mcq/${id}`} className="btn btn-outline">
                Take Quiz
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const getDotClass = (index: number): string => {
    const classes = [styles.dot];
    if (index === currentIndex) classes.push(styles.dotCurrent);
    else if (known.has(index)) classes.push(styles.dotKnown);
    else if (unknown.has(index)) classes.push(styles.dotUnknown);
    return classes.join(' ');
  };

  return (
    <div>
      <Navbar />
      <main className={styles.revisionPage}>
        <div className={styles.revisionHeader}>
          <h1 className={styles.revisionTitle}>
            Revision Mode ({currentIndex + 1} / {cards.length})
          </h1>
        </div>

        {/* Progress Dots */}
        <div className={styles.progressDots}>
          {cards.map((_, index) => (
            <span
              key={index}
              className={getDotClass(index)}
              onClick={() => {
                setCurrentIndex(index);
                setIsFlipped(false);
              }}
              role="button"
              tabIndex={0}
              aria-label={`Go to card ${index + 1}`}
            />
          ))}
        </div>

        {/* Flashcard */}
        <FlashCard
          question={cards[currentIndex].question}
          answer={
            cards[currentIndex].explanation
              ? `${cards[currentIndex].answer}\n\n${cards[currentIndex].explanation}`
              : cards[currentIndex].answer
          }
          isFlipped={isFlipped}
          onFlip={handleFlip}
        />

        {/* Navigation */}
        <div className={styles.navigationButtons}>
          <button
            className={`${styles.navButton} btn btn-outline`}
            onClick={goToPrevious}
            disabled={currentIndex === 0}
          >
            Previous
          </button>
          <button
            className={`${styles.navButton} btn btn-primary`}
            onClick={goToNext}
            disabled={currentIndex === cards.length - 1}
          >
            Next
          </button>
        </div>

        {/* Known/Unknown Rating */}
        {isFlipped && (
          <div className={styles.ratingButtons}>
            <button
              className={`${styles.ratingButton} ${styles.knownButton}`}
              onClick={markKnown}
            >
              I Know This (K)
            </button>
            <button
              className={`${styles.ratingButton} ${styles.unknownButton}`}
              onClick={markUnknown}
            >
              Need to Review (U)
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '1rem' }}>
          Space: flip card | Arrows: navigate | K: known | U: unknown
        </p>
      </main>
    </div>
  );
}
