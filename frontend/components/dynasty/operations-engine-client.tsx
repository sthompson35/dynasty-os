'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layers, PlusCircle, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'
import { GlossaryHint } from '@/components/dynasty/glossary-hint'

function fmt(n: number): string {
  const abs = Math.abs(n), sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${Math.round(abs).toLocaleString()}`
}

type Task = {
  id: string; projectId: string; category: string; description: string
  assignedTo: string | null; dueDate: string | null; status: string; sortOrder: number
}

type Project = {
  id: string; name: string; status: string; exitStrategy: string
  startDate: string | null; targetCompletion: string | null
  budget: number | null; actualCost: number | null; completionPercent: number
  riskScore: number; notes: string | null; tasks: Task[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  intake:      { label: 'Intake',     color: 'bg-gray-100 text-gray-600',    icon: Clock },
  planning:    { label: 'Planning',   color: 'bg-blue-100 text-blue-700',    icon: Clock },
  active:      { label: 'Active',     color: 'bg-amber-100 text-amber-700',  icon: Clock },
  inspection:  { label: 'Inspection', color: 'bg-purple-100 text-purple-700',icon: AlertTriangle },
  complete:    { label: 'Complete',   color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  closed:      { label: 'Closed',     color: 'bg-gray-100 text-gray-500',    icon: CheckCircle2 },
}

const TASK_STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-blue-100 text-blue-700',
  blocked:     'bg-red-100 text-red-700',
  inspection:  'bg-purple-100 text-purple-700',
  complete:    'bg-emerald-100 text-emerald-700',
}

const TASK_CATEGORIES = ['foundation', 'framing', 'electrical', 'plumbing', 'hvac', 'drywall', 'painting', 'flooring', 'finish', 'exterior', 'roofing', 'general']

type ProjForm = { name: string; exitStrategy: string; budget: string; startDate: string; targetCompletion: string; notes: string }
const EMPTY: ProjForm = { name: '', exitStrategy: 'flip', budget: '', startDate: '', targetCompletion: '', notes: '' }

type TaskForm = { description: string; category: string; assignedTo: string; dueDate: string }
const EMPTY_TASK: TaskForm = { description: '', category: 'general', assignedTo: '', dueDate: '' }

export function OperationsEngineClient({ projects: initialProjects }: { projects: Project[] }) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ProjForm>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [taskForm, setTaskForm] = useState<Record<string, TaskForm>>({})
  const [showTaskForm, setShowTaskForm] = useState<Record<string, boolean>>({})

  const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0)
  const totalActual = projects.reduce((s, p) => s + (p.actualCost ?? 0), 0)
  const variance = totalBudget - totalActual
  const activeCount = projects.filter(p => p.status === 'active').length
  const avgCompletion = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.completionPercent, 0) / projects.length) : 0

  async function saveProject() {
    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          exitStrategy: form.exitStrategy,
          budget: form.budget ? parseFloat(form.budget) : null,
          startDate: form.startDate || null,
          targetCompletion: form.targetCompletion || null,
          notes: form.notes || null,
          status: 'intake',
          completionPercent: 0,
          riskScore: 0,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setProjects(prev => [{ ...created, tasks: [] }, ...prev])
        setShowForm(false)
        setForm(EMPTY)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  async function addTask(projectId: string) {
    const tf = taskForm[projectId] ?? EMPTY_TASK
    if (!tf.description) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: tf.description,
          category: tf.category,
          assignedTo: tf.assignedTo || null,
          dueDate: tf.dueDate || null,
          status: 'not_started',
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, tasks: [...p.tasks, created] } : p))
        setTaskForm(prev => ({ ...prev, [projectId]: EMPTY_TASK }))
        setShowTaskForm(prev => ({ ...prev, [projectId]: false }))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1200px] py-8">
      <FadeIn>
        <div className="mb-8 rounded-xl bg-[var(--dynasty-navy)] p-7 text-[#F8F7F2] shadow-xl">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">
            <Layers className="h-3.5 w-3.5" /> Dynasty OS · Operations Engine
          </div>
          <h1 className="mt-3 font-display text-3xl font-black tracking-tight md:text-4xl">Operations Engine</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#F8F7F2]/70">
            Execute every approved project on time, on budget, within scope. This is the production floor. Most profits are won or lost here.
          </p>
          <div className="mt-5 flex flex-wrap gap-6 border-t border-white/10 pt-5">
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{projects.length}</p><p className="text-xs text-[#F8F7F2]/60">Total Projects</p></div>
            <div><p className="font-display text-2xl font-black text-amber-400">{activeCount}</p><p className="text-xs text-[#F8F7F2]/60">Active</p></div>
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{avgCompletion}%</p><p className="text-xs text-[#F8F7F2]/60">Avg Completion</p></div>
            <div><p className={`font-display text-2xl font-black ${variance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{variance >= 0 ? '+' : ''}{fmt(variance)}</p><p className="text-xs text-[#F8F7F2]/60">Budget Variance</p></div>
          </div>
        </div>
      </FadeIn>

      {/* Metric cards */}
      <Stagger className="mb-6 grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total Budget', value: fmt(totalBudget), helper: 'Approved capital', bad: false },
          { label: 'Actual Cost', value: fmt(totalActual), helper: 'Capital deployed', bad: false },
          { label: 'Budget Variance', value: (variance >= 0 ? '+' : '') + fmt(variance), helper: variance >= 0 ? 'Under budget' : 'Over budget', bad: variance < 0 },
          { label: 'Projects Complete', value: `${projects.filter(p => p.status === 'complete').length}`, helper: 'Ready for disposition', bad: false },
        ].map(m => (
          <StaggerItem key={m.label}>
            <Card className="border-0 bg-[#F8F7F2] shadow-md">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-[var(--dynasty-black)]/55">{m.label}</p>
                <p className={`mt-1 font-display text-2xl font-black ${m.bad ? 'text-red-600' : 'text-[var(--dynasty-navy)]'}`}>{m.value}</p>
                <p className="mt-1 text-xs text-[var(--dynasty-black)]/45">{m.helper}</p>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-[var(--dynasty-navy)]">Active Projects</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
          <PlusCircle className="h-4 w-4" /> New Project
        </Button>
      </div>

      {/* New project form */}
      {showForm && (
        <FadeIn>
          <Card className="mb-6 border-0 bg-[#F8F7F2] shadow-md">
            <CardHeader><CardTitle className="font-display text-lg text-[var(--dynasty-navy)]">New Project</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2"><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Project Name *</label><Input placeholder="502 Buckley – Full Rehab" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--dynasty-black)]/60">Exit Strategy <GlossaryHint term="Exit Strategy" /></label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.exitStrategy} onChange={e => setForm(f => ({ ...f, exitStrategy: e.target.value }))}>
                    {['flip', 'brrrr', 'wholesale', 'development', 'hold'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div><label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--dynasty-black)]/60">Budget ($) <GlossaryHint term="Rehab Budget" /></label><Input type="number" placeholder="90000" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Start Date</label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Target Completion</label><Input type="date" value={form.targetCompletion} onChange={e => setForm(f => ({ ...f, targetCompletion: e.target.value }))} /></div>
                <div className="md:col-span-3"><label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--dynasty-black)]/60">Notes / Scope <GlossaryHint term="Scope of Work (SOW)" /></label><Input placeholder="Full gut renovation, new roof, kitchen/bath update..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveProject} disabled={saving || !form.name} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">{saving ? 'Saving...' : 'Create Project'}</Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Project list */}
      {projects.length === 0 ? (
        <Card className="border-0 bg-[#F8F7F2] shadow-sm">
          <CardContent className="py-16 text-center">
            <Layers className="mx-auto mb-4 h-10 w-10 text-[var(--dynasty-gold)]" />
            <p className="font-display text-xl font-bold text-[var(--dynasty-navy)]">Operations Engine is ready.</p>
            <p className="mt-2 text-sm text-[var(--dynasty-black)]/55">Add a project to begin tracking rehab progress, budget, and task completion.</p>
            <Button onClick={() => setShowForm(true)} className="mt-4 bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]"><PlusCircle className="h-4 w-4" /> Create First Project</Button>
          </CardContent>
        </Card>
      ) : (
        <Stagger className="space-y-4">
          {projects.map(project => {
            const cfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.intake
            const StatusIcon = cfg.icon
            const isExpanded = expandedProject === project.id
            const budgetVariance = (project.budget ?? 0) - (project.actualCost ?? 0)
            const tasksByStatus = {
              complete: project.tasks.filter(t => t.status === 'complete').length,
              total: project.tasks.length,
            }
            return (
              <StaggerItem key={project.id}>
                <Card className="border-0 bg-[#F8F7F2] shadow-md">
                  <CardHeader className="pb-3">
                    <button onClick={() => setExpandedProject(isExpanded ? null : project.id)} className="w-full text-left">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${project.status === 'active' ? 'bg-amber-100' : project.status === 'complete' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                            <StatusIcon className={`h-5 w-5 ${project.status === 'active' ? 'text-amber-700' : project.status === 'complete' ? 'text-emerald-700' : 'text-gray-500'}`} />
                          </div>
                          <div>
                            <p className="font-bold text-[var(--dynasty-navy)]">{project.name}</p>
                            <p className="text-xs text-[var(--dynasty-black)]/55">{project.exitStrategy.charAt(0).toUpperCase() + project.exitStrategy.slice(1)} · {tasksByStatus.complete}/{tasksByStatus.total} tasks</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Progress bar */}
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--dynasty-black)]/10">
                              <div className="h-full rounded-full bg-[var(--dynasty-gold)]" style={{ width: `${project.completionPercent}%` }} />
                            </div>
                            <span className="text-xs font-bold text-[var(--dynasty-navy)]">{project.completionPercent}%</span>
                          </div>
                          {project.budget && <div className="text-right"><p className="text-xs text-[var(--dynasty-black)]/50">Budget</p><p className="font-bold text-[var(--dynasty-navy)]">{fmt(project.budget)}</p></div>}
                          {project.actualCost != null && <div className="text-right"><p className="text-xs text-[var(--dynasty-black)]/50">Spent</p><p className="font-bold text-[var(--dynasty-navy)]">{fmt(project.actualCost)}</p></div>}
                          {project.budget != null && <div className="text-right"><p className="text-xs text-[var(--dynasty-black)]/50">Variance</p><p className={`font-bold ${budgetVariance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{budgetVariance >= 0 ? '+' : ''}{fmt(budgetVariance)}</p></div>}
                          <Badge className={`border-0 text-xs ${cfg.color}`}>{cfg.label}</Badge>
                        </div>
                      </div>
                    </button>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="border-t border-[var(--dynasty-black)]/8 pt-4">
                      {/* Task list */}
                      {project.tasks.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dynasty-black)]/55">Tasks</p>
                          {project.tasks.map(task => (
                            <div key={task.id} className="flex items-center gap-3 rounded-lg bg-white/70 px-3 py-2 shadow-sm">
                              <div className={`h-2 w-2 rounded-full ${task.status === 'complete' ? 'bg-emerald-500' : task.status === 'in_progress' ? 'bg-amber-500' : task.status === 'blocked' ? 'bg-red-500' : 'bg-gray-300'}`} />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-[var(--dynasty-navy)]">{task.description}</p>
                                <p className="text-xs text-[var(--dynasty-black)]/45">{task.category}{task.assignedTo ? ` · ${task.assignedTo}` : ''}</p>
                              </div>
                              <Badge className={`border-0 text-[9px] ${TASK_STATUS_COLORS[task.status] ?? 'bg-gray-100'}`}>{task.status.replace('_', ' ')}</Badge>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add task */}
                      {showTaskForm[project.id] ? (
                        <div className="grid gap-2 md:grid-cols-4">
                          <Input placeholder="Task description" value={taskForm[project.id]?.description ?? ''} onChange={e => setTaskForm(prev => ({ ...prev, [project.id]: { ...(prev[project.id] ?? EMPTY_TASK), description: e.target.value } }))} />
                          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={taskForm[project.id]?.category ?? 'general'} onChange={e => setTaskForm(prev => ({ ...prev, [project.id]: { ...(prev[project.id] ?? EMPTY_TASK), category: e.target.value } }))}>
                            {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                          </select>
                          <Input placeholder="Assigned to" value={taskForm[project.id]?.assignedTo ?? ''} onChange={e => setTaskForm(prev => ({ ...prev, [project.id]: { ...(prev[project.id] ?? EMPTY_TASK), assignedTo: e.target.value } }))} />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => addTask(project.id)} disabled={saving} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">Add</Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowTaskForm(prev => ({ ...prev, [project.id]: false }))}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setShowTaskForm(prev => ({ ...prev, [project.id]: true }))} className="text-[var(--dynasty-navy)]">
                          <PlusCircle className="h-3.5 w-3.5" /> Add Task
                        </Button>
                      )}
                    </CardContent>
                  )}
                </Card>
              </StaggerItem>
            )
          })}
        </Stagger>
      )}
    </div>
  )
}
