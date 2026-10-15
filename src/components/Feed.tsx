import { useEffect, useRef, useState } from 'react'
import { Drawer } from 'vaul'
import { Camera, ImageIcon, Trash2, X } from 'lucide-react'
import { fmtPromille, fmtTime, level } from '../lib/bac'
import { loadImage, type Feed as FeedState, type Post } from '../lib/feed'
import type { Member } from '../lib/store'
import { Avatar, Name } from './Avatar'

export function Feed({ feed, members, me, now }: { feed: FeedState; members: Member[]; me: string; now: number }) {
  const names = Object.fromEntries(members.map((m) => [m.key, m.name]))
  const gold = new Set(members.filter((m) => m.badge === 'gold').map((m) => m.key))

  if (feed.loaded && !feed.posts.length)
    return (
      <section className="panel empty">
        <span className="empty-icon">
          <Camera size={26} />
        </span>
        <h2>Ingen bilder ennå</h2>
        <p className="muted">Trykk på «Ta bilde» under, eller velg et bilde fra telefonen med knappen ved siden av.</p>
      </section>
    )

  return (
    <div className="feed">
      {feed.posts.map((p) => (
        <PostCard key={p.id} post={p} name={names[p.userKey] ?? 'Ukjent'} gold={gold.has(p.userKey)} mine={p.userKey === me} now={now} onDelete={() => feed.remove(p.id)} />
      ))}
      {feed.more && feed.posts.length > 0 && (
        <button className="btn btn-secondary" onClick={feed.loadMore}>
          Vis eldre
        </button>
      )}
    </div>
  )
}

function PostCard({
  post,
  name,
  gold,
  mine,
  now,
  onDelete,
}: {
  post: Post
  name: string
  gold: boolean
  mine: boolean
  now: number
  onDelete: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [armed, setArmed] = useState(false)

  // load the image when it gets close to the screen
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelled = false
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        loadImage(post.id).then((d) => !cancelled && setSrc(d))
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => {
      cancelled = true
      io.disconnect()
    }
  }, [post.id])

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])

  const v = post.promille ?? 0

  return (
    <article className="post">
      <header className="post-head">
        <Avatar name={name} gold={gold} />
        <span className="post-who">
          <strong>
            <Name name={name} gold={gold} />
          </strong>
          <small>{ago(post.createdAt, now)}</small>
        </span>
        {post.promille !== null && (
          <span className={`post-bac lvl-${level(v)}`}>
            <i />
            {fmtPromille(v)} ‰
          </span>
        )}
        {mine && (
          <button
            className={`icon-btn ghost sm ${armed ? 'danger' : ''}`}
            aria-label={armed ? 'Trykk igjen for å slette' : 'Slett bilde'}
            onClick={() => (armed ? onDelete() : setArmed(true))}
          >
            {armed ? <span className="armed-text">Slett?</span> : <Trash2 size={16} />}
          </button>
        )}
      </header>
      <div className="post-img" ref={ref} style={{ aspectRatio: `${post.width} / ${Math.min(post.height, post.width * 1.35)}` }}>
        {src && <img src={src} alt={post.caption || `Bilde fra ${name}`} onLoad={(e) => e.currentTarget.classList.add('in')} />}
      </div>
      {post.caption && (
        <p className="post-caption">
          <strong>
            <Name name={name} gold={gold} />
          </strong>{' '}
          {post.caption}
        </p>
      )}
    </article>
  )
}

function ago(t: number, now: number) {
  const m = Math.round((now - t) / 60_000)
  if (m < 1) return 'Akkurat nå'
  if (m < 60) return `${m} min siden`
  const h = Math.floor(m / 60)
  if (h < 12) return `${h} t siden`
  const days = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 86_400_000)
  if (days === 0) return `I dag ${fmtTime(t)}`
  if (days === 1) return `I går ${fmtTime(t)}`
  return new Date(t).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }) + ` ${fmtTime(t)}`
}

/** Hidden file inputs: one opens the camera directly, one lets iOS offer camera or library */
export function PhotoInputs({ onPick }: { onPick: (f: File) => void }) {
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) onPick(f)
  }
  return (
    <>
      <input id="photo-any" type="file" accept="image/*" className="visually-hidden" onChange={handle} />
      <input id="photo-camera" type="file" accept="image/*" capture="environment" className="visually-hidden" onChange={handle} />
    </>
  )
}

export function Composer({
  file,
  onClose,
  onShare,
  promille,
}: {
  file: File | null
  onClose: () => void
  onShare: (caption: string) => Promise<boolean>
  promille: number
}) {
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  useEffect(() => {
    if (!file) {
      setCaption('')
      setBusy(false)
    }
  }, [file])

  return (
    <Drawer.Root open={!!file} onOpenChange={(o) => !o && !busy && onClose()} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="overlay" />
        <Drawer.Content className="sheet" aria-describedby={undefined}>
          <div className="sheet-handle" />
          <div className="sheet-head">
            <Drawer.Title className="sheet-title">Del bilde</Drawer.Title>
            <button className="icon-btn ghost" onClick={onClose} disabled={busy} aria-label="Lukk">
              <X size={20} />
            </button>
          </div>
          <div className="sheet-scroll composer">
            <div className="composer-img">{url && <img src={url} alt="" />}</div>
            <div className="composer-row">
              <label htmlFor="photo-any" className="chip">
                <ImageIcon size={16} /> Bytt bilde
              </label>
              <span className={`post-bac lvl-${level(promille)}`}>
                <i />
                {fmtPromille(promille)} ‰ nå
              </span>
            </div>
            <textarea
              className="caption-input"
              placeholder="Skriv en tekst …"
              value={caption}
              maxLength={500}
              rows={3}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
          <div className="sheet-foot">
            <button
              className="btn btn-primary btn-lg"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                const ok = await onShare(caption)
                setBusy(false)
                if (ok) onClose()
              }}
            >
              {busy ? 'Laster opp …' : 'Del i feeden'}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
