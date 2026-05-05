import Link from 'next/link';
import styles from '../styles/landing.module.css';

export default function LandingPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Transform Your Notes Into Exam-Ready Summaries
          </h1>
          <p className={styles.heroSubtitle}>
            Upload your PDFs and let AI create concise summaries, practice MCQs,
            and flashcards — all in seconds.
          </p>
          <div className={styles.heroCta}>
            <Link href="/auth/signup" className={styles.ctaButton}>
              Get Started Free
            </Link>
            <Link href="#features" className={styles.ctaButtonSecondary}>
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <h2 className={styles.featuresTitle}>Everything You Need to Ace Your Exams</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>&#x1F9E0;</div>
            <h3 className={styles.featureTitle}>AI Summarization</h3>
            <p className={styles.featureDescription}>
              Upload your notes and get instant, well-structured summaries highlighting
              key concepts, definitions, and important formulas.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>&#x1F4DD;</div>
            <h3 className={styles.featureTitle}>MCQ Generator</h3>
            <p className={styles.featureDescription}>
              Automatically generate multiple-choice questions from your notes to test
              your understanding and identify knowledge gaps.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>&#x1F504;</div>
            <h3 className={styles.featureTitle}>Revision Mode</h3>
            <p className={styles.featureDescription}>
              Use interactive flashcards to review key concepts. Mark what you know
              and focus on what you need to revise.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howItWorks}>
        <h2 className={styles.featuresTitle}>How It Works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3 className={styles.stepTitle}>Upload Your PDF</h3>
            <p className={styles.stepDesc}>
              Drag and drop your lecture notes, textbook PDFs, or presentations.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3 className={styles.stepTitle}>AI Processes It</h3>
            <p className={styles.stepDesc}>
              Our AI extracts text, creates summaries, and generates practice questions.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3 className={styles.stepTitle}>Study &amp; Revise</h3>
            <p className={styles.stepDesc}>
              Review summaries, take quizzes, and use flashcards to master the material.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to Ace Your Exams?</h2>
          <p className={styles.ctaDescription}>
            Join students who are already using NoteGenie to study smarter, not harder.
          </p>
          <Link href="/auth/signup" className={styles.ctaButton}>
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} NoteGenie. All rights reserved.</p>
      </footer>
    </div>
  );
}
