// app/[id]/page.tsx
import { notFound } from 'next/navigation'
import WebsiteMain from './components/website-canvas/website-main'

async function getCanvas(id: string) {
  const baseUrl = process.env.BACKEND_URL || 'localhost:3000'
  const url = `${baseUrl}/api/canvas-website/${id}?depth=2`
  console.log('URL : ', url)
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${process.env.PAYLOAD_API_KEY!}`,
    },
  })
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[getCanvas] Error:', errorText)
    throw new Error('Failed to fetch canvas')
  }
  return res.json()
}

export default async function CanvasDecider(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const data = await getCanvas(id)

  switch (data.type.mediaType) {
    case 'Website':
      return <WebsiteMain props={data} />
    default:
      notFound()
  }
}
