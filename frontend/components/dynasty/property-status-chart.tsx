'use client'

import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ClipboardList } from 'lucide-react'
import type { ChartDatum } from '@/components/dynasty/property-type-chart'

export default function PropertyStatusChart(props: { data: ChartDatum[] }) {
  const data = (props?.data ?? [])?.filter?.((item: ChartDatum) => (item?.value ?? 0) > 0) ?? []

  if ((data?.length ?? 0) === 0) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-lg bg-white/70 text-center text-sm text-[var(--dynasty-black)]/60">
        <ClipboardList className="mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
        Status charts appear as properties move through the pipeline.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 22, right: 16, bottom: 34, left: 12 }}>
        <XAxis
          dataKey="name"
          tickLine={false}
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
          height={54}
          label={{ value: 'Status', position: 'insideBottom', offset: -12, style: { textAnchor: 'middle', fontSize: 11 } }}
        />
        <YAxis
          tickLine={false}
          tick={{ fontSize: 10 }}
          allowDecimals={false}
          width={42}
          label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11 } }}
        />
        <Tooltip wrapperStyle={{ fontSize: 11 }} />
        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="value" name="Properties" fill="#C59D3D" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
