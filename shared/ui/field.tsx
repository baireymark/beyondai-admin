import {
  useId,
  type InputHTMLAttributes,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/shared/lib/cn';

type FieldBaseProps = {
  label: string;
  error?: string;
  hint?: string;
};

const controlClass =
  'mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm aria-invalid:border-danger disabled:opacity-60';

function describedBy(ids: (string | false | undefined)[]): string | undefined {
  const value = ids.filter(Boolean).join(' ');
  return value || undefined;
}

function FieldMessages({
  errorId,
  hintId,
  error,
  hint,
}: {
  errorId: string;
  hintId: string;
  error?: string;
  hint?: string;
}) {
  return (
    <>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}

function useFieldIds() {
  const id = useId();
  return { id, errorId: `${id}-error`, hintId: `${id}-hint` };
}

export function TextField({
  label,
  error,
  hint,
  className,
  ...props
}: FieldBaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const { id, errorId, hintId } = useFieldIds();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        className={controlClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy([hint && hintId, error && errorId])}
        {...props}
      />
      <FieldMessages errorId={errorId} hintId={hintId} error={error} hint={hint} />
    </div>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  className,
  ...props
}: FieldBaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { id, errorId, hintId } = useFieldIds();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        className={cn(controlClass, 'min-h-28')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy([hint && hintId, error && errorId])}
        {...props}
      />
      <FieldMessages errorId={errorId} hintId={hintId} error={error} hint={hint} />
    </div>
  );
}

export type SelectOption = { value: string; label: string };

export function SelectField({
  label,
  error,
  hint,
  options,
  placeholder,
  className,
  ...props
}: FieldBaseProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    ref?: Ref<HTMLSelectElement>;
    options: readonly SelectOption[];
    /** Label of a first option with an empty value, such as "Any status". */
    placeholder?: string;
  }) {
  const { id, errorId, hintId } = useFieldIds();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        className={cn(controlClass, 'pr-8')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy([hint && hintId, error && errorId])}
        {...props}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldMessages errorId={errorId} hintId={hintId} error={error} hint={hint} />
    </div>
  );
}

export function CheckboxField({
  label,
  className,
  ...props
}: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const id = useId();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        id={id}
        type="checkbox"
        className="size-4 rounded border-border accent-primary"
        {...props}
      />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  );
}
