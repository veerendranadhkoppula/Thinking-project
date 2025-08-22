import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'public/media',
  },
  access: { read: () => true },
  fields: [
    // ✅ not required so uploads from FormData without alt succeed
    { name: 'alt', type: 'text' },
  ],
}
