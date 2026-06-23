// sync.js
// 功能：从飞书抓取数据，同步写入 Neon 数据库
// 运行方法：node sync.js

const { PrismaClient } = require('@prisma/client')

// ===== 飞书配置 =====
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || 'YOUR_FEISHU_APP_ID'
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || 'YOUR_FEISHU_APP_SECRET'
const FEISHU_APP_TOKEN = process.env.FEISHU_APP_TOKEN || 'YOUR_FEISHU_APP_TOKEN'

const TABLES = {
   store: 'tblAn8PI1eoduVkn',
   products: 'tbldKPEdxtADz4v9',
   banners: 'tblBXnPE0tUz4xut',
}

// ===== 飞书 API =====
async function getAccessToken() {
   const res = await fetch(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            app_id: FEISHU_APP_ID,
            app_secret: FEISHU_APP_SECRET,
         }),
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
   return (data.data?.items || []).map((r) => r.fields)
}

// ===== 同步函数 =====
async function syncBanners(prisma, records) {
   if (!records.length) {
      console.log('⚠️  飞书 Banner 表为空，跳过')
      return
   }
   // 清空旧数据，写入新数据
   await prisma.banner.deleteMany()
   for (const f of records) {
      if (!f['图片URL']) continue
      await prisma.banner.create({
         data: {
            image: f['图片URL'],
            label: f['标签名'] || '',
         },
      })
   }
   console.log(`✅ Banner 同步完成，共 ${records.length} 条`)
}

async function syncProducts(prisma, records) {
   if (!records.length) {
      console.log('⚠️  飞书商品表为空，跳过')
      return
   }

   for (const f of records) {
      if (!f['商品名称']) continue

      const brandTitle = f['品牌'] || '未知品牌'
      const categoryTitle = f['分类'] || '其他'
      const price = parseFloat(f['价格']) || 0

      // 确保 Brand 存在
      const brand = await prisma.brand.upsert({
         where: { title: brandTitle },
         update: {},
         create: {
            title: brandTitle,
            description: `${brandTitle} 品牌`,
            logo: '',
         },
      })

      // 确保 Category 存在
      const category = await prisma.category.upsert({
         where: { title: categoryTitle },
         update: {},
         create: { title: categoryTitle },
      })

      // 更新或创建商品（根据标题匹配）
      const existing = await prisma.product.findFirst({
         where: { title: f['商品名称'] },
      })

      if (existing) {
         // 已存在 → 只更新价格、描述、图片等
         await prisma.product.update({
            where: { id: existing.id },
            data: {
               price,
               description: f['商品描述'] || '',
               images: f['图片URL'] ? [f['图片URL']] : [],
               keywords: f['关键词']
                  ? f['关键词'].split(',').map((k) => k.trim())
                  : [],
               isAvailable: f['是否上架'] ?? true,
               brandId: brand.id,
               categories: { set: [{ title: categoryTitle }] },
            },
         })
         console.log(`🔄 更新商品：${f['商品名称']}，价格：${price}`)
      } else {
         // 不存在 → 创建新商品
         await prisma.product.create({
            data: {
               title: f['商品名称'],
               price,
               description: f['商品描述'] || '',
               images: f['图片URL'] ? [f['图片URL']] : [],
               keywords: f['关键词']
                  ? f['关键词'].split(',').map((k) => k.trim())
                  : [],
               isAvailable: f['是否上架'] ?? true,
               stock: 10,
               discount: 0,
               brand: { connect: { id: brand.id } },
               categories: { connect: [{ title: categoryTitle }] },
            },
         })
         console.log(`➕ 新增商品：${f['商品名称']}，价格：${price}`)
      }
   }
   console.log(`✅ 商品同步完成，共 ${records.length} 条`)
}

// ===== 主函数 =====
async function main() {
   console.log('\n🚀 开始同步飞书数据到数据库...\n')

   const prisma = new PrismaClient()

   try {
      const token = await getAccessToken()
      console.log('✅ 飞书 Token 获取成功\n')

      const [storeRecords, productRecords, bannerRecords] = await Promise.all([
         getRecords(token, TABLES.store),
         getRecords(token, TABLES.products),
         getRecords(token, TABLES.banners),
      ])

      console.log(`📋 店铺信息：${storeRecords.length} 条`)
      console.log(`🛍️  商品列表：${productRecords.length} 条`)
      console.log(`🖼️  Banner：${bannerRecords.length} 条\n`)

      await syncBanners(prisma, bannerRecords)
      await syncProducts(prisma, productRecords)

      console.log('\n🎉 全部同步完成！刷新网页查看最新数据。')
   } catch (error) {
      console.error('❌ 同步失败：', error)
   } finally {
      await prisma.$disconnect()
   }
}

main()
