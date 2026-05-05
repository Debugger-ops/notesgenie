interface StatsCardProps {
  icon: string;
  value: string | number;
  label: string;
  color?: string;
}

export default function StatsCard({ icon, value, label, color = 'var(--primary)' }: StatsCardProps) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow)',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        borderLeft: `4px solid ${color}`,
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
    >
      <div
        style={{
          fontSize: '2rem',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text)',
            lineHeight: 1.2,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: '0.813rem',
            color: 'var(--text-light)',
            fontWeight: 500,
            marginTop: '0.125rem',
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
