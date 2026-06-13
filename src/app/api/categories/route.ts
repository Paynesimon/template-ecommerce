import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
   try {
      const categories = await prisma.category.findMany({ take: 8 })
      return NextResponse.json(categories)
   } catch (error) {
      return NextResponse.json([])
   }
}
