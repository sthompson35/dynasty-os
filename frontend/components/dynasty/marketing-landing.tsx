'use client'

import Link from 'next/link'
import { ArrowRight, BarChart3, Building2, Calculator, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BrandMark } from '@/components/dynasty/brand-mark'

const HERO_IMAGE_URL = 'https://blueheron.com/wp-content/uploads/2024/11/VM001_20241106_SM_Exterior_Blue_Rear-Hero-16x9-Ratio.jpg'

const features = [
  {
    title: 'Portfolio command center',
    description: 'Track value, equity, statuses, and acquisition momentum from one premium dashboard.',
    icon: BarChart3,
  },
  {
    title: 'Property manager',
    description: 'Organize prospects, owned assets, sold deals, and under-contract opportunities with focused filters.',
    icon: Building2,
  },
  {
    title: 'Deal analyzer',
    description: 'Run ARV, repairs, holding costs, closing costs, MAO, profit, and ROI in the same property workspace.',
    icon: Calculator,
  },
]

export function MarketingLanding() {
  return (
    <main className="min-h-screen dynasty-shell">
      <header className="sticky top-3 z-40 mx-auto flex w-[calc(100%-1.5rem)] max-w-[1200px] items-center justify-between rounded-lg bg-[#F8F7F2]/90 px-4 py-3 shadow-lg backdrop-blur-xl md:px-6">
        <BrandMark />
        <nav className="flex items-center gap-2" aria-label="Public navigation">
          <Button asChild variant="ghost" className="hidden text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/20 sm:inline-flex">
            <Link href="/login"><KeyRound className="h-4 w-4" /> Login</Link>
          </Button>
          <Button asChild className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
            <Link href="/signup">Start free <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto mt-4 w-[calc(100%-1.5rem)] max-w-[1200px] overflow-hidden rounded-lg shadow-lg">
        <div
          className="relative min-h-[650px] bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(90deg, rgba(11,31,58,0.94) 0%, rgba(11,31,58,0.78) 52%, rgba(11,31,58,0.38) 100%), url(${HERO_IMAGE_URL})` }}
        >
          <div className="absolute inset-0 dynasty-hero-overlay" aria-hidden="true" />
          <div className="relative flex min-h-[650px] items-center px-6 py-16 md:px-12 lg:px-16">
            <FadeIn className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-[#F8F7F2] shadow-md backdrop-blur">
                <ShieldCheck className="h-4 w-4 text-[var(--dynasty-gold)]" /> Phase 1 investor operating system
              </div>
              <h1 className="font-display text-4xl font-black tracking-tight text-[#F8F7F2] md:text-6xl">
                Build a disciplined real estate <span className="text-[var(--dynasty-gold)]">Dynasty</span>.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#F8F7F2]/85">
                Dynasty PropertyOS centralizes portfolio oversight, property records, and deal math so every acquisition decision is faster, cleaner, and more accountable.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
                  <Link href="/signup">Create investor account <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="glass-dark" className="text-[#F8F7F2]">
                  <Link href="/login"><KeyRound className="h-4 w-4" /> Access workspace</Link>
                </Button>
              </div>
              <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 text-sm text-[#F8F7F2]/80 sm:grid-cols-3">
                {['Private portfolios', 'Live deal math', 'Investor-grade reporting'].map((item: string) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 shadow-sm backdrop-blur">
                    <CheckCircle2 className="h-4 w-4 text-[var(--dynasty-gold)]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-[calc(100%-1.5rem)] max-w-[1200px] gap-6 py-12 md:grid-cols-3">
        <Stagger className="contents">
          {features.map((feature: (typeof features)[number]) => {
            const Icon = feature?.icon ?? Building2
            return (
              <StaggerItem key={feature?.title ?? 'feature'}>
                <Card className="h-full border-0 bg-[#F8F7F2] shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--dynasty-navy)] shadow-md">
                      <Icon className="h-5 w-5 text-[var(--dynasty-gold)]" aria-hidden="true" />
                    </div>
                    <h2 className="font-display text-xl font-black tracking-tight text-[var(--dynasty-navy)]">{feature?.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-[var(--dynasty-black)]/70">{feature?.description}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            )
          })}
        </Stagger>
      </section>
    </main>
  )
}
