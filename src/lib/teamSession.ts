import { cookies } from 'next/headers'
import { verifyViewerToken } from './teamTokens'

export async function getTeamViewer() {
  const cookieStore = await cookies();
  const token = cookieStore.get('team-viewer')?.value;
  if (!token) return null;
  try {
    const claims = await verifyViewerToken(token);
    return { teamId: claims.sub as string, email: claims.email };
  } catch {
    return null;
  }
}
