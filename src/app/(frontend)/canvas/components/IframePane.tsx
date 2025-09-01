'use client'

import { Website } from '@/payload-types'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useRef, useState } from 'react'

type Current = {
  label: string
  x: number
  y: number
  orientation?: boolean
  rotated: boolean
}

type Annotation = {
  id: string
  pageUrl: string
  x: number
  y: number
  width: number
  height: number
  type: 'comment' | 'task'
  message: string
  timestamp: number
}

export default function IframePreview({
  pageData,
  url,
  injectionType = 'Manual',
  latest = false,
  mode = 'viewer',
}: {
  pageData: Website
  url: string
  injectionType?: 'Proxy' | 'Extension' | 'Manual'
  latest?: boolean
  mode?: 'viewer' | 'commentor'
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const session = useSession()
  const userName = session?.data?.user?.name || ''
  const userEmail = session?.data?.user?.email || ''
  const [current, setCurrent] = useState<Current | null>(null)
  const [scale, setScale] = useState(1)
  const [pendingBox, setPendingBox] = useState<any | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [form, setForm] = useState<{ message: string; type: 'comment' | 'task' }>({
    message: '',
    type: 'comment',
  })

  // 👉 Instead of reloading iframe, send a message when mode changes
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    try {
      iframe.contentWindow?.postMessage(
        { type: 'website-proxy-control', action: 'set-mode', mode },
        '*',
      )
    } catch (err) {
      console.warn('Failed to send mode to iframe:', err)
    }
  }, [mode])

  // 👉 UseMemo so iframe URL only changes when url/latest change
const iframeUrl = useMemo(() => {
  return `/api/proxy/website/?url=${encodeURIComponent(url)}&latest=${latest ? '1' : '0'}`
}, [url, latest])

  // 👉 Attach load listener once per pageData/current, and clean it up
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const existingThreads =
      pageData?.versions?.flatMap(
        (v) =>
          v['page-links']?.flatMap((p) =>
            p.thread?.map((t) => ({
              id: t['thread-id'],
              comments: t.comments,
              x: t.comments?.[0]?.ping?.x ?? 0,
              y: t.comments?.[0]?.ping?.y ?? 0,
              width: t.comments?.[0]?.ping?.width ?? 0,
              height: t.comments?.[0]?.ping?.height ?? 0,
            })),
          ) || [],
      ) || []
      

    const handleLoad = () => {
      iframe.contentWindow?.postMessage(
        {
          type: 'website-proxy-control',
          action: 'render-annotations',
          threads: existingThreads,
          currentViewport: current?.label || null,
        },
        '*',
      )
    }

    iframe.addEventListener('load', handleLoad)
    return () => {
      iframe.removeEventListener('load', handleLoad)
    }
  }, [pageData, current])

  // Listen for injected script messages
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'website-proxy-event' && event.data.action === 'box-created') {
        if (!latest) {
          alert(
            'You are not on the latest version. Please switch to the latest version to comment.',
          )
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'website-proxy-control', action: 'unlock-drawing' },
            '*',
          )
          return
        }
        setPendingBox(event.data)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [latest])
