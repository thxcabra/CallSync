import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthor } from '../lib/author';
import { AuthorPicker } from './AuthorPicker';

function MoicMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 305 183" fill="currentColor" className={className} aria-hidden>
      <path d="M123.2,150.6v-71.4c0-9.8-11.8-14.7-18.8-7.8L12.3,163.5c-6.9,6.9-2,18.8,7.8,18.8h272.7c6.1,0,11.1-5,11.1-11.1V23.2c0-9.9-11.9-14.8-18.9-7.8l-143,143c-6.9,6.9-18.8,2-18.8-7.8Z" />
    </svg>
  );
}

export function Header() {
  const { author } = useAuthor();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.06)] backdrop-blur-xl"
        style={{ background: 'rgba(8, 11, 33, 0.85)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <MoicMark className="h-5 w-8 text-[#2A60FB] transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(42,96,251,0.8)]" />
            <div className="flex flex-col leading-none">
              <span
                className="text-base font-semibold tracking-tight text-white"
                style={{ fontFamily: "'Clash Grotesk', sans-serif" }}
              >
                CallSync
              </span>
              <span className="text-[10px] text-[rgba(255,255,255,0.35)] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif" }}>
                by moic.digital
              </span>
            </div>
          </Link>

          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-sm transition-all hover:bg-[rgba(42,96,251,0.12)] hover:border-[rgba(42,96,251,0.4)]"
          >
            <span className="h-2 w-2 rounded-full bg-[#00ED4F] shadow-[0_0_6px_rgba(0,237,79,0.8)]" />
            <span className="text-[rgba(255,255,255,0.5)] text-xs">você é</span>
            <span className="font-medium text-white" style={{ fontFamily: "'Clash Grotesk', sans-serif" }}>
              {author ?? '— escolher —'}
            </span>
          </button>
        </div>
      </header>
      <AuthorPicker open={pickerOpen || !author} forced={!author} onClose={() => setPickerOpen(false)} />
    </>
  );
}
