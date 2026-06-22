// sync-client.js
// 功能：仅同步飞书商品/Banner 到客户数据库，不重新部署
// 运行方法：node sync-client.js client001

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || 'YOUR_FEISHU_APP_ID'
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || 'YOUR_FEISHU_APP_SECRET'
const FEISHU_APP_TOKEN = process.env.FEISHU_APP_TOKEN || 'YOUR_FEISHU_APP_TOKEN'
const FEISHU_TABLES = {
   store: 'tblAn8PI1eoduVkn',
   products: 'tbldKPEdxtADz4v9',
   banners: 'tblBXnPE0tUz4xut',
}
const NEON_API_KEY = process.env.NEON_API_KEY || 'YOUR_NEON_API_KEY'
const NEON_ORG_ID = process.env.NEON_ORG_ID || 'YOUR_NEON_ORG_ID'

function log(emoji, msg) { console.log(`${emoji}  ${msg}`) }

async function getFeishuToken() {
   const res = await fetch(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
      }
   )
   const data = await res.json()
   return data.tenant_access_token
}

async function getRecords(token, tableId) {
   const res = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${tableId}/records`,
      { headers: { Authorization: `Bearer ${token}` } }
   )
   const data = await res.json()
   return data.data?.items || []
}

async function getConnectionString(clientId) {
   const projectName = `shop-${clientId}`
   const listRes = await fetch(
      `https://console.neon.tech/api/v2/projects?org_id=${NEON_ORG_ID}`,
      { headers: { Authorization: `Bearer ${NEON_API_KEY}` } }
   )
   const listData = await listRes.json()
   const project = listData.projects?.find((p) => p.name === projectName)
   if (!project) throw new Error(`找不到客户数据库：${projectName}，请先运行一键建站`)

   const connRes = await fetch(
      `https://console.neon.tech/api/v2/projects/${project.id}/connection_uri?role_name=neondb_owner&database_name=neondb`,
      { headers: { Authorization: `Bearer ${NEON_API_KEY}` } }
   )
   const connData = await connRes.json()
   if (!connData.uri) throw new Error('无法获取数据库连接字符串')
   return connData.uri
}

function recordsForClient(items, clientId) {
   return items.filter((r) => String(r.fields['客户ID'] || '').trim() === clientId)
}

function mapProductRecord(r) {
   const f = r.fields
   return {
      title: f['商品名称'] || '',
      brand: f['品牌'] || '',
      price: parseFloat(f['价格']) || 0,
      description: f['商品描述'] || '',
      images: [f['图片URL'] || ''],
      categories: f['分类'] ? f['分类'].split(',').map((c) => c.trim()) : [],
      keywords: f['关键词'] ? f['关键词'].split(',').map((k) => k.trim()) : [],
      isAvailable: f['是否上架'] ?? true,
   }
}

function mapBannerRecord(r) {
   return {
      image: r.fields['图片URL'] || '',
      label: r.fields['标签名'] || '',
      order: r.fields['排序'] || 0,
   }
}

async function syncDatabase(products, banners, connectionString) {
   process.env.DATABASE_URL = connectionString
   const { PrismaClient } = require('@prisma/client')
   const prisma = new PrismaClient()
   try {
      if (banners.length) {
         await prisma.banner.deleteMany()
         for (const b of banners) {
            if (!b.image) continue
            await prisma.banner.create({ data: { image: b.image, label: b.label } })
         }
         log('✅', `Banner 同步完成：${banners.length} 条`)
      }

      const productTitles = products.map((p) => p.title).filter(Boolean)
      if (productTitles.length) {
         const removed = await prisma.product.deleteMany({
            where: { title: { notIn: productTitles } },
         })
         if (removed.count) log('🗑️', `移除 ${removed.count} 个不属于本客户的商品`)
      }

      for (const p of products) {
         if (!p.title) continue
         const brandTitle = p.brand || '未知品牌'
         const categoryTitle = p.categories[0] || '其他'
         const brand = await prisma.brand.upsert({
            where: { title: brandTitle },
            update: {},
            create: { title: brandTitle, description: '', logo: '' },
         })
         await prisma.category.upsert({
            where: { title: categoryTitle },
            update: {},
            create: { title: categoryTitle },
         })
         const existing = await prisma.product.findFirst({ where: { title: p.title } })
         if (existing) {
            await prisma.product.update({
               where: { id: existing.id },
               data: {
                  price: p.price,
                  description: p.description,
                  images: p.images,
                  keywords: p.keywords,
                  isAvailable: p.isAvailable,
                  brandId: brand.id,
                  categories: { set: [{ title: categoryTitle }] },
               },
            })
            log('🔄', `更新商品：${p.title}`)
         } else {
            await prisma.product.create({
               data: {
                  title: p.title,
                  price: p.price,
                  description: p.description,
                  images: p.images,
                  keywords: p.keywords,
                  isAvailable: p.isAvailable,
                  stock: 10,
                  discount: 0,
                  brand: { connect: { id: brand.id } },
                  categories: { connect: [{ title: categoryTitle }] },
               },
            })
            log('➕', `新增商品：${p.title}`)
         }
      }
      log('✅', '商品同步完成')
   } finally {
      await prisma.$disconnect()
   }
}

async function syncClient(clientId) {
   console.log(`\n${'='.repeat(50)}`)
   console.log(`🔄 开始同步客户 [${clientId}] 商品数据（不部署）`)
   console.log(`${'='.repeat(50)}\n`)

   const token = await getFeishuToken()
   const [storeItems, productItems, bannerItems] = await Promise.all([
      getRecords(token, FEISHU_TABLES.store),
      getRecords(token, FEISHU_TABLES.products),
      getRecords(token, FEISHU_TABLES.banners),
   ])

   const storeItem = storeItems.find((r) => r.fields['客户ID'] === clientId)
   if (!storeItem) throw new Error(`飞书里找不到客户ID为 "${clientId}" 的店铺`)

   const products = recordsForClient(productItems, clientId).map(mapProductRecord)
   const banners = recordsForClient(bannerItems, clientId).map(mapBannerRecord)

   log('✅', `飞书数据：${products.length} 个商品，${banners.length} 个 Banner`)

   const connectionString = await getConnectionString(clientId)
   await syncDatabase(products, banners, connectionString)

   console.log(`\n${'='.repeat(50)}`)
   console.log(`🎉 同步完成！网站刷新即可看到最新商品（无需重新部署）`)
   console.log(`${'='.repeat(50)}\n`)

   return { productCount: products.length, bannerCount: banners.length }
}

async function main() {
   const clientId = process.argv[2]
   if (!clientId) {
      console.error('❌ 用法：node sync-client.js client001')
      process.exit(1)
   }

   try {
      await syncClient(clientId)
   } catch (error) {
      console.error('\n❌ 出错了：', error.message)
      process.exit(1)
   }
}

if (require.main === module) {
   main()
}

module.exports = { syncClient }
