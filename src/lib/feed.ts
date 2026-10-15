import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export interface Post {
  id: string
  userKey: string
  caption: string
  width: number
  height: number
  promille: number | null
  createdAt: number
}

interface PostRow {
  id: string
  user_key: string
  caption: string
  width: number
  height: number
  promille: number | null
  created_at: string
}

const toPost = (r: PostRow): Post => ({
  id: r.id,
  userKey: r.user_key,
  caption: r.caption,
  width: r.width,
  height: r.height,
  promille: r.promille,
  createdAt: Date.parse(r.created_at),
})

const PAGE = 20
const SEEN = 'promille:feed-seen'

// ───── images ─────

const images = new Map<string, Promise<string | null>>()

/** Image data for a post, fetched once and cached */
export function loadImage(id: string) {
  let p = images.get(id)
  if (!p) {
    p = Promise.resolve(supabase.from('post_images').select('data').eq('post_id', id).maybeSingle()).then(
      ({ data }) => (data as { data: string } | null)?.data ?? null,
    )
    images.set(id, p)
    p.then((v) => v === null && images.delete(id))
  }
  return p
}

/** Downscale and re-encode a photo as JPEG. Handles iPhone orientation and HEIC (on Safari). */
export async function compress(file: Blob, max = 1440) {
  let src: CanvasImageSource & { width: number; height: number }
  try {
    src = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    const url = URL.createObjectURL(file)
    src = await new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = rej
      img.src = url
    })
  }
  const scale = Math.min(1, max / Math.max(src.width, src.height))
  const width = Math.round(src.width * scale)
  const height = Math.round(src.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(src, 0, 0, width, height)
  let q = 0.82
  let data = canvas.toDataURL('image/jpeg', q)
  while (data.length > 1_000_000 && q > 0.4) {
    q -= 0.1
    data = canvas.toDataURL('image/jpeg', q)
  }
  return { data, width, height }
}

// ───── feed ─────

export function useFeed(token: string | null, me: string | null, onError: (e: { code?: string } | null) => void) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loaded, setLoaded] = useState(false)
  const [more, setMore] = useState(true)
  const [seen, setSeenState] = useState(() => {
    try {
      return Number(localStorage.getItem(SEEN)) || 0
    } catch {
      return 0
    }
  })

  const merge = (list: Post[]) =>
    setPosts((s) => {
      const byId = new Map(s.map((p) => [p.id, p]))
      for (const p of list) byId.set(p.id, p)
      return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt)
    })

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAGE)
    if (error) return
    merge((data as PostRow[]).map(toPost))
    setMore(data.length === PAGE)
    setLoaded(true)
  }, [])

  const loadMore = useCallback(async () => {
    const oldest = posts[posts.length - 1]
    if (!oldest) return
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .lt('created_at', new Date(oldest.createdAt).toISOString())
      .order('created_at', { ascending: false })
      .limit(PAGE)
    if (error) return
    merge((data as PostRow[]).map(toPost))
    setMore(data.length === PAGE)
  }, [posts])

  useEffect(() => {
    load()
    const vis = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', vis)
    const channel = supabase
      .channel('promille-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (p) => {
        if (p.eventType === 'DELETE') {
          const id = (p.old as Partial<PostRow>).id
          if (id) setPosts((s) => s.filter((x) => x.id !== id))
        } else merge([toPost(p.new as PostRow)])
      })
      .subscribe()
    return () => {
      document.removeEventListener('visibilitychange', vis)
      supabase.removeChannel(channel)
    }
  }, [load])

  const create = useCallback(
    async (file: Blob, caption: string, promille: number) => {
      if (!token || !me) return false
      const img = await compress(file)
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
      const { error } = await supabase.rpc('promille_create_post', {
        p_token: token,
        p_id: id,
        p_caption: caption.trim(),
        p_data: img.data,
        p_width: img.width,
        p_height: img.height,
        p_promille: Math.round(promille * 100) / 100,
      })
      if (error) {
        onError(error)
        return false
      }
      images.set(id, Promise.resolve(img.data))
      merge([{ id, userKey: me, caption: caption.trim(), width: img.width, height: img.height, promille, createdAt: Date.now() }])
      return true
    },
    [token, me, onError],
  )

  const remove = useCallback(
    async (id: string) => {
      if (!token) return
      const before = posts
      setPosts((s) => s.filter((p) => p.id !== id))
      const { error } = await supabase.rpc('promille_delete_post', { p_token: token, p_id: id })
      if (error) {
        setPosts(before)
        onError(error)
      }
    },
    [token, posts, onError],
  )

  const markSeen = useCallback(() => {
    const t = Date.now()
    setSeenState(t)
    try {
      localStorage.setItem(SEEN, String(t))
    } catch {
      /* ignore */
    }
  }, [])

  const unseen = posts.filter((p) => p.createdAt > seen && p.userKey !== me).length

  return { posts, loaded, more, loadMore, create, remove, unseen, markSeen }
}

export type Feed = ReturnType<typeof useFeed>
