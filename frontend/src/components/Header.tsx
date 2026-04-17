import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthor } from '../lib/author';
import { AuthorPicker } from './AuthorPicker';

export function Header() {
  const { author } = useAuthor();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold text-indigo-400">
            CallSync
          </Link>
          <button
            onClick={() => setPickerOpen(true)}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
          >
            Você é: <span className="font-medium text-slate-100">{author ?? '— escolher —'}</span>
          </button>
        </div>
      </header>
      <AuthorPicker open={pickerOpen || !author} forced={!author} onClose={() => setPickerOpen(false)} />
    </>
  );
}
