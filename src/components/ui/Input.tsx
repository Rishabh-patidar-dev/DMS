'use client'

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'

type InputBaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'>

interface InputProps extends InputBaseProps {
  label?: string
  error?: string
  hint?: string
  prefix?: ReactNode
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink/70">
            {label}
            {props.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && <div className="absolute left-3 text-ink/40 pointer-events-none">{prefix}</div>}
          <input
            ref={ref}
            id={inputId}
            className={[
              // Filled, borderless by default — a clean flat field defined by
              // background contrast against its card (bg-canvas vs bg-card),
              // not a near-invisible hairline border. A real border only
              // appears on focus/error, where it actually needs to be seen.
              'w-full rounded-xl px-3.5 py-2.5 text-sm text-ink',
              'bg-canvas border-2 border-transparent',
              'focus:outline-none focus:border-accent focus:bg-card',
              'transition-colors duration-150',
              'placeholder:text-ink/35',
              error ? 'border-red-400 bg-red-50' : '',
              prefix ? 'pl-9' : '',
              suffix ? 'pr-9' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />
          {suffix && <div className="absolute right-3 text-ink/40">{suffix}</div>}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-sand/70">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
