import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'username' },
  auth: true, 
  access: {
    read: ({ req }) => !!req.user, 
  },
  fields: [
    { name: 'username', type: 'text', required: true, unique: true },
    {
      name: 'role',
      type: 'select',
      options: ['user', 'admin', 'guest'],
      defaultValue: 'user',
      required: true,
    },
  ],
}
