import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
   try {
      const brands = await prisma.brand.findMany({ take: 8 })
      return NextResponse.json(brands)
   } catch (error) {
      return NextResponse.json([])
   }
}
