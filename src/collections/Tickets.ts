/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CollectionConfig, Access } from 'payload'

const isAdmin: Access = ({ req: { user } }) => Boolean(user && (user as any).role === 'admin')
const isLoggedIn: Access = ({ req: { user } }) => Boolean(user)

const isReporterOrAssigneeOrAdmin: Access = ({ req }) => {
  const u: any = req.user
  if (!u) return false
  if (u.role === 'admin') return true
  return { or: [{ reporter: { equals: u.id } }, { assignee: { equals: u.id } }] } as any
}

export const Tickets: CollectionConfig = {
  slug: 'tickets',
  admin: { useAsTitle: 'title' },
  access: {
    read: isReporterOrAssigneeOrAdmin,
    create: isLoggedIn,
    update: isReporterOrAssigneeOrAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      ({ req, data, originalDoc, operation }) => {
        const u: any = req.user

        if (operation === 'create') {
          if (u?.id) data.reporter = u.id
          if (u?.role !== 'admin') data.status = 'open'
          if (!data.priority) data.priority = 'medium'
        }

        if (operation === 'update') {

          if (u?.role !== 'admin') {
            data.status = originalDoc?.status ?? 'open'
          }
        }

        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },

    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Closed', value: 'closed' },
      ],
    
    },

    {
      name: 'priority',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Urgent', value: 'urgent' },
      ],
    },

    {
      name: 'reporter',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hooks: {
        beforeChange: [({ req, value }) => (req.user ? (req.user as any).id : value)],
      },
    },

    { name: 'assignee', type: 'relationship', relationTo: 'users' },
    { name: 'attachments', type: 'relationship', relationTo: 'media', hasMany: true },
    { name: 'labels', type: 'array', fields: [{ name: 'value', type: 'text' }] },
    { name: 'url', type: 'text', admin: { description: 'Page URL where the issue occurred' } },
  ],
  timestamps: true,
}
