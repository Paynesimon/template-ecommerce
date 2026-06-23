import { buildAiTxt } from '../../../geo'
import { config } from '@/lib/config'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
   const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
   const body = buildAiTxt({ store: config.store, siteUrl })

   return new NextResponse(body, {
      headers: {
         'Content-Type': 'text/plain; charset=utf-8',
         'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
   })
}