useEffect(() => {
  function handleProxyNav(event: MessageEvent) {
    if (event.data?.type === 'website-proxy-nav' && event.data.url) {
      if (iframeRef.current) {
        // ✅ Prevent reload loops
        if (iframeRef.current.src !== event.data.url) {
          iframeRef.current.src = event.data.url
        }
      }
    }
  }
  window.addEventListener('message', handleProxyNav)
  return () => window.removeEventListener('message', handleProxyNav)
}, [])


  // Get viewport size from localStorage
  useEffect(() => {
    const read = () => {
      const raw = localStorage.getItem('selectedViewport')
      if (raw) {
        try {
          setCurrent(JSON.parse(raw))
        } catch {}
      }
    }
    read()
    window.addEventListener('viewport:changed', read)
    return () => window.removeEventListener('viewport:changed', read)
  }, [])

  const dims = useMemo(() => {
    if (!current) return { w: 1920, h: 1080 }
    return current.rotated ? { w: current.y, h: current.x } : { w: current.x, h: current.y }
  }, [current])

  // Handle scaling
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const compute = () => {
      if (!el || !current) return
      const cw = el.clientWidth
      const ch = el.clientHeight
      if (cw === 0 || ch === 0) return

      const targetW = current.rotated ? current.y : current.x
      const targetH = current.rotated ? current.x : current.y

      if (targetW > cw || targetH > ch) {
        const s = Math.min(cw / targetW, ch / targetH)
        setScale(s)
      } else {
        setScale(1)
      }
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    window.addEventListener('resize', compute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', compute)
    }
  }, [dims.w, dims.h, current])

  const handleSave = () => {
    if (!pendingBox) return

    const newAnnotation: Annotation = {
      ...pendingBox,
      type: form.type,
      message: form.message,
    }

    // Extract from pageData
    const owner = pageData?.admins?.[0]?.admin || ''
    const realUrl = pageData?.url || ''
    const latestVersion = pageData?.versions?.[pageData.versions.length - 1]
    const latestVersionId = latestVersion?.id || '1'

    // RoomId format
    const roomId = `${owner}/${realUrl}/#${latestVersionId}`

    // ---- Clone versions ----
    const updatedVersions = [...(pageData?.versions || [])]
    const versionIndex = updatedVersions.findIndex((v) => v.id === latestVersionId)

    let newCommentId = '1' // default for new thread

    if (versionIndex !== -1) {
      const version = updatedVersions[versionIndex]
      const pageLinks = version['page-links'] || []
      const pageLinkIndex = pageLinks.findIndex((p) => p['page-link'] === realUrl)

      if (pageLinkIndex !== -1) {
        const pageLink = pageLinks[pageLinkIndex]
        const threads = pageLink.thread || []
        const threadIndex = threads.findIndex((t) => t['thread-id'] === newAnnotation.id)

        if (threadIndex !== -1) {
          // Existing thread → next comment-id = count + 1
          const existingThread = threads[threadIndex]
          newCommentId = String((existingThread.comments?.length || 0) + 1)
        }
      }
    }

    // ---- Build new comment object ----
    const newComment = {
      'comment-id': newCommentId,
      author: userName || 'Anonymous',
      authorEmail: userEmail || '',
      date: new Date(newAnnotation.timestamp).toISOString(),
      edited: false,
      editedAt: null,
      commentType: newAnnotation.type,
      ping: {
        x: newAnnotation.x,
        y: newAnnotation.y,
        height: newAnnotation.height,
        width: newAnnotation.width,
      },
      message: newAnnotation.message,
    }

    const newThread = {
      'thread-id': newAnnotation.id,
      viewport: current?.label || '',
      'viewport-Orientation': current?.orientation || false,
      comments: [newComment],
    }

    // ---- Update versions ----
    if (versionIndex === -1) {
      // No version found → create new one
      updatedVersions.push({
        id: latestVersionId,
        'page-links': [{ 'page-link': realUrl, roomId, thread: [newThread] }],
      })
    } else {
      const version = { ...updatedVersions[versionIndex] }
      const pageLinks = [...(version['page-links'] || [])]

      // Find if realUrl already exists in page-links
      const pageLinkIndex = pageLinks.findIndex((p) => p['page-link'] === realUrl)

      if (pageLinkIndex === -1) {
        // New page-link
        pageLinks.push({ 'page-link': realUrl, roomId, thread: [newThread] })
      } else {
        const pageLink = { ...pageLinks[pageLinkIndex] }
        const threads = [...(pageLink.thread || [])]

        const threadIndex = threads.findIndex((t) => t['thread-id'] === newThread['thread-id'])
        if (threadIndex === -1) {
          // Add new thread
          threads.push(newThread)
        } else {
          // Append new comment to existing thread
          const existingThread = { ...threads[threadIndex] }
          existingThread.comments = [...(existingThread.comments || []), newComment]
          threads[threadIndex] = existingThread
        }

        pageLink.thread = threads
        pageLinks[pageLinkIndex] = pageLink
      }

      version['page-links'] = pageLinks
      updatedVersions[versionIndex] = version
    }

    // ---- Build final payload ----
    const payloadData = {
      title: pageData?.title || '',
      url: realUrl,
      admins: pageData?.admins || [],
      editors: pageData?.editors || [],
      guests: pageData?.guests || [],
      enableDefaultViewports: pageData?.enableDefaultViewports ?? true,
      type: pageData?.type,
      versions: updatedVersions,
    }

    // Save in local state for UI
    setAnnotations((prev) => [...prev, newAnnotation])
    setPendingBox(null)
    setForm({ message: '', type: 'comment' })

    console.log('Final Payload Data: ', payloadData)

    // Send payload to Payload CMS
    fetch('/api/canvas/save/Website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadData),
    })
      .then((res) => res.json())
      .then((data) => {
        window.dispatchEvent(new CustomEvent('thread:added', { detail: newThread }))
      })
      .catch((err) => console.error('Error saving Website:', err))
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'website-proxy-control', action: 'unlock-drawing' },
      '*',
    )
  }

  const handleCancel = () => {
    setPendingBox(null)
    setForm({ message: '', type: 'comment' })

    iframeRef.current?.contentWindow?.postMessage(
      { type: 'website-proxy-control', action: 'remove-last-box' },
      '*',
    )
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'website-proxy-control', action: 'unlock-drawing' },
      '*',
    )
  }

  // Already listening to viewport:changed
  useEffect(() => {
    const read = () => {
      const raw = localStorage.getItem('selectedViewport')
      if (raw) {
        try {
          const vp = JSON.parse(raw)
          setCurrent(vp)

          // 👉 re-render annotations in iframe when viewport changes
          if (iframeRef.current) {
            const existingThreads =
              pageData?.versions?.flatMap(
                (v) =>
                  v['page-links']?.flatMap((p) =>
                    p.thread?.map((t) => ({
                      id: t['thread-id'],
                      viewport: t.viewport, // 👈 make sure viewport travels
                      comments: t.comments,
                      x: t.comments?.[0]?.ping?.x ?? 0,
                      y: t.comments?.[0]?.ping?.y ?? 0,
                      width: t.comments?.[0]?.ping?.width ?? 0,
                      height: t.comments?.[0]?.ping?.height ?? 0,
                    })),
                  ) || [],
              ) || []

            iframeRef.current.contentWindow?.postMessage(
              {
                type: 'website-proxy-control',
                action: 'render-annotations',
                threads: existingThreads,
                currentViewport: vp.label, // 👈 send selected viewport
              },
              '*',
            )
          }
        } catch {}
      }
    }

    read()
    window.addEventListener('viewport:changed', read)
    return () => window.removeEventListener('viewport:changed', read)
  }, [pageData])

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden relative"
    >
      {/* Iframe */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <div
          style={{
            width: dims.w,
            height: dims.h,
            background: '#f8f8f8',
            borderRadius: '8px',
            boxShadow: '0 5px 8px rgba(0,0,0,0.35)',
            overflow: 'hidden',
          }}
        >
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            id="proxy-frame"
            width={dims.w}
            height={dims.h}
            style={{
              border: 'none',
              display: 'block',
              width: '100%',
              height: '100%',
            }}
            className="no-scrollbar"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
          />
        </div>
      </div>

      {/* Popup form when a box is created */}
      {pendingBox && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-lg p-4 w-96 z-50">
          <h2 className="font-semibold mb-2">Add annotation</h2>
          <textarea
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Enter your comment or task..."
            className="w-full border rounded p-2 mb-3"
          />
          <div className="mb-3">
            <label className="mr-3">
              <input
                type="radio"
                name="annotationType"
                checked={form.type === 'comment'}
                onChange={() => setForm((f) => ({ ...f, type: 'comment' }))}
              />{' '}
              Comment
            </label>
            <label>
              <input
                type="radio"
                name="annotationType"
                checked={form.type === 'task'}
                onChange={() => setForm((f) => ({ ...f, type: 'task' }))}
              />{' '}
              Task
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
