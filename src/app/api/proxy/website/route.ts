// app/api/proxy/website/route.ts
import { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'

function isCrossDomain(targetUrl: string, baseUrl: string): boolean {
  try {
    const targetHost = new URL(targetUrl, baseUrl).host
    const baseHost = new URL(baseUrl).host
    return targetHost !== baseHost
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url || !url.startsWith('http')) {
    return new Response('Invalid URL', { status: 400 })
  }

  const res = await fetch(url)
  const contentType = res.headers.get('content-type') || ''

  // Non-HTML/CSS → return directly
  if (!contentType.includes('text/html') && !contentType.includes('text/css')) {
    const buffer = await res.arrayBuffer()
    return new Response(buffer, {
      headers: { 'Content-Type': contentType },
    })
  }

  // CSS handling
  if (contentType.includes('text/css')) {
    let css = await res.text()
    css = css.replace(/url\(["']?([^"')]+)["']?\)/g, (_, path) => {
      if (path.startsWith('/api/proxy/website?url=')) return `url(${path})`
      try {
        const absoluteUrl = new URL(path, url).toString()
        return isCrossDomain(absoluteUrl, url)
          ? `url("/api/proxy/website?url=${encodeURIComponent(absoluteUrl)}")`
          : `url(${absoluteUrl})`
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

  // Remove CSP/meta refresh/base
  $('meta[http-equiv="Content-Security-Policy"]').remove()
  $('meta[http-equiv="refresh"]').remove()
  $('base').remove()

  // Rewrite assets
  $('link[href], script[src], img[src], video source[src], source[src], iframe[src]').each(
    (_, el) => {
      const attr = el.tagName === 'link' ? 'href' : 'src'
      const val = $(el).attr(attr)
      if (!val) return
      if (val.startsWith('/api/proxy/website?url=')) return

      try {
        const resolvedUrl = new URL(val, url).toString()

        // ✅ Next.js assets
        if (val.startsWith('/_next/') || resolvedUrl.includes('/_next/')) {
          $(el).attr(attr, `/api/proxy/website?url=${encodeURIComponent(resolvedUrl)}`)
          return
        }

        if (isCrossDomain(resolvedUrl, url)) {
          $(el).attr(attr, `/api/proxy/website?url=${encodeURIComponent(resolvedUrl)}`)
        } else {
          $(el).attr(attr, resolvedUrl)
        }
      } catch {}
    },
  )

  // Rewrite <a href>
  $('a[href]').each((_, el) => {
    const val = $(el).attr('href')
    if (!val) return
    if (val.startsWith('#') || val.startsWith('mailto:') || val.startsWith('tel:')) return
    if (val.startsWith('/api/proxy/website?url=')) return

    try {
      const resolvedUrl = new URL(val, url).toString()
      if (isCrossDomain(resolvedUrl, url)) {
        $(el).attr('href', `/api/proxy/website?url=${encodeURIComponent(resolvedUrl)}`)
      } else {
        $(el).attr('href', resolvedUrl)
      }
    } catch {}
  })

  // Inline <style> URLs
  $('style').each((_, el) => {
    let css = $(el).html()
    if (!css) return
    css = css.replace(/url\(["']?([^"')]+)["']?\)/g, (_, path) => {
      if (path.startsWith('/api/proxy/website?url=')) return `url(${path})`
      try {
        const absoluteUrl = new URL(path, url).toString()
        return isCrossDomain(absoluteUrl, url)
          ? `url("/api/proxy/website?url=${encodeURIComponent(absoluteUrl)}")`
          : `url(${absoluteUrl})`
      } catch {
        return `url(${path})`
      }
    })
    $(el).html(css)
  })

  // Inject safe patch script
  $('head').append(`
    <script>
      (function() {
        const proxyPrefix = "/api/proxy/website?url=" + encodeURIComponent(new URL("${url}").origin + "/_next/")

        // 🚫 Block service workers
        if (navigator.serviceWorker) {
          navigator.serviceWorker.register = () => Promise.reject('Blocked by proxy')
        }

        // 🚫 Block infinite reloads via location
        const realAssign = window.location.assign
        window.location.assign = function(url) {
          if (url && url.includes('/api/proxy/website')) return
          return realAssign.call(window.location, url)
        }

        const realReplace = window.location.replace
        window.location.replace = function(url) {
          if (url && url.includes('/api/proxy/website')) return
          return realReplace.call(window.location, url)
        }

        window.location.reload = function() {
          console.warn('[Proxy] Blocked reload attempt')
          return
        }

        // 🚫 Intercept History API
        ;(function(history) {
          const pushState = history.pushState
          history.pushState = function(s,t,u) {
            if (u && u.includes('/api/proxy/website')) return
            return pushState.apply(history, arguments)
          }
          const replaceState = history.replaceState
          history.replaceState = function(s,t,u) {
            if (u && u.includes('/api/proxy/website')) return
            return replaceState.apply(history, arguments)
          }
        })(window.history)

        // 🚫 Intercept <a> clicks
        document.addEventListener('click', function(e) {
          const a = e.target.closest('a')
          if (!a) return
          const href = a.getAttribute('href')
          if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
          if (href.startsWith('/api/proxy/website')) return

          e.preventDefault()
          try {
            const abs = new URL(href, window.location.href).toString()
            const proxied = '/api/proxy/website?url=' + encodeURIComponent(abs)
            window.history.pushState({}, '', proxied)
            window.parent.postMessage({ type: 'website-proxy-nav', url: proxied }, '*')
          } catch(err) {}
        }, true)

        // 🚫 Remove Next.js prefetch links
        document.querySelectorAll('link[rel=prefetch]').forEach(l => l.remove())

        // ✅ Keep forcing Next.js to use proxy prefix
        function enforceProxyPath() {
          if (window.__webpack_require__) {
            window.__webpack_require__.p = proxyPrefix
          }
          if (window.__NEXT_DATA__) {
            window.__NEXT_DATA__.assetPrefix = proxyPrefix
          }
        }
        enforceProxyPath()
        setInterval(enforceProxyPath, 500)

        // ✅ Patch dynamic script creation
        const origCreate = document.createElement
        document.createElement = function(tag) {
          const el = origCreate.call(document, tag)
          if (tag.toLowerCase() === 'script') {
            const origSetAttr = el.setAttribute
            el.setAttribute = function(name, value) {
              if (name === 'src' && value && value.startsWith('/_next/')) {
                value = proxyPrefix + value.replace(/^\\/_next\\//, '')
              }
              return origSetAttr.call(el, name, value)
            }
          }
          return el
        }
      })();
    </script>
  `)

  // Custom draggable boxes
  $('head').append(`<script src="/canvas-website-proxy/draggable-boxes.js"></script>`)

  // 🔄 Replace hardcoded "/_next/"
  let body = $.html()
  body = body.replace(/"\/_next\//g, '"/api/proxy/website?url=' + encodeURIComponent(url + '/_next/'))

  return new Response(body, {
    headers: { 'Content-Type': 'text/html' },
  })
}
