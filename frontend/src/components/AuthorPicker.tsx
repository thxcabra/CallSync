import { useTeamMembers } from '../lib/queries';
import { useAuthor } from '../lib/author';
import { Spinner } from './ui';

interface AuthorPickerProps {
  open: boolean;
  forced: boolean;
  onClose: () => void;
}

const roleLabels: Record<string, string> = {
  analista: 'Analista',
  manager: 'Manager',
  CEO: 'CEO',
};

export function AuthorPicker({ open, forced, onClose }: AuthorPickerProps) {
  const { author, setAuthor } = useAuthor();
  const members = useTeamMembers();

  if (!open) return null;

  function pick(name: string) {
    setAuthor(name);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,11,33,0.9)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{
          background: '#0D1230',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 48px rgba(42,96,251,0.08)',
        }}
      >
        {/* Logo mark */}
        <div className="mb-5 flex items-center gap-2.5">
          <svg viewBox="0 0 305 183" fill="#2A60FB" className="h-5 w-8" aria-hidden>
            <path d="M123.2,150.6v-71.4c0-9.8-11.8-14.7-18.8-7.8L12.3,163.5c-6.9,6.9-2,18.8,7.8,18.8h272.7c6.1,0,11.1-5,11.1-11.1V23.2c0-9.9-11.9-14.8-18.9-7.8l-143,143c-6.9,6.9-18.8,2-18.8-7.8Z" />
          </svg>
          <span
            className="text-sm text-[rgba(255,255,255,0.4)]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            CallSync
          </span>
        </div>

        <h2
          className="mb-1 text-xl font-semibold text-white"
          style={{ fontFamily: "'Clash Grotesk', sans-serif" }}
        >
          Quem é você?
        </h2>
        <p className="mb-5 text-sm text-[rgba(255,255,255,0.45)]">
          Seu nome será registrado em tudo que criar nesta sessão.
        </p>

        {members.isLoading && (
          <div className="flex items-center gap-2 text-[rgba(255,255,255,0.4)] py-4">
            <Spinner /> Carregando equipe...
          </div>
        )}

        {members.isError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm text-red-300">
            Falha ao carregar equipe. O backend está rodando em http://localhost:3002?
          </div>
        )}

        {members.data && (
          <div className="space-y-2">
            {members.data.map((m) => (
              <button
                key={m.id}
                onClick={() => pick(m.name)}
                className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all duration-150"
                style={{
                  borderColor: author === m.name ? 'rgba(42,96,251,0.5)' : 'rgba(255,255,255,0.07)',
                  background: author === m.name ? 'rgba(42,96,251,0.12)' : 'rgba(255,255,255,0.03)',
                  boxShadow: author === m.name ? '0 0 16px rgba(42,96,251,0.15)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (author !== m.name) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.14)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (author !== m.name) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                  }
                }}
              >
                <span className="font-medium text-white" style={{ fontFamily: "'Clash Grotesk', sans-serif" }}>
                  {m.name}
                </span>
                <span className="text-xs text-[rgba(255,255,255,0.35)]">
                  {(m.role && roleLabels[m.role]) ?? m.role}
                </span>
              </button>
            ))}
          </div>
        )}

        {!forced && (
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-xl border border-[rgba(255,255,255,0.07)] px-3 py-2.5 text-sm text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
