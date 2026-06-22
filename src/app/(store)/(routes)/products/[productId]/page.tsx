import Carousel from '@/components/native/Carousel'
import { JsonLd } from '@/components/native/JsonLd'
import prisma from '@/lib/prisma'
import { isVariableValid } from '@/lib/utils'
import { ChevronRightIcon } from 'lucide-react'
import type { Metadata, ResolvingMetadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DataSection } from './components/data'

type Props = {
   params: { productId: string }
   searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata(
   { params, searchParams }: Props,
   parent: ResolvingMetadata
): Promise<Metadata> {
   const product = await prisma.product.findUnique({
      where: {
         id: params.productId,
      },
   })

   if (!product) {
      return { title: 'Product Not Found' }
   }

   return {
      title: product.title,
      description: product.description,
      keywords: product.keywords,
      openGraph: {
         images: product.images,
      },
   }
}

export default async function Product({
   params,
}: {
   params: { productId: string }
}) {
   const product = await prisma.product.findUnique({
      where: {
         id: params.productId,
      },
      include: {
         brand: true,
         categories: true,
      },
   })

   if (!isVariableValid(product)) {
      notFound()
   }

   const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
   const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description || undefined,
      image: product.images?.length ? product.images : undefined,
      sku: product.id,
      brand: product.brand?.title
         ? { '@type': 'Brand', name: product.brand.title }
         : undefined,
      offers: {
         '@type': 'Offer',
         url: `${siteUrl}/products/${product.id}`,
         priceCurrency: 'USD',
         price: product.price,
         availability: product.isAvailable
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
      },
   }

   return (
      <>
         <JsonLd data={jsonLd} />
         <Breadcrumbs product={product} />
         <div className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-3">
            <ImageColumn product={product} />
            <DataSection product={product} />
         </div>
      </>
   )
}

const ImageColumn = ({ product }) => {
   return (
      <div className="relative min-h-[50vh] w-full col-span-1">
         <Carousel images={product?.images} />
      </div>
   )
}

const Breadcrumbs = ({ product }) => {
   return (
      <nav className="flex text-muted-foreground" aria-label="Breadcrumb">
         <ol className="inline-flex items-center gap-2">
            <li className="inline-flex items-center">
               <Link
                  href="/"
                  className="inline-flex items-center text-sm font-medium"
               >
                  Home
               </Link>
            </li>
            <li>
               <div className="flex items-center gap-2">
                  <ChevronRightIcon className="h-4" />
                  <Link className="text-sm font-medium" href="/products">
                     Products
                  </Link>
               </div>
            </li>
            <li aria-current="page">
               <div className="flex items-center gap-2">
                  <ChevronRightIcon className="h-4" />
                  <span className="text-sm font-medium">{product?.title}</span>
               </div>
            </li>
         </ol>
      </nav>
   )
}
