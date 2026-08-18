export const dynamic = 'force-dynamic'

import { Zap } from 'lucide-react'
import { LoginForm } from '@/components/auth/LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign In — Voltmark DMS' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 border-r border-ink/[0.07] bg-sand/10 flex-col justify-between p-12">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone/25 flex items-center justify-center">
            <Zap className="w-4 h-4 text-slate" />
          </div>
          <span className="text-ink font-semibold text-base">Voltmark DMS</span>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-ink leading-tight mb-4">
              Run your dealership
            </h1>
            <p className="text-ink/60 text-sm leading-relaxed">
              Order vehicles and spare parts, track your allocated stock, and raise warranty
              claims — everything you place here reaches the manufacturer instantly.
            </p>
          </div>
        </div>

        <p className="text-ink/35 text-xs">© 2026 Voltmark</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-brand-white">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-md bg-slate/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-slate" />
            </div>
            <span className="font-semibold text-ink text-sm">Voltmark DMS</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-ink mb-1">Sign in</h2>
            <p className="text-sand text-sm">Access your dealer portal.</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
