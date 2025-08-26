import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const websiteId = searchParams.get('websiteId')
    const versionParam = searchParams.get('version')
    if (!websiteId) {
      return NextResponse.json({ message: 'websiteId is required' }, { status: 400 })
    }
    const payload = await getPayload({ config: configPromise })
    const website = await payload.findByID({
      collection: 'Website',
      id: websiteId,
      depth: 1,
    })
    if (!website) {
      return NextResponse.json({ message: 'Website not found' }, { status: 404 })
    }
    const extractedTasks: any[] = []
    website?.versions?.forEach((version: any) => {
      if (versionParam && version.id !== versionParam) return
      version['page-links']?.forEach((pl: any) => {
        pl.thread?.forEach((thread: any) => {
          thread.comments?.forEach((comment: any) => {
            if (comment.commentType === 'task') {
              const authorEmail =
                (comment.authorEmail && String(comment.authorEmail)) ||
                (comment.author && String(comment.author)) ||
                null

              extractedTasks.push({
                id: comment['comment-id'] || `${website.id}-${Date.now()}`,
                name: comment.message || 'Untitled Task',
                status: comment.edited ? 'Completed' : 'Active',
                authorEmail,
                author: comment.author || null,
                threadId: thread.id || null,
                pageLinkId: pl.id || null,
                websiteId: website.id || null,
                date: comment.date || null,
              })
            }
          })
        })
      })
    })

    return NextResponse.json({ tasks: extractedTasks }, { status: 200 })
  } catch (err: any) {
    console.error('[Fetch Tasks Error]', err)
    return NextResponse.json({ message: err.message || 'Failed to fetch tasks' }, { status: 500 })
  }
}
