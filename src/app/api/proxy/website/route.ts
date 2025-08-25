// app/api/proxy/website/route.ts
import { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url || !url.startsWith('http')) {
    return new Response('Invalid URL', { status: 400 })
  }

  const res = await fetch(url)
  const contentType = res.headers.get('content-type') || ''

  // Non-HTML -> stream back directly
  if (!contentType.includes('text/html') && !contentType.includes('text/css')) {
    const buffer = await res.arrayBuffer()
    return new Response(buffer, {
      headers: { 'Content-Type': contentType },
    })
  }

  const origin = new URL(url).origin

  // CSS handling
  if (contentType.includes('text/css')) {
    let css = await res.text()
    css = css.replace(/url\(["']?([^"')]+)["']?\)/g, (_, path) => {
      try {
        const absoluteUrl = new URL(path, url).toString()
        return `url("/api/proxy/website?url=${encodeURIComponent(absoluteUrl)}")`
      } catch {
        return `url(${path})`
      }
    })

    return new Response(css, {
      headers: { 'Content-Type': 'text/css' },
    })
  }

  // HTML handling
  const html = await res.text()
  const $ = cheerio.load(html)
  $('meta[http-equiv="Content-Security-Policy"]').remove()

  $('link[href], script[src], img[src], video source[src], source[src], iframe[src]').each(
    (_, el) => {
      const attr = el.tagName === 'link' ? 'href' : 'src'
      const val = $(el).attr(attr)
      if (!val) return
      try {
        const resolvedUrl = new URL(val, url).toString()
        $(el).attr(attr, `/api/proxy/website?url=${encodeURIComponent(resolvedUrl)}`)
      } catch {}
    },
  )

  $('style').each((_, el) => {
    let css = $(el).html()
    if (!css) return
    css = css.replace(/url\(["']?([^"')]+)["']?\)/g, (_, path) => {
      try {
        const absoluteUrl = new URL(path, url).toString()
        return `url("/api/proxy/website?url=${encodeURIComponent(absoluteUrl)}")`
      } catch {
        return `url(${path})`
      }
    })
    $(el).html(css)
  })

  $('head').append(`<script src="/canvas-website-proxy/draggable-boxes.js"></script>`) // Inject custom script
  return new Response($.html(), {
    headers: { 'Content-Type': 'text/html' },
  })
}
