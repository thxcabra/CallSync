import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export function Button({ variant = 'primary', loading, className = '', children, disabled, ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#080B21] disabled:opacity-40 disabled:cursor-not-allowed font-[Sora]';
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-[#2A60FB] text-white hover:bg-[#3b6efc] focus:ring-[#2A60FB] shadow-[0_0_16px_rgba(42,96,251,0.4)] hover:shadow-[0_0_24px_rgba(42,96,251,0.55)]',
    secondary:
      'bg-[#111840] text-white border border-[rgba(42,96,251,0.3)] hover:bg-[#1a2450] hover:border-[rgba(42,96,251,0.5)] focus:ring-[#2A60FB]',
    ghost:
      'bg-transparent text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white focus:ring-[rgba(255,255,255,0.2)]',
    danger:
      'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:text-red-300 focus:ring-red-500',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </button>
  );
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`block w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0D1230] px-3 py-2.5 text-sm text-white placeholder-[rgba(255,255,255,0.3)] focus:border-[#2A60FB] focus:outline-none focus:ring-1 focus:ring-[#2A60FB] transition-colors ${className}`}
      {...rest}
    />
  );
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`block w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0D1230] px-3 py-2.5 text-sm text-white placeholder-[rgba(255,255,255,0.3)] focus:border-[#2A60FB] focus:outline-none focus:ring-1 focus:ring-[#2A60FB] transition-colors ${className}`}
      {...rest}
    />
  );
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`block w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0D1230] px-3 py-2.5 text-sm text-white focus:border-[#2A60FB] focus:outline-none focus:ring-1 focus:ring-[#2A60FB] transition-colors ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ children, className = '', required, ...rest }: LabelProps) {
  return (
    <label className={`mb-1.5 block text-sm font-medium text-[rgba(255,255,255,0.65)] ${className}`} {...rest}>
      {children}
      {required && <span className="ml-0.5 text-[#2A60FB]">*</span>}
    </label>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0D1230] p-6 ${className}`}>
      {children}
    </div>
  );
}

export function Field({
  label,
  required,
  children,
  hint,
  error,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-[rgba(255,255,255,0.35)]">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[rgba(42,96,251,0.25)] bg-[rgba(42,96,251,0.04)] p-10 text-center text-sm text-[rgba(255,255,255,0.4)]">
      {children}
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#2A60FB] border-r-transparent ${className}`} />
  );
}

export function ErrorMsg({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{children}</div>
  );
}

export function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`font-['Clash_Grotesk',sans-serif] text-xs font-semibold uppercase tracking-widest text-[rgba(255,255,255,0.4)] ${className}`}>
      {children}
    </h2>
  );
}
