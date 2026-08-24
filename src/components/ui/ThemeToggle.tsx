'use client'

// Toggles `.dark` on <html> and remembers the choice (localStorage, key
// `dms-theme`) so it survives reload — the blocking inline script in
// app/layout.tsx applies that stored choice before first paint. A dealer's
// pick here is explicit and persists regardless of their OS setting; only a
// dealer who has never chosen falls back to the OS preference (same script).
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'dms-theme'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
    } catch {
      // private mode/unavailable storage — theme still applies for this session
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink/50 transition-colors hover:text-ink ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
