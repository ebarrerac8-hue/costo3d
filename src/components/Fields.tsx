import type { ReactNode } from 'react';

interface BaseProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

function Shell({ id, label, hint, error, children, className }: BaseProps & { children: ReactNode; className?: string }) {
  return (
    <div className={`field${error ? ' has-error' : ''}${className ? ` ${className}` : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string): string | undefined =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export function TextField(props: BaseProps & {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; autoFocus?: boolean;
}) {
  const { id, label, hint, error, value, onChange, placeholder, maxLength, autoFocus } = props;
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <input
        id={id} type="text" value={value} placeholder={placeholder} maxLength={maxLength} autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)}
      />
    </Shell>
  );
}

export function NumberField(props: BaseProps & {
  value: string; onChange: (v: string) => void; prefix?: string; suffix?: string; placeholder?: string; className?: string;
}) {
  const { id, label, hint, error, value, onChange, prefix, suffix, placeholder, className } = props;
  return (
    <Shell id={id} label={label} hint={hint} error={error} className={className}>
      <div className="input-wrap">
        {prefix && <span className="affix" aria-hidden="true">{prefix}</span>}
        <input
          id={id} type="number" inputMode="decimal" min="0" step="any" value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)}
        />
        {suffix && <span className="affix" aria-hidden="true">{suffix}</span>}
      </div>
    </Shell>
  );
}

export function SelectField(props: BaseProps & {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string;
}) {
  const { id, label, hint, error, value, onChange, options, placeholder } = props;
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <select
        id={id} value={value} onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Shell>
  );
}

export function Toggle({ id, label, hint, checked, onChange }: {
  id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <button
        type="button" id={id} role="switch" aria-checked={checked} className={`switch${checked ? ' on' : ''}`}
        onClick={() => onChange(!checked)} aria-describedby={hint ? `${id}-hint` : undefined}
      >
        <span className="knob" />
      </button>
      <div>
        <label htmlFor={id}>{label}</label>
        {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      </div>
    </div>
  );
}
