import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { ArrowLeft, PlusCircle } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { PropertyForm } from '@/components/dynasty/property-form'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function NewPropertyPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''

  if (!userId) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1200px] py-8">
        <div className="mb-6 flex flex-col gap-4 rounded-lg bg-[var(--dynasty-navy)] p-6 text-[#F8F7F2] shadow-lg md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">
              <PlusCircle className="h-3.5 w-3.5" /> New property
            </div>
            <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Capture a new investment opportunity.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#F8F7F2]/76">Create a property record with acquisition details and starter deal analysis assumptions.</p>
          </div>
          <Button asChild variant="glass-dark" className="text-[#F8F7F2]">
            <Link href="/properties"><ArrowLeft className="h-4 w-4" /> Back to properties</Link>
          </Button>
        </div>
        <PropertyForm mode="create" />
      </div>
    </main>
  )
}
