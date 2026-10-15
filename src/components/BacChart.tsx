import { useMemo } from 'react'
import {
  Area,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { bacAt, fmtPromille, fmtTime } from '../lib/bac'

interface Props {
  curve: { t: number; v: number }[]
  drinks: number[]
  now: number
}

const MIN = 60_000
const HOUR = 60 * MIN

export function BacChart({ curve, drinks, now }: Props) {
  const { data, ticks, domain, yMax, yTicks } = useMemo(() => {
    const start = curve[0].t - 15 * MIN
    const end = Math.max(now, curve[curve.length - 1].t) + 20 * MIN
    const step = Math.max(2, Math.round((end - start) / MIN / 140)) * MIN
    const rows: { t: number; past: number | null; future: number | null }[] = []
    for (let t = start; t <= end; t += step) {
      const v = bacAt(curve, t)
      rows.push({ t, past: t <= now ? v : null, future: t >= now ? v : null })
    }
    // exact point at "now" so the solid and dashed parts meet
    const vNow = bacAt(curve, now)
    rows.push({ t: now, past: vNow, future: vNow })
    rows.sort((a, b) => a.t - b.t)

    const peak = Math.max(...curve.map((c) => c.v))
    const yStep = peak > 1.2 ? 0.5 : peak > 0.5 ? 0.2 : 0.1
    const yMax = Math.max(yStep * 4, Math.ceil((peak * 1.15) / yStep) * yStep)
    const yTicks: number[] = []
    for (let y = 0; y <= yMax + 1e-9; y += yStep) yTicks.push(+y.toFixed(2))
    const span = end - start
    const every = span > 10 * HOUR ? 3 : span > 5 * HOUR ? 2 : 1
    const ticks: number[] = []
    const first = Math.ceil(start / HOUR) * HOUR
    for (let t = first; t <= end; t += every * HOUR) ticks.push(t)
    return { data: rows, ticks, domain: [start, end] as [number, number], yMax, yTicks }
  }, [curve, now])

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="bacFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="1" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            type="number"
            domain={domain}
            ticks={ticks}
            tickFormatter={fmtTime}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            domain={[0, yMax]}
            ticks={yTicks}
            tickFormatter={(v: number) => v.toFixed(1).replace('.', ',')}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <ReferenceLine
            y={0.2}
            stroke="var(--line-strong)"
            strokeDasharray="3 4"
            label={{ value: '0,2', position: 'insideTopRight', fill: 'var(--muted)', fontSize: 10 }}
          />
          <ReferenceLine x={now} stroke="var(--line-strong)" />
          <Tooltip
            cursor={{ stroke: 'var(--text-2)', strokeWidth: 1 }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload as { t: number; past: number | null; future: number | null }
              const v = row.past ?? row.future ?? 0
              return (
                <div className="tooltip">
                  <span className="tooltip-time">
                    {fmtTime(row.t)}
                    {row.t > now + MIN ? ' · estimat' : ''}
                  </span>
                  <strong>{fmtPromille(v)} ‰</strong>
                </div>
              )
            }}
          />
          <Area
            dataKey="past"
            type="monotone"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#bacFill)"
            connectNulls={false}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
          />
          <Line
            dataKey="future"
            type="monotone"
            stroke="var(--accent)"
            strokeOpacity={0.55}
            strokeWidth={2}
            strokeDasharray="4 5"
            connectNulls={false}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
          />
          {drinks.map((t, i) => (
            <ReferenceDot key={i} x={t} y={0} r={3} fill="var(--text-2)" stroke="var(--surface)" strokeWidth={2} />
          ))}
          <ReferenceDot x={now} y={bacAt(curve, now)} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2.5} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span>
          <i className="lg-solid" /> Hittil
        </span>
        <span>
          <i className="lg-dash" /> Fremover
        </span>
        <span>
          <i className="lg-dot" /> Drikke
        </span>
        <span>
          <i className="lg-ref" /> Grense bil
        </span>
      </div>
    </div>
  )
}
