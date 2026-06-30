'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandMark } from '@/components/dynasty/brand-mark'

type AuthMode = 'login' | 'signup'

type AuthFormState = {
  name: string
  email: string
  password: string
}

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to parse auth response', error)
    return {}
  }
}

export function AuthForm(props: { mode: AuthMode }) {
  const router = useRouter()
  const [form, setForm] = useState<AuthFormState>({ name: '', email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const mode = props?.mode ?? 'login'
  const isSignup = mode === 'signup'

  const updateField = (field: keyof AuthFormState, value: string) => {
    setForm((previous: AuthFormState) => ({ ...(previous ?? { name: '', email: '', password: '' }), [field]: value ?? '' }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event?.preventDefault?.()
    const email = form?.email?.toLowerCase?.().trim?.() ?? ''
    const password = form?.password ?? ''
    const name = form?.name?.trim?.() ?? ''

    if (!email || !password) {
      toast.error('Enter an email and password to continue.')
      return
    }

    if (isSignup && (password?.length ?? 0) < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }

    setIsLoading(true)

    try {
      if (isSignup) {
        const signupResponse = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        })
        const signupPayload = await safeJson(signupResponse)

        if (!signupResponse?.ok) {
          throw new Error(typeof signupPayload?.error === 'string' ? signupPayload.error : 'Unable to create account.')
        }
      } else {
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const loginPayload = await safeJson(loginResponse)

        if (!loginResponse?.ok) {
          throw new Error(typeof loginPayload?.error === 'string' ? loginPayload.error : 'Invalid email or password.')
        }
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        throw new Error('Unable to start your workspace session.')
      }

      toast.success(isSignup ? 'Account created. Opening your workspace.' : 'Welcome back. Opening your workspace.')
      router.replace('/dashboard')
    } catch (error: unknown) {
      console.error('Authentication form failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to continue right now.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center dynasty-shell px-4 py-10">
      <section className="grid w-full max-w-[1100px] overflow-hidden rounded-lg bg-[#F8F7F2] shadow-lg md:grid-cols-[0.95fr_1.05fr]">
        <div className="relative hidden bg-[var(--dynasty-navy)] p-8 text-[#F8F7F2] md:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(197,157,61,0.28),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(182,161,122,0.2),transparent_35%)]" aria-hidden="true" />
          <div className="relative flex h-full flex-col justify-between">
            <BrandMark />
            <div>
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 shadow-md">
                <LockKeyhole className="h-5 w-5 text-[var(--dynasty-gold)]" aria-hidden="true" />
              </div>
              <h1 className="font-display text-4xl font-black tracking-tight">Investor discipline starts here.</h1>
              <p className="mt-4 text-sm leading-6 text-[#F8F7F2]/75">
                Secure access keeps each portfolio, property record, and deal model separated by account.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10">
          <div className="mb-8 md:hidden">
            <BrandMark />
          </div>
          <div className="mb-8">
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.22em] text-[var(--dynasty-gold)]">
              {isSignup ? 'Create account' : 'Workspace access'}
            </p>
            <h2 className="font-display text-3xl font-black tracking-tight text-[var(--dynasty-navy)]">
              {isSignup ? 'Register your investor workspace.' : 'Log in to Dynasty PropertyOS.'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--dynasty-black)]/65">
              {isSignup
                ? 'Create a private workspace for properties, portfolio metrics, and deal analysis.'
                : 'Open the portfolio dashboard and continue managing active acquisition decisions.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2 text-[var(--dynasty-navy)]">
                  <UserRound className="h-4 w-4 text-[var(--dynasty-gold)]" /> Name
                </Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dynasty-tan)]" />
                  <Input id="name" value={form?.name} onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateField('name', event?.target?.value ?? '')} className="pl-10" placeholder="Shylow Thompson" autoComplete="name" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-[var(--dynasty-navy)]">
                <Mail className="h-4 w-4 text-[var(--dynasty-gold)]" /> Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dynasty-tan)]" />
                <Input id="email" type="email" value={form?.email} onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateField('email', event?.target?.value ?? '')} className="pl-10" placeholder="investor@example.com" autoComplete="email" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2 text-[var(--dynasty-navy)]">
                <LockKeyhole className="h-4 w-4 text-[var(--dynasty-gold)]" /> Password
              </Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dynasty-tan)]" />
                <Input id="password" type="password" value={form?.password} onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateField('password', event?.target?.value ?? '')} className="pl-10" placeholder="At least 8 characters" autoComplete={isSignup ? 'new-password' : 'current-password'} required />
              </div>
            </div>

            <Button type="submit" loading={isLoading} className="w-full bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]" size="lg">
              {isSignup ? 'Create workspace' : 'Open workspace'} <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--dynasty-black)]/65">
            {isSignup ? 'Already have an account?' : 'Need a workspace?'}{' '}
            <Link className="font-bold text-[var(--dynasty-navy)] underline decoration-[var(--dynasty-gold)] underline-offset-4" href={isSignup ? '/login' : '/signup'}>
              {isSignup ? 'Log in' : 'Register'}
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
