'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Building2, LayoutDashboard, LogOut, PlusCircle, UserCircle, Users,
  Zap, Target, DollarSign, Layers, ShoppingBag, Activity, ChevronDown, ChevronUp, Home,
  ClipboardCheck, BrainCircuit, Radar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/dynasty/brand-mark'

const engineItems = [
  { href: '/engines/ai',          label: 'Dynasty AI',         icon: BrainCircuit },
  { href: '/engines/leads',       label: 'Lead Engine',        icon: Zap },
  { href: '/engines/intake',      label: 'Intake Analyst',     icon: ClipboardCheck },
  { href: '/engines/deals',       label: 'Deal Engine',        icon: Target },
  { href: '/engines/capital',     label: 'Capital Engine',     icon: DollarSign },
  { href: '/engines/land-build',  label: 'Land + Build UW',    icon: Home },
  { href: '/engines/operations',  label: 'Operations Engine',  icon: Layers },
  { href: '/engines/disposition', label: 'Disposition Engine', icon: ShoppingBag },
]

const mainNavItems = [
  { href: '/command-center', label: 'Command Center', icon: Activity },
  { href: '/acquisition-command-center', label: 'Acquisition', icon: Radar },
  { href: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/properties',     label: 'Properties',     icon: Building2 },
  { href: '/contacts',       label: 'Contacts',       icon: Users },
]

function initialsOf(value: string): string {
  const alphaParts = value
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^a-z]/gi, ''))
    .filter(Boolean)

  if (alphaParts.length === 0) {
    return 'I'
  }
  if (alphaParts.length === 1) {
    return alphaParts[0].slice(0, 2).toUpperCase()
  }
  return (alphaParts[0][0] + alphaParts[alphaParts.length - 1][0]).toUpperCase()
}

export function AppNavigation(props: { userName?: string | null; userEmail?: string | null }) {
  const pathname = usePathname()
  const userName = props?.userName ?? 'Investor'
  const userEmail = props?.userEmail ?? ''
  const initials = initialsOf(userName || userEmail || 'Investor')
  const [enginesOpen, setEnginesOpen] = useState(pathname?.startsWith('/engines') ?? false)

  const handleSignOut = async () => {
    try { await signOut({ callbackUrl: '/' }) } catch {}
  }

  const isActive = (href: string) => {
    if (!pathname) return false
    if (href === '/dashboard') return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-3 z-40 mx-auto w-[calc(100%-1.5rem)] max-w-[1200px] rounded-xl bg-[#F8F7F2]/92 px-3 py-3 shadow-lg backdrop-blur-xl md:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Brand + mobile user */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/command-center" aria-label="Dynasty OS Command Center">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--dynasty-navy)] text-xs font-black text-[var(--dynasty-gold)] shadow-md">
              {initials}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-wrap items-center gap-1" aria-label="Dynasty OS navigation">
          {/* Main nav */}
          {mainNavItems.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                size="sm"
                className={active
                  ? 'bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)] hover:text-[#F8F7F2]'
                  : 'text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/18 hover:text-[var(--dynasty-navy)]'}
              >
                <Link href={item.href}>
                  <Icon className="h-3.5 w-3.5" /> {item.label}
                </Link>
              </Button>
            )
          })}

          {/* Engines dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEnginesOpen(o => !o)}
              className={`flex items-center gap-1 ${pathname?.startsWith('/engines')
                ? 'bg-[var(--dynasty-gold)]/15 text-[var(--dynasty-navy)] font-bold'
                : 'text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/18'}`}
            >
              <Layers className="h-3.5 w-3.5" />
              Engines
              {enginesOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>

            {enginesOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-xl bg-white shadow-xl ring-1 ring-[var(--dynasty-navy)]/8">
                <div className="p-1.5">
                  {engineItems.map(item => {
                    const Icon = item.icon
                    const active = pathname?.startsWith(item.href) ?? false
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setEnginesOpen(false)}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active
                          ? 'bg-[var(--dynasty-navy)] text-[#F8F7F2]'
                          : 'text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-navy)]/8'}`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${active ? 'text-[var(--dynasty-gold)]' : 'text-[var(--dynasty-navy)]/60'}`} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <Button asChild variant="ghost" size="sm" className="text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/18">
            <Link href="/properties/new"><PlusCircle className="h-3.5 w-3.5" /> Add Property</Link>
          </Button>
        </nav>

        {/* Desktop user + logout */}
        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex items-center gap-3 rounded-lg bg-white/70 px-3 py-2 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--dynasty-navy)] text-xs font-black text-[var(--dynasty-gold)] shadow-md">
              {initials}
            </div>
            <div className="max-w-[180px] leading-tight">
              <p className="truncate text-sm font-bold text-[var(--dynasty-navy)]">{userName}</p>
              <p className="truncate text-xs text-[var(--dynasty-black)]/55">{userEmail}</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={handleSignOut} className="text-[var(--dynasty-navy)] hover:bg-red-50 hover:text-red-700">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>

        {/* Mobile logout */}
        <Button type="button" variant="ghost" size="sm" onClick={handleSignOut} className="justify-start text-[var(--dynasty-navy)] hover:bg-red-50 hover:text-red-700 lg:hidden">
          <UserCircle className="h-4 w-4" /> {userName} · Logout
        </Button>
      </div>
    </header>
  )
}
