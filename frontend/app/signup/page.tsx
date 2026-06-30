import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AuthForm } from '@/components/dynasty/auth-form'

export const dynamic = 'force-dynamic'

export default async function SignupPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.id) {
    redirect('/dashboard')
  }

  return <AuthForm mode="signup" />
}
