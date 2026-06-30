'use client'

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Building2 } from 'lucide-react'

export type ChartDatum = {
  name: string
  value: number
  color: string
}

const fallbackColors = ['#0B1F3A', '#C59D3D', '#B6A17A', '#3F7D58', '#B84A4A']

export default function PropertyTypeChart(props: { data: ChartDatum[] }) {
  const data = (props?.data ?? [])?.filter?.((item: ChartDatum) => (item?.value ?? 0) > 0) ?? []

  if ((data?.length ?? 0) === 0) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-lg bg-white/70 text-center text-sm text-[var(--dynasty-black)]/60">
        <Building2 className="mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
        Add properties to see portfolio type allocation.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 16, right: 8, bottom: 8, left: 8 }}>
        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        <Tooltip wrapperStyle={{ fontSize: 11 }} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={4} stroke="#F8F7F2" strokeWidth={3}>
          {data?.map?.((entry: ChartDatum, index: number) => (
            <Cell key={`${entry?.name ?? 'type'}-${index}`} fill={entry?.color ?? fallbackColors?.[index % (fallbackColors?.length ?? 1)] ?? '#C59D3D'} />
          )) ?? []}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
