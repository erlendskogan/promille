import { useMemo, useState } from 'react'
import { Drawer } from 'vaul'
import { Share, X } from 'lucide-react'
import { analyze, fmtPromille, fmtTime, level, statusText, type Analysis } from '../lib/bac'
import type { Member } from '../lib/store'
import { Avatar, Name } from './Avatar'
import { ChartPanel, EntryList, Hero, Stats } from './Overview'

interface Row {
  m: Member
  a: Analysis
}

export function Friends({ members, me, now }: { members: Member[]; me: string; now: number }) {
  const minute = Math.floor(now / 60_000)
  const rows = useMemo<Row[]>(
    () => members.map((m) => ({ m, a: analyze(m.entries, m, minute * 60_000) })),
    [members, minute],
  )
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const live = rows.filter((r) => r.a.active).sort((x, y) => y.a.v - x.a.v || (y.a.active!.peak - x.a.active!.peak))
  const rest = rows
    .filter((r) => !r.a.active)
    .sort((x, y) => (y.a.lastEntry?.time ?? 0) - (x.a.lastEntry?.time ?? 0) || x.m.name.localeCompare(y.m.name))
  const open = rows.find((r) => r.m.key === openKey)

  const invite = async () => {
    const url = location.href.split('#')[0]
    try {
      if (navigator.share) return await navigator.share({ title: 'Promille', text: 'Bli med og logg kvelden', url })
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* cancelled */
    }
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>I kveld</h2>
          <span className="muted">{live.length ? `${live.length} aktive` : 'Ingen aktive'}</span>
        </div>
        {live.length ? (
          <ul className="people">
            {live.map((r, i) => (
              <PersonRow key={r.m.key} r={r} rank={i + 1} me={r.m.key === me} now={now} onClick={() => setOpenKey(r.m.key)} />
            ))}
          </ul>
        ) : (
          <p className="muted people-empty">Ingen har logget noe de siste timene.</p>
        )}
      </section>

      {rest.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Andre</h2>
            <span className="muted">{rest.length}</span>
          </div>
          <ul className="people">
            {rest.map((r) => (
              <PersonRow key={r.m.key} r={r} me={r.m.key === me} now={now} onClick={() => setOpenKey(r.m.key)} />
            ))}
          </ul>
        </section>
      )}

      <button className="btn btn-secondary invite" onClick={invite}>
        <Share size={17} /> {copied ? 'Lenken er kopiert' : 'Inviter venner'}
      </button>

      <Drawer.Root open={!!open} onOpenChange={(o) => !o && setOpenKey(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="overlay" />
          <Drawer.Content className="sheet" aria-describedby={undefined}>
            <div className="sheet-handle" />
            {open && (
              <>
                <div className="sheet-head">
                  <Drawer.Title className="sheet-title person-title">
                    <Avatar name={open.m.name} gold={open.m.badge === 'gold'} />
                    <Name name={open.m.name} gold={open.m.badge === 'gold'} />
                  </Drawer.Title>
                  <button className="icon-btn ghost" onClick={() => setOpenKey(null)} aria-label="Lukk">
                    <X size={20} />
                  </button>
                </div>
                <div className="sheet-scroll stack">
                  <Hero a={open.a} />
                  {open.a.active && <ChartPanel a={open.a} now={now} />}
                  <Stats a={open.a} now={now} />
                  {open.a.active ? (
                    <EntryList entries={open.a.active.entries} />
                  ) : (
                    <p className="muted people-empty">
                      {open.a.lastEntry ? `Sist logget ${lastSeen(open.a.lastEntry.time, now)}.` : 'Har ikke logget noe ennå.'}
                    </p>
                  )}
                </div>
              </>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}

function PersonRow({ r, rank, me, now, onClick }: { r: Row; rank?: number; me: boolean; now: number; onClick: () => void }) {
  const { m, a } = r
  const last = a.lastEntry
  return (
    <li>
      <button className={`person lvl-${level(a.v)} ${m.badge === 'gold' ? 'gold' : ''}`} onClick={onClick}>
        <Avatar name={m.name} gold={m.badge === 'gold'} />
        <span className="person-main">
          <strong>
            {rank && <span className="rank">{rank}</span>}
            <Name name={m.name} gold={m.badge === 'gold'} />
            {me && <span className="tag">deg</span>}
          </strong>
          <small>
            {a.active
              ? `${statusText(a)}${last ? ` · ${last.name} ${fmtTime(last.time)}` : ''}`
              : last
                ? `Sist aktiv ${lastSeen(last.time, now)}`
                : 'Ingen drikke ennå'}
          </small>
        </span>
        {a.active && <Spark a={a} now={now} />}
        {a.active && (
          <span className="person-v">
            {fmtPromille(a.v)}
            <small>‰</small>
          </span>
        )}
      </button>
    </li>
  )
}

function Spark({ a, now }: { a: Analysis; now: number }) {
  const c = a.curve
  if (c.length < 2) return null
  const t0 = c[0].t
  const t1 = Math.max(c[c.length - 1].t, now)
  const max = Math.max(0.5, ...c.map((p) => p.v))
  const W = 64
  const H = 26
  const x = (t: number) => ((t - t0) / (t1 - t0)) * W
  const y = (v: number) => H - 2 - (v / max) * (H - 4)
  const step = Math.max(1, Math.floor(c.length / 60))
  const pts = c.filter((_, i) => i % step === 0 || i === c.length - 1)
  const past = pts.filter((p) => p.t <= now)
  const future = pts.filter((p) => p.t >= now)
  const d = (ps: typeof pts) => ps.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      {future.length > 1 && <path d={d(future)} fill="none" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="2 3" />}
      {past.length > 1 && <path d={d(past)} fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinejoin="round" />}
    </svg>
  )
}

function lastSeen(t: number, now: number) {
  const days = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 86_400_000)
  if (days <= 0) return `i dag kl. ${fmtTime(t)}`
  if (days === 1) return `i går kl. ${fmtTime(t)}`
  if (days < 7) return new Date(t).toLocaleDateString('nb-NO', { weekday: 'long' })
  return new Date(t).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}
