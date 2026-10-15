import { Crown } from 'lucide-react'

export function Avatar({ name, gold, size }: { name: string; gold?: boolean; size?: 'sm' | 'lg' }) {
  return (
    <span className={`avatar ${size ?? ''} ${gold ? 'gold' : ''}`}>
      {name[0]?.toUpperCase()}
      {gold && size !== 'sm' && <Crown className="avatar-crown" strokeWidth={2.4} aria-hidden="true" />}
    </span>
  )
}

export function Name({ name, gold }: { name: string; gold?: boolean }) {
  if (!gold) return <>{name}</>
  return (
    <span className="gold-name" title="Gullprofil">
      {name}
    </span>
  )
}
