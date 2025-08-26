console.log('[Inject.js] Script loaded inside proxied page!')

let isDrawing = false
let isLocked = false // 🚨 lock while annotation modal is open
let startX = 0
let startY = 0
let currentBox = null
let lastBox = null
let boxCounter = 0

function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get(name)
}

const isLatest = getQueryParam('latest') === '1'
// 🔄 make mode mutable (start from query param)
let mode = getQueryParam('mode') || 'viewer'

if (!isLatest) {
  console.log('[Inject.js] Not latest version → blocking annotations')
}

function createBox(x, y, width, height) {
  const box = document.createElement('div')
  box.style.position = 'absolute'
  box.style.left = `${x}px`
  box.style.top = `${y}px`
  box.style.width = `${width}px`
  box.style.height = `${height}px`
  box.style.border = '2px solid blue'
  box.style.backgroundColor = 'rgba(0, 0, 255, 0.1)'
  box.style.zIndex = 9999
  box.style.pointerEvents = 'none'
  document.body.appendChild(box)
  lastBox = box
  return box
}

// Mouse down → start drawing
window.addEventListener('mousedown', (event) => {
  if (mode === 'viewer') return
  if (!isLatest) return
  if (isLocked) return
  if (event.button !== 0) return
  document.body.style.userSelect = 'none'
  isDrawing = true
  startX = event.pageX
  startY = event.pageY
  currentBox = createBox(startX, startY, 0, 0)
})

// Mouse move → resize
window.addEventListener('mousemove', (event) => {
  if (!isDrawing || !currentBox) return
  const currentX = event.pageX
  const currentY = event.pageY
  const width = Math.abs(currentX - startX)
  const height = Math.abs(currentY - startY)
  const left = Math.min(currentX, startX)
  const top = Math.min(currentY, startY)
  currentBox.style.left = `${left}px`
  currentBox.style.top = `${top}px`
  currentBox.style.width = `${width}px`
  currentBox.style.height = `${height}px`
})

// Mouse up → finalize
window.addEventListener('mouseup', (event) => {
  if (!isDrawing) return
  if (mode === 'viewer') return
  if (!isLatest) return
  document.body.style.userSelect = ''
  isDrawing = false
  const rect = currentBox.getBoundingClientRect()
  if (rect.width < 5 || rect.height < 5) {
    currentBox.remove()
    currentBox = null
    return
  }
  const boxId = `box-${Date.now()}-${++boxCounter}`
  isLocked = true

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  window.parent.postMessage(
    {
      type: 'website-proxy-event',
      action: 'box-created',
      id: boxId,
      pageUrl: window.location.href,
      x: rect.left / viewportWidth,
      y: rect.top / viewportHeight,
      width: rect.width / viewportWidth,
      height: rect.height / viewportHeight,
      scrollX: window.scrollX / document.documentElement.scrollWidth,
      scrollY: window.scrollY / document.documentElement.scrollHeight,
      timestamp: Date.now(),
    },
    '*',
  )
  currentBox = null
})

// Listen for parent messages
window.addEventListener('message', (event) => {
  if (event.data?.type === 'website-proxy-control') {
    if (event.data.action === 'unlock-drawing') {
      console.log('[Inject.js] Unlocking drawing mode')
      isLocked = false
    }
    if (event.data.action === 'remove-last-box') {
      console.log('[Inject.js] Removing last box')
      if (lastBox) {
        lastBox.remove()
        lastBox = null
      }
    }
    if (event.data.action === 'set-mode') {
      mode = event.data.mode
      console.log(`[Inject.js] Mode switched → ${mode}`)
    }
  }
})

function drawAnnotation(thread) {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const pageWidth = document.documentElement.scrollWidth
  const pageHeight = document.documentElement.scrollHeight
  const box = document.createElement('div')
  box.style.position = 'absolute'
  box.style.left = `${thread.x * viewportWidth + (thread.scrollX ?? 0) * pageWidth}px`
  box.style.top = `${thread.y * viewportHeight + (thread.scrollY ?? 0) * pageHeight}px`
  box.style.width = `${thread.width * viewportWidth}px`
  box.style.height = `${thread.height * viewportHeight}px`
  box.style.border = '2px solid red'
  box.style.backgroundColor = 'rgba(255, 0, 0, 0.1)'
  box.style.zIndex = 9998
  box.style.pointerEvents = 'none'
  box.dataset.threadId = thread.id

  document.body.appendChild(box)
}

function clearAnnotations() {
  document.querySelectorAll('[data-thread-id]').forEach((el) => el.remove())
}

window.addEventListener('message', (event) => {
  console.log('event ', event.data.type)
  if (event.data?.type === 'website-proxy-control') {
    console.log('evetnt ', event.data.action)
    if (event.data.action === 'highlight-thread') {
      const { threadId } = event.data
      console.log('[Inject.js] Highlight request for thread', threadId)

      const el = document.querySelector(`[data-thread-id="${threadId}"]`)
      if (el) {
        // scroll into view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })

        // temporary highlight effect
        el.style.outline = '3px solid orange'
        el.style.transition = 'outline 0.5s ease-in-out'

        setTimeout(() => {
          el.style.outline = 'none'
        }, 2000)
      }
    }

    if (event.data.action === 'render-annotations') {
      console.log('[Inject.js] Rendering annotations', event.data.threads)

      const currentViewport = event.data.currentViewport || null

      // 🧹 clear old
      clearAnnotations()

      // 🎯 draw only matching viewport threads
      event.data.threads
        .filter((thread) => !currentViewport || thread.viewport === currentViewport)
        .forEach(drawAnnotation)
    }

    if (event.data.action === 'unlock-drawing') {
      isLocked = false
    }

    if (event.data.action === 'remove-last-box') {
      if (lastBox) {
        lastBox.remove()
        lastBox = null
      }
    }

    if (event.data.action === 'set-mode') {
      mode = event.data.mode
      console.log(`[Inject.js] Mode switched → ${mode}`)
    }
  }
})
