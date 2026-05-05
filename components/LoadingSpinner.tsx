interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        gap: '1rem',
      }}
    >
      <div className="spinner" />
      {message && (
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-light)',
            fontWeight: 500,
            margin: 0,
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
