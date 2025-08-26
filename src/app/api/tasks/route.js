// app/tasks/route.js
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { NextResponse } from 'next/server'

export async function GET(req) {
  try {
    const payload = await getPayload({ config: configPromise })

    // Fetch all Website documents with depth = 3
    const websites = await payload.find({
      collection: 'Website',
      depth: 3,
      limit: 1000, // adjust if needed
    })

    const extractedTasks = []

    websites?.docs?.forEach((doc) => {
      doc.versions?.forEach((version) => {
        version['page-links']?.forEach((pl) => {
          pl.thread?.forEach((thread) => {
            thread.comments?.forEach((comment) => {
              if (comment.commentType === 'task') {
                // 🔑 Fallback: use author if authorEmail is missing (older records)
                const authorEmail =
                  (comment.authorEmail && String(comment.authorEmail)) ||
                  (comment.author && String(comment.author)) ||
                  null

                extractedTasks.push({
                  id: comment['comment-id'] || `${doc.id}-${Date.now()}`,
                  name: comment.message || 'Untitled Task',
                  status: comment.edited ? 'Completed' : 'Active',
                  authorEmail, // normalized above
                  author: comment.author || null, // keep original for safety/visibility
                  threadId: thread.id || null,
                  pageLinkId: pl.id || null,
                  websiteId: doc.id || null,
                  date: comment.date || null, // (optional, kept if you later want to sort by date)
                })
              }
            })
          })
        })
      })
    })

    return NextResponse.json({ tasks: extractedTasks }, { status: 200 })
  } catch (err) {
    console.error('[Fetch Tasks Error]', err)
    return NextResponse.json({ message: err.message || 'Failed to fetch tasks' }, { status: 500 })
  }
}
