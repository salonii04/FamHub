import { useId, type ComponentProps } from 'react'
import { cn } from '../../lib/cn'

type InputProps = ComponentProps<'input'> & {
  label: string
  error?: string
}

export function Input({ label, error, id, className, ...props }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'h-10 rounded-lg border bg-surface px-3 text-sm placeholder:text-muted',
          'focus-visible:outline-2 focus-visible:outline-brand',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}