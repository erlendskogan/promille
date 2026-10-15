/**
 * GitHub Pages lets browsers cache index.html for 10 minutes, and iOS home-screen
 * apps can hold on to it longer. When the app comes back into view, check whether
 * a newer build is out and reload into it.
 */
const current = () => document.querySelector<HTMLScriptElement>('script[type="module"][src*="assets/index-"]')?.src

async function check() {
  const mine = current()
  if (!mine || import.meta.env.DEV) return
  try {
    const html = await (await fetch(`./?v=${Date.now()}`, { cache: 'no-store' })).text()
    const latest = html.match(/assets\/index-[\w-]+\.js/)?.[0]
    if (latest && !mine.endsWith(latest)) location.reload()
  } catch {
    /* offline */
  }
}

export function watchForUpdates() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
  check()
}
