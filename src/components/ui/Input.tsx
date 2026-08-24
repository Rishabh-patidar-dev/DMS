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
          {prefix && <div className="absolute left-3 text-sand/70 pointer-events-none">{prefix}</div>}
          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full rounded-xl px-3 py-2.5 text-sm text-ink',
              'bg-brand-white border',
              'focus:outline-none focus:ring-2 focus:ring-accent/30',
              'transition-colors duration-150',
              'placeholder:text-sand/60',
              error ? 'border-red-300 bg-red-50/50 focus:ring-red-300' : 'border-ink/10 focus:border-accent/50',
              prefix ? 'pl-9' : '',
              suffix ? 'pr-9' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />
          {suffix && <div className="absolute right-3 text-sand/70">{suffix}</div>}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-sand/70">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
