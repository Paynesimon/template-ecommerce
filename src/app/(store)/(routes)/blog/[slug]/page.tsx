import { JsonLd } from '@/components/native/JsonLd'
import MDXComponents from '@/components/native/mdx/MDXComponents'
import { Separator } from '@/components/native/separator'
import prisma from '@/lib/prisma'
import { format } from 'date-fns'
import { MDXRemote } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Props = {
   params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
   const blog = await prisma.blog.findUnique({
      where: { slug: params.slug },
      include: { author: true },
   })

   if (!blog) {
      return { title: 'Blog Post Not Found' }
   }

   const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

   return {
      title: blog.title,
      description: blog.description,
      keywords: blog.keywords,
      openGraph: {
         title: blog.title,
         description: blog.description,
         type: 'article',
         images: blog.image ? [blog.image] : [],
         url: `${siteUrl}/blog/${blog.slug}`,
      },
   }
}

export default async function Blog({ params }: Props) {
   const blog = await prisma.blog.findUnique({
      where: { slug: params.slug },
      include: { author: true },
   })

   if (!blog) notFound()

   const recommendations = await prisma.blog.findMany({
      where: { slug: { not: params.slug } },
      include: { author: true },
      take: 3,
   })

   const mdx = await serialize(blog.content || '')
   const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

   const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: blog.title,
      description: blog.description,
      image: blog.image ? [blog.image] : undefined,
      datePublished: blog.createdAt.toISOString(),
      dateModified: blog.updatedAt.toISOString(),
      author: {
         '@type': 'Person',
         name: blog.author?.name || 'Editor',
      },
      publisher: {
         '@type': 'Organization',
         name: siteUrl ? new URL(siteUrl).hostname : 'Store',
      },
      mainEntityOfPage: {
         '@type': 'WebPage',
         '@id': `${siteUrl}/blog/${blog.slug}`,
      },
      keywords: blog.keywords?.join(', '),
   }

   return (
      <>
         <JsonLd data={jsonLd} />
         <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Content blog={blog} mdx={mdx} />
            <Recomendations recommendations={recommendations} />
         </div>
      </>
   )
}

function Content({ blog, mdx }) {
   const { title, updatedAt } = blog

   return (
      <div className="rounded-lg bg-white p-6 text-justify text-neutral-900 dark:bg-neutral-800 dark:text-neutral-200 md:col-span-3">
         <h1 className="mb-1 text-3xl font-medium">{title}</h1>
         <p className="mt-2 text-sm font-medium text-neutral-400">
            Last Updated {format(updatedAt, 'PPP')}
         </p>
         <Separator />
         <MDXRemote lazy {...mdx} components={MDXComponents} />
      </div>
   )
}

function Recomendations({ recommendations }) {
   return (
      <div className="col-span-1">
         {recommendations.map((rec) => {
            const { slug, author, title, image } = rec

            return (
               <div key={slug} className="mb-4 w-full">
                  <Link href={`/blog/${slug}`}>
                     <div className="w-full rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
                        <div className="relative h-40 w-full">
                           <Image
                              className="rounded-t-lg"
                              src={image}
                              alt={title}
                              fill
                              sizes="(min-width: 1000px) 30vw, 50vw"
                              style={{ objectFit: 'cover' }}
                           />
                        </div>
                        <div className="p-5">
                           <div className="w-full">
                              <h5 className="mb-3 text-justify font-medium tracking-tight text-neutral-900 dark:text-white">
                                 {title}
                              </h5>
                              <p className="block text-sm text-neutral-700 dark:text-neutral-400">
                                 <span>{author?.name}</span>
                              </p>
                           </div>
                        </div>
                     </div>
                  </Link>
               </div>
            )
         })}
      </div>
   )
}
