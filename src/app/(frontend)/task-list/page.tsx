'use client'

import React, { useState, useEffect, useMemo } from 'react'
import styles from './TaskList.module.css'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

type UiStatus = 'Active' | 'Completed'

interface Task {
  id: string | null
  name: string
  status: UiStatus
  authorEmail?: string | null
  author?: string | null
  threadId?: string | null
  pageLinkId?: string | null
  websiteId?: string | null
  date?: string | null
  rowKey: string          // unique per row (from API)
  pathKey: string         // absolute array path (from API)
  _rawIds?: {
    versionId?: string | null
    pageLinkId?: string | null
    threadId?: string | null
    commentArrayItemId?: string | null
  }
}

const STATUS_OPTIONS: UiStatus[] = ['Active', 'Completed']

export default function TaskListPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const websiteId = searchParams.get('id')

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | UiStatus>('All')
  const [sortOrder, setSortOrder] = useState<'Newest' | 'Oldest'>('Newest')
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  

  const toUiTask = (task: any): Task => {
    const id = task?.id ?? task?._rawIds?.commentArrayItemId ?? null
    if (!task?.rowKey || !task?.pathKey) {
      console.error('API must provide rowKey & pathKey. Got:', task)
      throw new Error('Missing rowKey/pathKey from API')
    }
    return {
      ...task,
      id,
      rowKey: String(task.rowKey),
      pathKey: String(task.pathKey),
      status: task.status === 'Completed' ? 'Completed' : 'Active',
    } as Task
  }

  const fetchTasks = async () => {
    if (!websiteId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/tasks?websiteId=${websiteId}`, { cache: 'no-store' })
      const data = await res.json()
      const list: Task[] = (data?.tasks || []).map(toUiTask)

      // Guard: log duplicates if any
      const seen = new Set<string>()
      for (const t of list) {
        if (seen.has(t.rowKey)) console.warn('Duplicate rowKey:', t.rowKey, t)
        seen.add(t.rowKey)
      }
      setTasks(list)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId])

  useEffect(() => {
    if (!websiteId) return
    const timer = setInterval(fetchTasks, 10000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId])

  // Show ALL tasks now
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const filteredTasks = useMemo(() => {
    const bySearch = tasks.filter((task) =>
      (task.name || '').toLowerCase().includes(search.toLowerCase()),
    )
    const byStatus =
      statusFilter === 'All' ? bySearch : bySearch.filter((t) => t.status === statusFilter)

    const bySort = [...byStatus].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0
      const db = b.date ? new Date(b.date).getTime() : 0
      if (da !== db) return sortOrder === 'Newest' ? db - da : da - db
      return sortOrder === 'Newest'
        ? b.rowKey.localeCompare(a.rowKey)
        : a.rowKey.localeCompare(b.rowKey)
    })
    return bySort
  }, [tasks, search, statusFilter, sortOrder])

  const openView = (task: Task) => { setSelectedTask(task); setIsViewOpen(true) }
  const closeView = () => { setSelectedTask(null); setIsViewOpen(false) }

  // Optimistic update strictly by rowKey (unique)
  const updateTaskStatus = async (task: Task, newStatus: UiStatus) => {
    const prev = tasks
    setTasks((curr) => curr.map((t) => (t.rowKey === task.rowKey ? { ...t, status: newStatus } : t)))

    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: task.websiteId,
          pathKey: task.pathKey,   // <<< absolute path guarantees single update
          status: newStatus,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      fetchTasks() // sync
    } catch (e) {
      console.error('Failed to update status:', e)
      setTasks(prev) // revert
      alert('Failed to update status. Please try again.')
    }
  }

  return (
    <div className={styles.pageWrapper}>
      <h1 className={styles.title}>TASK LIST</h1>
      <p className={styles.subtitle}>Task Name | Status</p>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Progress Tracker</h2>
        </div>

        <div className={styles.cardContent}>
          <div className={styles.progressWrapper}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
            </div>
            <p className={styles.progressText}>
              {completedTasks} of {totalTasks} tasks completed ({progressPercent}%)
            </p>
          </div>

          <div className={styles.filters}>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)}>
              <option value="Newest">Newest</option>
              <option value="Oldest">Oldest</option>
            </select>
          </div>

          <div className={styles.tableWrapper}>
            {loading ? (
              <p style={{ textAlign: 'center' }}>Loading tasks...</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                      <tr key={task.rowKey} className={styles.rowClickable}>
                        <td data-label="Task" onClick={() => openView(task)}>{task.name}</td>
                        <td data-label="Status">
                          <select
                            className={styles.statusDropdown}
                            value={task.status}
                            onChange={(e) => updateTaskStatus(task, e.target.value as UiStatus)}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', padding: '1rem' }}>
                        No tasks found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {isViewOpen && selectedTask && (
        <div className={styles.modalOverlay} onClick={closeView}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Task Details</h3>
            <div className={styles.viewGrid}>
              <div>
                <span className={styles.viewLabel}>Task</span>
                <p className={styles.viewValue}>{selectedTask.name}</p>
              </div>
              <div>
                <span className={styles.viewLabel}>Status</span>
                <p className={styles.viewValue}>{selectedTask.status}</p>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={closeView}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
