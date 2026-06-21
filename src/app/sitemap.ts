import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const URL = process.env.NEXT_PUBLIC_SITE_URL

export default async function sitemap() {
   const products = (await prisma.product.findMany()).map(
      ({ id, updatedAt }) => ({
         url: `${URL}/products/${id}`,
         lastModified: updatedAt,
      })
   )

   const blogs = (await prisma.blog.findMany()).map(({ slug, updatedAt }) => ({
      url: `${URL}/blog/${slug}`,
      lastModified: updatedAt,
   }))

   const routes = ['', '/products', '/blog'].map((route) => ({
      url: `${URL}${route}`,
      lastModified: new Date().toISOString(),
   }))

   return [...routes, ...products, ...blogs]
}
