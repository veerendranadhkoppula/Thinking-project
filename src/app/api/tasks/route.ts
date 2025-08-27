import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { NextResponse } from 'next/server'

type TaskStatusUi = 'Active' | 'Completed'
type TaskStatusDb = 'active' | 'completed'

const uiToDb = (s: TaskStatusUi | TaskStatusDb): TaskStatusDb =>
  s === 'Completed' || s === 'completed' ? 'completed' : 'active'
const dbToUi = (s?: TaskStatusDb): TaskStatusUi =>
  s === 'completed' ? 'Completed' : 'Active'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const websiteId = searchParams.get('websiteId')
    const versionParam = searchParams.get('version')

    if (!websiteId) {
      return NextResponse.json({ message: 'websiteId is required' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })
    const website: any = await payload.findByID({
      collection: 'Website',
      id: websiteId,
      depth: 1,
    })

    if (!website) {
      return NextResponse.json({ message: 'Website not found' }, { status: 404 })
    }

    const tasks: any[] = []

    ;(website?.versions || []).forEach((version: any, vIdx: number) => {
      if (versionParam && version.id !== versionParam) return

      ;(version['page-links'] || []).forEach((pl: any, plIdx: number) => {
        ;(pl.thread || []).forEach((thread: any, thIdx: number) => {
          ;(thread.comments || []).forEach((comment: any, cIdx: number) => {
            if (comment.commentType === 'task') {
              const authorEmail =
                (comment.authorEmail && String(comment.authorEmail)) ||
                (comment.author && String(comment.author)) ||
                null

              // Use ids when present
              const commentId: string | null = comment['comment-id'] || comment.id || null

              // Guaranteed-unique row identity for React
              const rowKey = [
                `w:${website.id ?? 'w'}`,
                `v:${version.id ?? vIdx}`,
                `pl:${pl.id ?? plIdx}`,
                `th:${thread.id ?? thIdx}`,
                `c:${commentId ?? cIdx}`,
              ].join('|')

              // Absolute array path we can traverse on PATCH (index-based)
              const pathKey = `v#${vIdx}/pl#${plIdx}/th#${thIdx}/c#${cIdx}`

              tasks.push({
                id: commentId,
                rowKey,
                pathKey, // <<< send to client
                name: comment.message || 'Untitled Task',
                status: dbToUi(comment.commentStatus),
                authorEmail,
                author: comment.author || null,
                threadId: thread.id || null,
                pageLinkId: pl.id || null,
                websiteId: website.id || null,
                date: comment.date || null,
                _rawIds: {
                  versionId: version.id || null,
                  pageLinkId: pl.id || null,
                  threadId: thread.id || null,
                  commentArrayItemId: comment.id || null,
                },
              })
            }
          })
        })
      })
    })

    return NextResponse.json({ tasks }, { status: 200 })
  } catch (err: any) {
    console.error('[Fetch Tasks Error]', err)
    return NextResponse.json({ message: err.message || 'Failed to fetch tasks' }, { status: 500 })
  }
}

/**
 * PATCH body:
 * {
 *   "websiteId": "abc123",
 *   "pathKey": "v#0/pl#0/th#2/c#5", // absolute index path (preferred, guaranteed)
 *   // optional fallback if you still want to support id-based updates:
 *   "commentId": "cmt-42",
 *   "status": "Active" | "Completed"
 * }
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { websiteId, pathKey, commentId, status } = body as {
      websiteId?: string
      pathKey?: string
      commentId?: string
      status?: TaskStatusUi | TaskStatusDb
    }

    if (!websiteId || !status) {
      return NextResponse.json(
        { message: 'websiteId and status are required' },
        { status: 400 },
      )
    }

    const newDbStatus: TaskStatusDb = uiToDb(status)

    const payload = await getPayload({ config: configPromise })
    const website: any = await payload.findByID({
      collection: 'Website',
      id: websiteId,
      depth: 0,
    })
    if (!website) {
      return NextResponse.json({ message: 'Website not found' }, { status: 404 })
    }

    let updated = false

    // Prefer exact index traversal via pathKey (guaranteed single target)
    if (pathKey) {
      const m = pathKey.match(/^v#(\d+)\/pl#(\d+)\/th#(\d+)\/c#(\d+)$/)
      if (!m) {
        return NextResponse.json({ message: 'Invalid pathKey' }, { status: 400 })
      }
      const [_, v, pl, th, c] = m
      const vIdx = Number(v), plIdx = Number(pl), thIdx = Number(th), cIdx = Number(c)

      if (
        !Array.isArray(website.versions) ||
        !website.versions[vIdx] ||
        !Array.isArray(website.versions[vIdx]['page-links']) ||
        !website.versions[vIdx]['page-links'][plIdx] ||
        !Array.isArray(website.versions[vIdx]['page-links'][plIdx].thread) ||
        !website.versions[vIdx]['page-links'][plIdx].thread[thIdx] ||
        !Array.isArray(website.versions[vIdx]['page-links'][plIdx].thread[thIdx].comments) ||
        !website.versions[vIdx]['page-links'][plIdx].thread[thIdx].comments[cIdx]
      ) {
        return NextResponse.json({ message: 'pathKey out of bounds' }, { status: 404 })
      }

      const comment =
        website.versions[vIdx]['page-links'][plIdx].thread[thIdx].comments[cIdx]
      comment.commentStatus = newDbStatus
      updated = true
    } else if (commentId) {
      // Backward-compatible path: locate by id (may touch multiple if data has dupes)
      const versions = (website.versions || []).map((version: any) => {
        const pageLinks = (version['page-links'] || []).map((pl: any) => {
          const threads = (pl.thread || []).map((thread: any) => {
            const comments = (thread.comments || []).map((comment: any) => {
              const thisCommentId = comment['comment-id'] || comment.id
              if (thisCommentId === commentId) {
                updated = true
                return { ...comment, commentStatus: newDbStatus }
              }
              return comment
            })
            return { ...thread, comments }
          })
          return { ...pl, thread: threads }
        })
        return { ...version, ['page-links']: pageLinks }
      })
      if (!updated) {
        return NextResponse.json({ message: 'Comment not found' }, { status: 404 })
      }
      website.versions = versions
    } else {
      return NextResponse.json(
        { message: 'Provide pathKey (preferred) or commentId' },
        { status: 400 },
      )
    }

    const saved = await payload.update({
      collection: 'Website',
      id: websiteId,
      data: website,
      depth: 1,
    })

    return NextResponse.json({ ok: true, website: saved }, { status: 200 })
  } catch (err: any) {
    console.error('[Update Task Status Error]', err)
    return NextResponse.json({ message: err.message || 'Failed to update task' }, { status: 500 })
  }
}
