'use client'

import React, { useState, useEffect } from 'react'
import styles from './TaskList.module.css'
import { v4 as uuidv4 } from 'uuid'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

interface Task {
  id: string
  name: string
  status: 'Active' | 'Completed'
  authorEmail?: string | null
  author?: string | null
  threadId?: string | null
  pageLinkId?: string | null
  websiteId?: string | null
  date?: string | null
  uniqueId: string
}

export default function TaskListPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const websiteId = searchParams.get('id') // e.g., ?id=2
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Completed'>('All')
  const [sortOrder, setSortOrder] = useState<'Newest' | 'Oldest'>('Newest')

  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Fetch tasks for a specific website ID
  useEffect(() => {
    if (!session?.user?.email || !websiteId) return

    const fetchTasks = async () => {
      try {
        const res = await fetch(`/api/tasks?websiteId=${websiteId}`)
        const data = await res.json()

        const allTasks: Task[] = (data?.tasks || []).map((task: any) => ({
          ...task,
          uniqueId: `${task.id}-${uuidv4()}`, // ensure unique key
        }))

        setTasks(allTasks)
      } catch (error) {
        console.error('Error fetching tasks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [session, websiteId])

  const userEmail = session?.user?.email?.trim().toLowerCase() || ''

  const myTasks = tasks.filter((task) => {
    const taskAuthor = (task.authorEmail || task.author || '').toString().trim().toLowerCase()
    return taskAuthor === userEmail
  })

  const totalTasks = myTasks.length
  const completedTasks = myTasks.filter((t) => t.status === 'Completed').length
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const filteredTasks = myTasks
    .filter((task) => task.name.toLowerCase().includes(search.toLowerCase()))
    .filter((task) => (statusFilter === 'All' ? true : task.status === statusFilter))
    .sort((a, b) =>
      sortOrder === 'Newest'
        ? b.uniqueId.localeCompare(a.uniqueId)
        : a.uniqueId.localeCompare(b.uniqueId),
    )

  const openView = (task: Task) => {
    setSelectedTask(task)
    setIsViewOpen(true)
  }

  const closeView = () => {
    setSelectedTask(null)
    setIsViewOpen(false)
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
          {/* Progress Bar */}
          <div className={styles.progressWrapper}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progressPercent}%` }}></div>
            </div>
            <p className={styles.progressText}>
              {completedTasks} of {totalTasks} tasks completed ({progressPercent}%)
            </p>
          </div>

          {/* Filters */}
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

          {/* Task Table */}
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
                      <tr
                        key={task.uniqueId}
                        className={styles.rowClickable}
                        onClick={() => openView(task)}
                      >
                        <td data-label="Task">{task.name}</td>
                        <td data-label="Status">
                          <span
                            className={`${styles.statusBadge} ${
                              task.status === 'Active' ? styles.active : styles.completed
                            }`}
                          >
                            {task.status}
                          </span>
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

      {/* Task View Modal */}
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
              <button type="button" className={styles.cancelBtn} onClick={closeView}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
