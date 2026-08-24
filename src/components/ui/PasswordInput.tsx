'use client'

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './Input'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'prefix'> & {
  label?: string
  error?: string
  hint?: string
  prefix?: ReactNode
}

// Thin wrapper around Input, not a new base component — same fields
// (label/error/hint/prefix), just fixes `type` internally and uses the
// existing `suffix` slot for a show/hide toggle instead of exposing it.
export const PasswordInput = forwardRef<HTMLInputElement, Props>((props, ref) => {
  const [visible, setVisible] = useState(false)
  return (
    <Input
      {...props}
      ref={ref}
      type={visible ? 'text' : 'password'}
      suffix={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="text-sand/70 hover:text-ink"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  )
})
PasswordInput.displayName = 'PasswordInput'
