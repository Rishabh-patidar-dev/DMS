'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { KeyRound, Lock } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Button } from '@/components/ui/Button'
import { crmFetch, storeToken } from '@/lib/crm/dealerAuth'

type Data = { username: string; password: string }

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Data>()

  const onSubmit = async (data: Data) => {
    setServerError(null)
    const { ok, data: result } = await crmFetch('/api/v1/dealer-auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!ok || !result.ok) {
      console.error('[LoginForm] login failed:', result)
      setServerError(result.message || 'Invalid username or password')
      return
    }
    if (result.token) storeToken(result.token)
    // Full navigation, not router.push — guarantees Overview's own data
    // fetch happens from a clean page load right after the token is stored.
    window.location.href = '/'
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{serverError}</div>
      )}

      <Input {...register('username')} label="Username" placeholder="Your username" prefix={<KeyRound className="h-4 w-4" />} error={errors.username?.message} required />
      <PasswordInput {...register('password')} label="Password" placeholder="••••••••" prefix={<Lock className="h-4 w-4" />} error={errors.password?.message} required />

      <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
        Sign in
      </Button>

      <p className="text-center text-xs text-sand/70">
        Signing in here uses the same account you set up during dealer onboarding.
      </p>
    </form>
  )
}
