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

type Curve = { t: number; v: number }[]

export interface Other {
  key: string
  name: string
  curve: Curve
}

interface Props {
  curve: Curve
  drinks: number[]
  now: number
  others?: Other[]
  height?: number
}

type Row = { t: number; past: number | null; future: number | null } & Record<string, number | null>

const MIN = 60_000
const HOUR = 60 * MIN

export function BacChart({ curve, drinks, now, others = [], height = 220 }: Props) {
  const { data, ticks, domain, yMax, yTicks } = useMemo(() => {
    const curves = [curve, ...others.map((o) => o.curve)].filter((c) => c.length)
    let start: number
    let end: number
    if (curves.length) {
      start = Math.min(...curves.map((c) => c[0].t)) - 15 * MIN
      end = Math.max(now, ...curves.map((c) => c[c.length - 1].t)) + 20 * MIN
      start = Math.max(start, now - 18 * HOUR)
    } else {
      start = now - 3 * HOUR
      end = now + HOUR
    }

    const step = Math.max(2, Math.round((end - start) / MIN / 140)) * MIN
    const row = (t: number, isNow = false): Row => {
      const v = bacAt(curve, t)
      const r: Row = { t, past: t <= now || isNow ? v : null, future: t >= now || isNow ? v : null }
      for (const o of others) r[`f_${o.key}`] = bacAt(o.curve, t)
      return r
    }
    const rows: Row[] = []
    for (let t = start; t <= end; t += step) rows.push(row(t))
    // exact point at "now" so the solid and dashed parts meet
    rows.push(row(now, true))
    rows.sort((a, b) => a.t - b.t)

    const peak = Math.max(0, ...curves.flatMap((c) => c.map((p) => p.v)))
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
  }, [curve, others, now])

  const names = Object.fromEntries(others.map((o) => [`f_${o.key}`, o.name]))

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={height}>
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
              const row = payload[0].payload as Row
              const v = row.past ?? row.future ?? 0
              const friends = Object.keys(names)
                .map((k) => ({ name: names[k], v: row[k] ?? 0 }))
                .filter((f) => f.v > 0.005)
                .sort((a, b) => b.v - a.v)
                .slice(0, 5)
              return (
                <div className="tooltip">
                  <span className="tooltip-time">
                    {fmtTime(row.t)}
                    {row.t > now + MIN ? ' · estimat' : ''}
                  </span>
                  {others.length ? (
                    <span className="tooltip-row me">
                      <span>Deg</span>
                      <strong>{fmtPromille(v)} ‰</strong>
                    </span>
                  ) : (
                    <strong>{fmtPromille(v)} ‰</strong>
                  )}
                  {friends.map((f) => (
                    <span className="tooltip-row" key={f.name}>
                      <span>{f.name}</span>
                      <b>{fmtPromille(f.v)}</b>
                    </span>
                  ))}
                </div>
              )
            }}
          />
          {others.map((o) => (
            <Line
              key={o.key}
              dataKey={`f_${o.key}`}
              type="monotone"
              stroke="var(--text-2)"
              strokeOpacity={0.4}
              strokeWidth={1.5}
              isAnimationActive={false}
              dot={false}
              activeDot={false}
            />
          ))}
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
          {others.map((o) => {
            const v = bacAt(o.curve, now)
            return v > 0.01 ? (
              <ReferenceDot
                key={o.key}
                x={now}
                y={v}
                r={2.5}
                fill="var(--text-2)"
                stroke="var(--surface)"
                strokeWidth={1.5}
                label={{ value: o.name.split(' ')[0], position: 'left', fill: 'var(--muted)', fontSize: 10 }}
              />
            ) : null
          })}
          {drinks.map((t, i) => (
            <ReferenceDot key={i} x={t} y={0} r={3} fill="var(--text-2)" stroke="var(--surface)" strokeWidth={2} />
          ))}
          <ReferenceDot x={now} y={bacAt(curve, now)} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2.5} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span>
          <i className="lg-solid" /> {others.length ? 'Deg' : 'Hittil'}
        </span>
        <span>
          <i className="lg-dash" /> Fremover
        </span>
        {others.length > 0 && (
          <span>
            <i className="lg-friend" /> Venner
          </span>
        )}
        {drinks.length > 0 && (
          <span>
            <i className="lg-dot" /> Drikke
          </span>
        )}
        <span>
          <i className="lg-ref" /> Grense bil
        </span>
      </div>
    </div>
  )
}
