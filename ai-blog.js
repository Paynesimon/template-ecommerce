// ai-blog.js
// 功能：用 AI 自动生成 SEO 博客文章，写入数据库
// 运行方法：node ai-blog.js 客户ID 数据库连接字符串
// 例如：node ai-blog.js client001 "postgresql://..."

const ARK_API_KEY = process.env.ARK_API_KEY || 'YOUR_ARK_API_KEY'
const ARK_MODEL = 'ep-20260520160054-cvn7v'
const ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

function log(emoji, msg) { console.log(`${emoji}  ${msg}`) }

// ===== AI 调用 =====
async function askAI(prompt) {
   const res = await fetch(ARK_API_URL, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${ARK_API_KEY}`,
      },
      body: JSON.stringify({
         model: ARK_MODEL,
         messages: [{ role: 'user', content: prompt }],
      }),
   })
   const data = await res.json()
   return data.choices?.[0]?.message?.content || ''
}

// ===== 生成 slug =====
function generateSlug(title) {
   return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      + '-' + Date.now()
}

// ===== 生成博客文章 =====
async function generateBlogPost(storeName, products, existingSlugs) {
   const productList = products.map(p => p.title).join(', ')
   const randomProduct = products[Math.floor(Math.random() * products.length)]

   log('🤖', `生成博客文章，主题：${randomProduct?.title || storeName}...`)

   // 生成文章标题和内容
   const response = await askAI(`
You are an expert SEO content writer for e-commerce websites.

Store: ${storeName}
Products: ${productList}
Focus product: ${randomProduct?.title || productList}

Write a complete SEO blog post with the following structure. Return as JSON:
{
  "title": "compelling SEO title (50-60 chars)",
  "description": "meta description (150-160 chars)",
  "categories": ["category1", "category2"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "imagePrompt": "description for a product/lifestyle image",
  "content": "full blog post content in markdown format (600-800 words)"
}

Requirements:
- Title should include the main keyword naturally
- Content should be informative, engaging, and SEO-optimized
- Include H2 subheadings in the content
- Content should naturally mention the products
- Write in English
- Return ONLY valid JSON, no extra text
`)

   // 解析 JSON
   let blogData
   try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      blogData = JSON.parse(cleaned)
   } catch (e) {
      log('⚠️', 'AI 返回格式异常，使用默认模版')
      blogData = {
         title: `Top Products at ${storeName} - Your Complete Guide`,
         description: `Discover the best products at ${storeName}. Shop our curated collection of ${productList}.`,
         categories: ['shopping', 'products'],
         keywords: [storeName, ...products.slice(0, 3).map(p => p.title)],
         content: `# Top Products at ${storeName}\n\nDiscover our amazing collection including ${productList}.\n\n## Why Choose Us\n\nWe offer the best quality products at competitive prices.\n\n## Our Products\n\n${products.map(p => `### ${p.title}\n\n${p.description || 'A great product for your needs.'}`).join('\n\n')}`,
      }
   }

   // 生成唯一 slug
   let slug = generateSlug(blogData.title)
   let attempts = 0
   while (existingSlugs.has(slug) && attempts < 5) {
      slug = generateSlug(blogData.title)
      attempts++
   }

   // 使用 Unsplash 的占位图
   const imageUrl = `https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop`

   return {
      slug,
      title: blogData.title,
      description: blogData.description,
      image: imageUrl,
      content: blogData.content,
      categories: blogData.categories || ['shopping'],
      keywords: blogData.keywords || [storeName],
   }
}

// ===== 主函数 =====
async function main() {
   const clientId = process.argv[2]
   const connectionString = process.argv[3]

   if (!clientId || !connectionString) {
      console.error('❌ 用法：node ai-blog.js 客户ID "数据库连接字符串"')
      process.exit(1)
   }

   console.log(`\n${'='.repeat(50)}`)
   console.log(`📝 为客户 [${clientId}] 生成 SEO 博客文章`)
   console.log(`${'='.repeat(50)}\n`)

   process.env.DATABASE_URL = connectionString
   const { PrismaClient } = require('@prisma/client')
   const prisma = new PrismaClient()

   try {
      // 读取现有文章避免重复
      const existingBlogs = await prisma.blog.findMany({ select: { slug: true } })
      const existingSlugs = new Set(existingBlogs.map(b => b.slug))
      log('📊', `现有文章数：${existingBlogs.length}`)

      // 读取商品数据
      const products = await prisma.product.findMany({
         include: { brand: true },
         take: 10,
      })

      if (!products.length) {
         log('⚠️', '没有商品数据，无法生成博客')
         return
      }

      // 确保 Author 存在
      const authorEmail = `blog@${clientId}.store`
      const author = await prisma.author.upsert({
         where: { email: authorEmail },
         update: {},
         create: {
            email: authorEmail,
            name: `${clientId} Blog`,
         },
      })

      // 生成博客文章
      const storeName = clientId
      const blogPost = await generateBlogPost(storeName, products, existingSlugs)

      // 写入数据库
      await prisma.blog.create({
         data: {
            slug: blogPost.slug,
            title: blogPost.title,
            description: blogPost.description,
            image: blogPost.image,
            content: blogPost.content,
            categories: blogPost.categories,
            keywords: blogPost.keywords,
            author: { connect: { id: author.id } },
         },
      })

      log('✅', `博客文章已生成：${blogPost.title}`)
      log('🔗', `文章地址：/blog/${blogPost.slug}`)

      console.log(`\n${'='.repeat(50)}`)
      console.log(`🎉 博客文章生成完成！`)
      console.log(`📊 现在共有 ${existingBlogs.length + 1} 篇文章`)
      console.log(`${'='.repeat(50)}\n`)

   } finally {
      await prisma.$disconnect()
   }
}

main().catch(console.error)
