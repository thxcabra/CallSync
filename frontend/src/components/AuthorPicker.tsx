import { useTeamMembers } from '../lib/queries';
import { useAuthor } from '../lib/author';
import { Spinner } from './ui';

interface AuthorPickerProps {
  open: boolean;
  forced: boolean;
  onClose: () => void;
}

export function AuthorPicker({ open, forced, onClose }: AuthorPickerProps) {
  const { author, setAuthor } = useAuthor();
  const members = useTeamMembers();

  if (!open) return null;

  function pick(name: string) {
    setAuthor(name);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h2 className="mb-2 text-lg font-semibold text-slate-100">Quem é você?</h2>
        <p className="mb-5 text-sm text-slate-400">
          Selecione seu nome. Vai ser registrado como autor de tudo que você criar nesta sessão.
        </p>

        {members.isLoading && (
          <div className="flex items-center gap-2 text-slate-400">
            <Spinner /> Carregando equipe...
          </div>
        )}

        {members.isError && (
          <div className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            Falha ao carregar equipe. O backend está rodando em http://localhost:3002?
          </div>
        )}

        {members.data && (
          <div className="space-y-2">
            {members.data.map((m) => (
              <button
                key={m.id}
                onClick={() => pick(m.name)}
                className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors ${
                  author === m.name
                    ? 'border-indigo-500 bg-indigo-950/40'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <span className="font-medium text-slate-100">{m.name}</span>
                <span className="text-xs text-slate-500">{m.role}</span>
              </button>
            ))}
          </div>
        )}

        {!forced && (
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-md border border-slate-800 px-3 py-2 text-sm text-slate-400 hover:bg-slate-800"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
