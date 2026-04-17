import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components = {
  h1: ({ children }: any) => <h1 className="mt-3 mb-2 text-lg font-bold text-slate-100">{children}</h1>,
  h2: ({ children }: any) => <h2 className="mt-3 mb-2 text-base font-semibold text-slate-100">{children}</h2>,
  h3: ({ children }: any) => <h3 className="mt-2 mb-1 text-sm font-semibold text-slate-200">{children}</h3>,
  p: ({ children }: any) => <p className="my-2 text-sm leading-relaxed text-slate-200">{children}</p>,
  strong: ({ children }: any) => <strong className="font-semibold text-slate-100">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-slate-300">{children}</em>,
  ul: ({ children }: any) => <ul className="my-2 ml-5 list-disc space-y-1 text-sm text-slate-200">{children}</ul>,
  ol: ({ children }: any) => <ol className="my-2 ml-5 list-decimal space-y-1 text-sm text-slate-200">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-indigo-400 underline-offset-2 hover:underline">
      {children}
    </a>
  ),
  code: ({ children }: any) => (
    <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-xs text-slate-200">{children}</code>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="my-2 border-l-2 border-slate-700 pl-3 text-sm italic text-slate-400">{children}</blockquote>
  ),
  hr: () => <hr className="my-4 border-slate-800" />,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm text-slate-200">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

interface CollapsibleMarkdownProps {
  children: string;
  collapsedHeight?: string;
  threshold?: number;
}

export function CollapsibleMarkdown({
  children,
  collapsedHeight = 'max-h-40',
  threshold = 400,
}: CollapsibleMarkdownProps) {
  const [expanded, setExpanded] = useState(false);
  const needsCollapse = children.length > threshold;

  if (!needsCollapse) return <Markdown>{children}</Markdown>;

  return (
    <div>
      <div className={`relative ${expanded ? '' : `${collapsedHeight} overflow-hidden`}`}>
        <Markdown>{children}</Markdown>
        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900 to-transparent" />
        )}
      </div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
      >
        {expanded ? '↑ Mostrar menos' : '↓ Mostrar mais'}
      </button>
    </div>
  );
}
