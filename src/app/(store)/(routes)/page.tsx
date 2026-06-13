import {
   BlogPostGrid,
   BlogPostSkeletonGrid,
} from '@/components/native/BlogCard'
import Carousel from '@/components/native/Carousel'
import { ProductGrid, ProductSkeletonGrid } from '@/components/native/Product'
import { Heading } from '@/components/native/heading'
import { Separator } from '@/components/native/separator'
import prisma from '@/lib/prisma'
import { config } from '@/lib/config'
import { isVariableValid } from '@/lib/utils'

export default async function Index() {
   const products = await prisma.product.findMany({
      include: {
         brand: true,
         categories: true,
      },
   })

   const blogs = await prisma.blog.findMany({
      include: { author: true },
      take: 3,
   })

   const dbBanners = await prisma.banner.findMany()
   const bannerImages = isVariableValid(dbBanners)
      ? dbBanners.map((obj) => obj.image)
      : config.banners.map((b: any) => b.image)

   return (
      <div className="flex flex-col border-neutral-200 dark:border-neutral-700">
         <Carousel images={bannerImages} />
         <Separator className="my-8" />
         <Heading
            title={config.store.name}
            description={config.store.tagline}
         />
         {isVariableValid(products) ? (
            <ProductGrid products={products} />
         ) : (
            <ProductSkeletonGrid />
         )}
         <Separator className="my-8" />
         {isVariableValid(blogs) ? (
            <BlogPostGrid blogs={blogs} />
         ) : (
            <BlogPostSkeletonGrid />
         )}
      </div>
   )
}
