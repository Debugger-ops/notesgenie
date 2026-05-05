'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';

type Provider = 'groq' | 'gemini' | 'ollama';

interface Settings {
  aiProvider: Provider;
  groqApiKey: string;
  geminiApiKey: string;
  groqModel: string;
  geminiModel: string;
  ollamaModel: string;
  hasGroqKey?: boolean;
  hasGeminiKey?: boolean;
}

const GROQ_MODELS = [
  { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (fastest, free)' },
  { value: 'llama3-8b-8192', label: 'Llama 3 8B (free)' },
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (best quality)' },
  { value: 'gemma2-9b-it', label: 'Gemma 2 9B (free)' },
  { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (long context, free)' },
];

const GEMINI_MODELS = [
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (fast, free)' },
  { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B (fastest, free)' },
  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp (latest, free)' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (best quality)' },
];

const PROVIDER_INFO: Record<Provider, { name: string; badge: string; color: string; description: string; freeNote: string }> = {
  groq: {
    name: 'Groq',
    badge: 'FREE',
    color: '#f97316',
    description: 'Ultra-fast inference on open-source models. Get a free API key at console.groq.com',
    freeNote: 'Free tier: 14,400 requests/day on Llama models',
  },
  gemini: {
    name: 'Google Gemini',
    badge: 'FREE',
    color: '#4285f4',
    description: 'Google\'s powerful AI. Get a free API key at aistudio.google.com',
    freeNote: 'Free tier: 1,500 requests/day on Flash models',
  },
  ollama: {
    name: 'Ollama (Local)',
    badge: 'LOCAL',
    color: '#48bb78',
    description: 'Run AI completely offline on your own machine. No API key needed.',
    freeNote: 'Completely free and private — runs on your computer',
  },
};

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    aiProvider: 'groq',
    groqApiKey: '',
    geminiApiKey: '',
    groqModel: 'llama-3.1-8b-instant',
    geminiModel: 'gemini-1.5-flash',
    ollamaModel: 'llama3.1:8b-instruct',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<Provider | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [saveMsg, setSaveMsg] = useState('');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/user-settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings((prev) => ({ ...prev, ...data }));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [status]);

  if (status === 'loading' || status === 'unauthenticated') {
    return <LoadingSpinner message="Loading..." />;
  }

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/user-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaveMsg('✅ Settings saved successfully!');
      } else {
        setSaveMsg('❌ Failed to save settings.');
      }
    } catch {
      setSaveMsg('❌ Network error.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleTest = async (provider: Provider) => {
    setTestingProvider(provider);
    try {
      const res = await fetch('/api/user-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [provider]: data }));
    } catch {
      setTestResults((prev) => ({ ...prev, [provider]: { ok: false, message: 'Connection failed' } }));
    } finally {
      setTestingProvider(null);
    }
  };

  if (isLoading) return <LoadingSpinner message="Loading settings..." />;

  return (
    <div>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            ⚙️ AI Settings
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
            Choose your AI provider and configure API keys. All three providers have free tiers.
          </p>
        </div>

        {/* Provider Selection */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Select AI Provider
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {(['groq', 'gemini', 'ollama'] as Provider[]).map((p) => {
              const info = PROVIDER_INFO[p];
              const isSelected = settings.aiProvider === p;
              return (
                <button
                  key={p}
                  onClick={() => setSettings((s) => ({ ...s, aiProvider: p }))}
                  style={{
                    border: isSelected ? `2px solid ${info.color}` : '2px solid var(--border, #e2e8f0)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    background: isSelected ? `${info.color}15` : 'var(--card-bg, #fff)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: isSelected ? info.color : 'inherit' }}>
                      {info.name}
                    </span>
                    <span style={{
                      background: info.color,
                      color: '#fff',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}>
                      {info.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>
                    {info.description}
                  </p>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: info.color, fontWeight: 500 }}>
                    {info.freeNote}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Groq Config */}
        {settings.aiProvider === 'groq' && (
          <ProviderConfig
            title="Groq Configuration"
            color={PROVIDER_INFO.groq.color}
            apiKeyLabel="Groq API Key"
            apiKeyPlaceholder="gsk_..."
            apiKeyValue={settings.groqApiKey}
            showKey={showGroqKey}
            onToggleShow={() => setShowGroqKey((v) => !v)}
            onKeyChange={(v) => setSettings((s) => ({ ...s, groqApiKey: v }))}
            modelLabel="Model"
            models={GROQ_MODELS}
            modelValue={settings.groqModel}
            onModelChange={(v) => setSettings((s) => ({ ...s, groqModel: v }))}
            onTest={() => handleTest('groq')}
            isTesting={testingProvider === 'groq'}
            testResult={testResults['groq']}
            helpLink="https://console.groq.com/keys"
            helpText="Get free API key at console.groq.com"
          />
        )}

        {/* Gemini Config */}
        {settings.aiProvider === 'gemini' && (
          <ProviderConfig
            title="Google Gemini Configuration"
            color={PROVIDER_INFO.gemini.color}
            apiKeyLabel="Gemini API Key"
            apiKeyPlaceholder="AIza..."
            apiKeyValue={settings.geminiApiKey}
            showKey={showGeminiKey}
            onToggleShow={() => setShowGeminiKey((v) => !v)}
            onKeyChange={(v) => setSettings((s) => ({ ...s, geminiApiKey: v }))}
            modelLabel="Model"
            models={GEMINI_MODELS}
            modelValue={settings.geminiModel}
            onModelChange={(v) => setSettings((s) => ({ ...s, geminiModel: v }))}
            onTest={() => handleTest('gemini')}
            isTesting={testingProvider === 'gemini'}
            testResult={testResults['gemini']}
            helpLink="https://aistudio.google.com/app/apikey"
            helpText="Get free API key at aistudio.google.com"
          />
        )}

        {/* Ollama Config */}
        {settings.aiProvider === 'ollama' && (
          <section style={{
            border: `1px solid ${PROVIDER_INFO.ollama.color}40`,
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
            background: `${PROVIDER_INFO.ollama.color}08`,
          }}>
            <h3 style={{ fontWeight: 600, marginBottom: '1rem', color: PROVIDER_INFO.ollama.color }}>
              Ollama Configuration
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Model
              </label>
              <input
                type="text"
                value={settings.ollamaModel}
                onChange={(e) => setSettings((s) => ({ ...s, ollamaModel: e.target.value }))}
                placeholder="e.g. llama3.1:8b-instruct"
                style={inputStyle}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                Run <code>ollama pull llama3.1:8b-instruct</code> to download the model
              </p>
            </div>
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
            }}>
              <strong>Requirements:</strong> Ollama must be installed and running on your machine.
              Download at <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{ color: PROVIDER_INFO.ollama.color }}>ollama.com</a>
            </div>
            <button
              onClick={() => handleTest('ollama')}
              disabled={testingProvider === 'ollama'}
              style={{ ...testBtnStyle, marginTop: '1rem', borderColor: PROVIDER_INFO.ollama.color, color: PROVIDER_INFO.ollama.color }}
            >
              {testingProvider === 'ollama' ? 'Testing…' : 'Test Connection'}
            </button>
            {testResults['ollama'] && (
              <TestResultBadge result={testResults['ollama']} />
            )}
          </section>
        )}

        {/* Save Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary"
            style={{ minWidth: '140px' }}
          >
            {isSaving ? 'Saving…' : 'Save Settings'}
          </button>
          {saveMsg && (
            <span style={{ fontSize: '0.9rem', color: saveMsg.includes('✅') ? 'var(--success, #48bb78)' : 'var(--error, #e53e3e)' }}>
              {saveMsg}
            </span>
          )}
        </div>
      </main>
    </div>
  );
}

/* ─── Sub-components ─── */

interface ProviderConfigProps {
  title: string;
  color: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  apiKeyValue: string;
  showKey: boolean;
  onToggleShow: () => void;
  onKeyChange: (v: string) => void;
  modelLabel: string;
  models: { value: string; label: string }[];
  modelValue: string;
  onModelChange: (v: string) => void;
  onTest: () => void;
  isTesting: boolean;
  testResult?: { ok: boolean; message: string };
  helpLink: string;
  helpText: string;
}

function ProviderConfig({
  title, color, apiKeyLabel, apiKeyPlaceholder, apiKeyValue, showKey,
  onToggleShow, onKeyChange, modelLabel, models, modelValue, onModelChange,
  onTest, isTesting, testResult, helpLink, helpText,
}: ProviderConfigProps) {
  return (
    <section style={{
      border: `1px solid ${color}40`,
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem',
      background: `${color}08`,
    }}>
      <h3 style={{ fontWeight: 600, marginBottom: '1rem', color }}>
        {title}
      </h3>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
          {apiKeyLabel}
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKeyValue}
            onChange={(e) => onKeyChange(e.target.value)}
            placeholder={apiKeyPlaceholder}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={onToggleShow}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: '8px',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            {showKey ? '🙈 Hide' : '👁 Show'}
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
          <a href={helpLink} target="_blank" rel="noopener noreferrer" style={{ color }}>
            {helpText}
          </a>
        </p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
          {modelLabel}
        </label>
        <select
          value={modelValue}
          onChange={(e) => onModelChange(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {models.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <button
        onClick={onTest}
        disabled={isTesting}
        style={{ ...testBtnStyle, borderColor: color, color }}
      >
        {isTesting ? 'Testing connection…' : 'Test Connection'}
      </button>
      {testResult && <TestResultBadge result={testResult} />}
    </section>
  );
}

function TestResultBadge({ result }: { result: { ok: boolean; message: string } }) {
  return (
    <div style={{
      marginTop: '0.75rem',
      padding: '0.6rem 1rem',
      borderRadius: '8px',
      background: result.ok ? 'rgba(72,187,120,0.1)' : 'rgba(229,62,62,0.1)',
      border: `1px solid ${result.ok ? 'rgba(72,187,120,0.4)' : 'rgba(229,62,62,0.4)'}`,
      fontSize: '0.85rem',
      color: result.ok ? '#2f855a' : '#c53030',
    }}>
      {result.ok ? '✅' : '❌'} {result.message}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  border: '1px solid var(--border, #e2e8f0)',
  borderRadius: '8px',
  fontSize: '0.9rem',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

const testBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  border: '2px solid',
  borderRadius: '8px',
  background: 'transparent',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.875rem',
  transition: 'all 0.2s',
};
