'use client';

import styles from '../styles/revision.module.css';

interface FlashCardProps {
  question: string;
  answer: string;
  isFlipped: boolean;
  onFlip: () => void;
}

export default function FlashCard({ question, answer, isFlipped, onFlip }: FlashCardProps) {
  return (
    <div className={styles.cardContainer}>
      <div
        className={`${styles.card} ${isFlipped ? styles.cardFlipped : ''}`}
        onClick={onFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onFlip();
          }
        }}
        aria-label={isFlipped ? 'Showing answer. Click to show question.' : 'Showing question. Click to show answer.'}
      >
        {/* Front - Question */}
        <div className={`${styles.cardFace} ${styles.cardFront}`}>
          <div className={styles.cardFrontLabel}>Question</div>
          <div className={styles.cardFrontText}>{question}</div>
          <div className={styles.cardFlipHint}>Click to reveal answer</div>
        </div>

        {/* Back - Answer */}
        <div className={`${styles.cardFace} ${styles.cardBack}`}>
          <div className={styles.cardBackLabel}>Answer</div>
          <div className={styles.cardBackText}>{answer}</div>
        </div>
      </div>
    </div>
  );
}
