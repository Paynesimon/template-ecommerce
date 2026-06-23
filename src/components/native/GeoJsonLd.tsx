import { buildOrganizationGraph } from '../../../geo'
import { config } from '@/lib/config'
import { JsonLd } from './JsonLd'

export function GeoJsonLd() {
   const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
   if (!siteUrl) return null

   const data = buildOrganizationGraph(config.store, siteUrl)
   return <JsonLd data={data} />
}
