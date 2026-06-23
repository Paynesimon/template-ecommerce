import { buildLlmsTxt } from '../../../geo'
import { config } from '@/lib/config'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
   const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

   const products = await prisma.product.findMany({
      where: { isAvailable: true },
      select: { id: true, title: true, description: true },
      orderBy: { createdAt: 'desc' },
      take: 25,
   })

   const body = buildLlmsTxt({
      store: config.store,
      products,
      siteUrl,
   })

   return new NextResponse(body, {
      headers: {
         'Content-Type': 'text/plain; charset=utf-8',
         'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
   })
}
