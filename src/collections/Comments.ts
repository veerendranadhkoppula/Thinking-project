/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CollectionConfig, Access } from 'payload'

const isAdmin: Access = ({ req: { user } }) => Boolean(user && (user as any).role === 'admin')
const isLoggedIn: Access = ({ req: { user } }) => Boolean(user)

export const Comments: CollectionConfig = {
  slug: 'comments',
  access: {
    create: isLoggedIn,
    read: ({ req }) => Boolean(req.user),
    update: ({ req, data }) => {
      const u: any = req.user
      if (!u) return false
      return u.role === 'admin' || (data && data.author === u.id)
    },
    delete: isAdmin,
  },
  fields: [
    { name: 'ticket', type: 'relationship', relationTo: 'tickets', required: true }, // single id
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hooks: {
        beforeChange: [({ req, value }) => (req.user ? (req.user as any).id : value)],
      },
    },
   { name: 'body', type: 'textarea', required: true },
    { name: 'attachments', type: 'relationship', relationTo: 'media', hasMany: true },
  ],
  timestamps: true,
}
