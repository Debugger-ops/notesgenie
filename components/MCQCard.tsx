'use client';

import { useState } from 'react';
import styles from '../styles/mcq.module.css';

interface MCQCardProps {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  questionNumber: number;
  onAnswer: (selectedIndex: number) => void;
  showResult: boolean;
}

export default function MCQCard({
  question,
  options,
  correctAnswer,
  explanation,
  questionNumber,
  onAnswer,
  showResult,
}: MCQCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedIndex(index);
    onAnswer(index);
  };

  const getOptionClass = (index: number): string => {
    const classes = [styles.option];

    if (showResult) {
      if (index === correctAnswer) {
        classes.push(styles.optionCorrect);
      } else if (index === selectedIndex) {
        classes.push(styles.optionIncorrect);
      }
    } else if (index === selectedIndex) {
      classes.push(styles.optionSelected);
    }

    return classes.join(' ');
  };

  return (
    <div className={styles.questionCard}>
      <div className={styles.questionNumber}>Question {questionNumber}</div>
      <div className={styles.questionText}>{question}</div>

      <div className={styles.optionsList}>
        {options.map((option, index) => (
          <button
            key={index}
            className={getOptionClass(index)}
            onClick={() => handleSelect(index)}
            disabled={showResult}
            type="button"
          >
            <span className={styles.optionRadio} />
            <span className={styles.optionText}>{option}</span>
          </button>
        ))}
      </div>

      {showResult && explanation && (
        <div className={styles.explanation}>
          <div className={styles.explanationLabel}>Explanation</div>
          <p className={styles.explanationText}>{explanation}</p>
        </div>
      )}
    </div>
  );
}
