// app/(frontend)/[WebsiteProxy]/page.tsx
import configPromise from '@/payload.config'
import payload from 'payload'
import { notFound } from 'next/navigation'
import { Website } from '@/payload-types'
import { isLatestVersion } from '../helper/isLatestVersion'
import ClientWebsiteProxy from './ClientWebsiteProxy'

export const dynamic = 'force-dynamic'

type SearchParams = {
  id?: string | string[]
  version?: string | string[]
}

export default async function WebsiteProxy({
  params,
  searchParams,
}: {
  params: { WebsiteProxy: string }
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const { id: idParam, version: versionParam } = sp

  const websiteId = Array.isArray(idParam) ? idParam[0] : idParam
  const versionStr = Array.isArray(versionParam) ? versionParam[0] : versionParam
  const versionIdx = Math.max(0, (Number(versionStr) || 1) - 1)

  const config = await configPromise
  await payload.init({ config })

  let websiteData: Website | null = null
  if (websiteId) {
    try {
      websiteData = await payload.findByID({
        collection: 'Website',
        id: websiteId,
      })
    } catch (err) {
      console.error('Error fetching Website:', err)
    }
  }
  if (!websiteData) return notFound()

  const versionsArr = websiteData.versions ?? []
  if (!versionsArr[versionIdx]) {
    console.warn('Invalid version index, falling back to latest')
    if (versionsArr.length === 0) return notFound()
  }

  const safeVersionIdx = versionsArr[versionIdx] ? versionIdx : Math.max(0, versionsArr.length - 1)
  const activeVersion = versionsArr[safeVersionIdx]

  const threads =
    (activeVersion?.['page-links'] ?? []).flatMap((pl: any) => pl?.thread ?? []).filter(Boolean) ??
    []

  const firstPageLink =
    (activeVersion?.['page-links'] ?? []).find(
      (pl: any) => typeof pl?.['page-link'] === 'string',
    )?.['page-link'] ||
    websiteData.url ||
    ''

  const latest = await isLatestVersion(
    websiteId as string,
    ((safeVersionIdx + 1) as number).toString(),
  )

  // 👉 Send everything to the client component
  return (
    <ClientWebsiteProxy
      websiteData={websiteData}
      versionsArr={versionsArr}
      safeVersionIdx={safeVersionIdx}
      threads={threads}
      firstPageLink={firstPageLink}
      websiteId={websiteId as string}
      latest={latest}
    />
  )
}
