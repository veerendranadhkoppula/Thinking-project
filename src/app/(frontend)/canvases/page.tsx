
import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { verifyViewerToken } from '@/lib/teamTokens'

export const dynamic = 'force-dynamic'

export default async function CanvasesPage() {
  const cookieStore = await cookies();
  const viewerToken = cookieStore.get('team-viewer')?.value;
  let teamId: string | null = null;
  if (viewerToken) {
    try {
      const pl = await verifyViewerToken(viewerToken);
      teamId = pl.sub as string;
    } catch { /* ignore invalid */ }
  }

  const rawHeaders = await headers();
  const hdrsObj: Record<string, string> = {};
  rawHeaders.forEach((value, key) => {
    hdrsObj[key] = value;
  });
  const hdrs = new Headers(hdrsObj);
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: hdrs })

  if (!teamId && !user) {
    return <p>Access denied</p>
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Team Canvases</h1>
      <p>Welcome, viewer or owner.</p>
    </div>
  )
}
