'use client'
import React, { useRef, useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

type Annotation = {
  id: number
  x: number
  y: number
  text: string
  timestamp?: string
  user?: string
}

export default function WebsiteMain({ props }) {
  const [iframeUrl, setIframeUrl] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeWrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [isAnnotating, setIsAnnotating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const resolutions = [
    { label: 'Desktop', width: 1920, height: 1080 },
    { label: 'Laptop', width: 1366, height: 768 },
    { label: 'Tablet', width: 768, height: 1024 },
    { label: 'Mobile (Large)', width: 414, height: 896 },
    { label: 'Mobile (Medium)', width: 375, height: 667 },
    { label: 'Mobile (Small)', width: 320, height: 568 },
  ]
  const [selectedResolution, setSelectedResolution] = useState(resolutions[0])
  const [showResolutionMenu, setShowResolutionMenu] = useState(false)

  const [comments, setComments] = useState<Annotation[]>([])
  const socketRef = useRef<Socket | null>(null)

  const toggleAnnotationMode = () => {
    setIsAnnotating((prev) => {
      const newState = !prev
      const iframe = iframeWrapperRef.current?.querySelector('iframe')
      if (iframe) {
        iframe.contentWindow?.postMessage({ type: 'annotator:toggle', payload: newState }, '*')
      }
      return newState
    })
  }

  const toggleEditorMode = () => {
    setIsEditing((prev) => {
      const newState = !prev
      const iframe = iframeWrapperRef.current?.querySelector('iframe')
      if (iframe) {
        iframe.contentWindow?.postMessage({ type: 'editor:toggle', payload: newState }, '*')
      }
      return newState
    })
  }

  useEffect(() => {
    if (props.type.injectionType == 'Proxy') {
      setIframeUrl(`/api/proxy?url=${encodeURIComponent(props.url)}`)
    } else if (props.type.injectionType == 'Manual') {
      setIframeUrl(props.url)
    }
  }, [props.type.injectionType, props.url])

  /* Handle Resize this thing is fixed don't touch */
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const maxWidth = containerRef.current.offsetWidth
        const maxHeight = window.innerHeight - 100
        const scaleWidth = maxWidth / 1920
        const scaleHeight = maxHeight / 1080
        setScale(Math.min(scaleWidth, scaleHeight, 1))
      }
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  /* Initialize Socket.io */
  // useEffect(() => {
  //   const initSocket = async () => {
  //     await fetch('/api/socket')
  //     const socket = io({ path: '/api/socket/io' })
  //     socketRef.current = socket

  //     socket.on('connect', () => {
  //       console.log('[Socket] Connected:', socket.id)

  //       socket.on('cursor:update', (data: { user: string; x: number; y: number }) => {
  //         const iframe = iframeWrapperRef.current?.querySelector('iframe')
  //         iframe?.contentWindow?.postMessage(
  //           {
  //             type: 'cursor:update',
  //             payload: data,
  //           },
  //           '*',
  //         )
  //       })

  //       socket.on('disconnect', () => {
  //         console.log('[Socket] Disconnected')
  //       })
  //     })

  //     socket.on('annotation:receive', (data) => {
  //       // Use id from data
  //       const { id, x, y, width, height, text } = data

  //       iframeWrapperRef.current?.querySelector('iframe')?.contentWindow?.postMessage(
  //         {
  //           type: 'annotator:addPin',
  //           payload: { id, x, y, width, height, text },
  //         },
  //         '*',
  //       )

  //       // Update local state
  //       setComments((prev) => [...prev, { id, x, y, width, height, text }])
  //     })
  //   }
  //   initSocket()
  //   return () => {
  //     socketRef.current?.disconnect()
  //   }
  // }, [])

  // /* On Comments Socket.io */
  // useEffect(() => {
  //   const handler = (event: MessageEvent) => {
  //     if (event.data?.type === 'socket:emit') {
  //       const rawAnnotation = event.data.payload

  //       // 👉 Prompt for username if not present
  //       let username = localStorage.getItem('annotator-username')
  //       if (!username) {
  //         username = prompt('Please enter your name to leave a comment:')
  //         if (!username) return // User cancelled prompt
  //         localStorage.setItem('annotator-username', username)
  //       }

  //       const annotation = {
  //         ...rawAnnotation,
  //         user: username,
  //         timestamp: new Date().toISOString(),
  //       }

  //       console.log('[Parent] Got annotation from iframe:', annotation)

  //       socketRef.current?.emit('annotation:add', annotation)
  //       setComments((prev) => [...prev, annotation])

  //       const iframe = iframeWrapperRef.current?.querySelector('iframe')
  //       iframe?.contentWindow?.postMessage(
  //         {
  //           type: 'annotator:addPin',
  //           payload: annotation,
  //         },
  //         '*',
  //       )
  //     }
  //     if (event.data?.type === 'cursor:move') {
  //       const username = localStorage.getItem('annotator-username')
  //       if (!username) return
  //       socketRef.current?.emit('cursor:update', {
  //         user: username,
  //         x: event.data.payload.x,
  //         y: event.data.payload.y,
  //       })
  //     }
  //   }

  //   window.addEventListener('message', handler)
  //   return () => window.removeEventListener('message', handler)
  // }, [comments])

  // useEffect(() => {
  //   const handleMouseMove = (e: MouseEvent) => {
  //     const username = localStorage.getItem('annotator-username')
  //     if (!username) return
  //     socketRef.current?.emit('cursor:update', {
  //       user: username,
  //       x: e.clientX + window.scrollX,
  //       y: e.clientY + window.scrollY,
  //     })
  //   }

  //   window.addEventListener('mousemove', handleMouseMove)
  //   return () => window.removeEventListener('mousemove', handleMouseMove)
  // }, [])

  return (
    <div className="flex min-h-screen w-full bg-gray-100">
      <div className="flex flex-col w-full p-6 gap-4">
        <div className="flex gap-2 items-center w-full border-b-4 pb-3 border-gray-300 shadow-xl justify-center">
          {iframeUrl && (
            <div className="flex gap-2">
              <button
                onClick={toggleAnnotationMode}
                className={`px-4 py-2 rounded ${
                  isAnnotating ? 'bg-red-600' : 'text-gray-800 border-gray-300 border bg-white'
                }`}
              >
                {isAnnotating ? 'Disable Commenting' : 'Enable Commenting'}
              </button>
              <button
                onClick={toggleEditorMode}
                className={`px-4 py-2 rounded ${
                  isEditing ? 'bg-red-600' : 'text-gray-800 border-gray-300 border bg-white'
                }`}
              >
                {isEditing ? 'Disable Editor' : 'Enable Editor'}
              </button>
              <button
                onClick={() => setShowComments((prev) => !prev)}
                className="px-4 py-2 rounded text-gray-800 border-gray-300 border bg-white"
              >
                {showComments ? 'Hide Comments' : 'Show Comments'}
              </button>
              <a
                href={props.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded text-gray-800 border border-gray-300 bg-white text-center flex justify-center items-center"
              >
                Open Site
              </a>
              <div className="relative">
                <button
                  onClick={() => setShowResolutionMenu((prev) => !prev)}
                  className="px-6 py-3  rounded border text-gray-800 border-gray-300 bg-white hover:bg-gray-50 text-md flex items-center gap-1"
                >
                  🖥 {selectedResolution.label}
                </button>

                {showResolutionMenu && (
                  <div className="absolute top-full mt-2 left-0 bg-white border border-gray-300 rounded shadow-md z-10 w-48">
                    {resolutions.map((res, index) => (
                      <button
                        key={index}
                        className={`w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 ${
                          selectedResolution.label === res.label ? 'bg-gray-200 font-medium' : ''
                        }`}
                        onClick={() => {
                          setSelectedResolution(res)
                          setShowResolutionMenu(false)
                        }}
                      >
                        {res.label} ({res.width}×{res.height})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {iframeUrl && (
          <div className="flex gap-1 justify-center items-start">
            <div
              ref={iframeWrapperRef}
              className="relative overflow-auto bg-gray-200"
              style={{
                width: showComments
                  ? selectedResolution.width * 0.75 // reduce width to 75% if comments shown
                  : selectedResolution.width,
                height: showComments
                  ? selectedResolution.height * 0.75 // reduce width to 75% if comments shown
                  : selectedResolution.height,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <iframe
                src={iframeUrl}
                width={showComments ? selectedResolution.width * 0.75 : selectedResolution.width}
                height={
                  showComments
                    ? selectedResolution.height * 0.75 // reduce width to 75% if comments shown
                    : selectedResolution.height
                }
                style={{ border: 'none', display: 'block' }}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>

            {showComments && (
              <div className=" w-[25%] bg-white border border-gray-200 rounded-xl shadow-sm mx-auto p-6">
                <h2 className="text-gray-800 text-lg font-semibold mb-4">💬 Comments</h2>
                <ul className="space-y-4">
                  {comments.map((c, i) => (
                    <li
                      key={i}
                      onClick={() => {
                        const iframe = iframeWrapperRef.current?.querySelector('iframe')
                        iframe?.contentWindow?.postMessage(
                          {
                            type: 'annotator:scrollToComment',
                            payload: { id: i + 1 },
                          },
                          '*',
                        )
                      }}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 shadow-sm cursor-pointer hover:bg-blue-50"
                    >
                      <div className="font-medium mb-1">
                        {c.text}
                        {c.user && <span className="ml-2 text-xs text-gray-500">— {c.user}</span>}
                      </div>
                      {c.timestamp && (
                        <div className="text-xs text-gray-500">
                          {new Date(c.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
