import type { CollectionConfig } from 'payload'

export const Teams: CollectionConfig = {
  slug: 'teams',
  admin: { useAsTitle: 'name' },
  access: {
    read: ({ req }) => !!req.user,
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'members',
      type: 'array',
      labels: { singular: 'Member', plural: 'Members' },
      fields: [
        { name: 'email', type: 'text', required: true },
        { name: 'invitedAt', type: 'date' },
        { name: 'invitedBy', type: 'relationship', relationTo: 'users' },
      ],
    },
  ],
}
