// sync-v2.js
// 功能：从飞书抓取数据，同时：
//   1. 写入 Neon 数据库
//   2. 自动更新 config.json
// 运行方法：node sync-v2.js

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

// ===== 配置 =====
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || 'YOUR_FEISHU_APP_ID'
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || 'YOUR_FEISHU_APP_SECRET'
const FEISHU_APP_TOKEN = process.env.FEISHU_APP_TOKEN || 'YOUR_FEISHU_APP_TOKEN'

const TABLES = {
   store: 'tblAn8PI1eoduVkn',
   products: 'tbldKPEdxtADz4v9',
   banners: 'tblBXnPE0tUz4xut',
}

// config.json 的路径（相对于本文件位置）
const CONFIG_PATH = path.join(__dirname, 'config.json')

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

// ===== 格式化数据 =====
function formatStore(records) {
   if (!records.length) return {}
   const f = records[0]
   return {
      name: f['店铺名称'] || 'My Shop',
      description: f['店铺简介'] || 'E-Commerce Store',
      tagline: f['产品栏标语'] || 'Our Products',
      brandStory: f['品牌故事'] || '',
      creator: f['创建者'] || 'My Shop',
      keywords: f['关键词'] ? f['关键词'].split(',').map((k) => k.trim()) : [],
   }
}

function formatProducts(records) {
   return records.map((f) => ({
      title: f['商品名称'] || '',
      brand: f['品牌'] || '',
      price: parseFloat(f['价格']) || 0,
      description: f['商品描述'] || '',
      images: [f['图片URL'] || ''],
      categories: f['分类'] ? f['分类'].split(',').map((c) => c.trim()) : [],
      keywords: f['关键词'] ? f['关键词'].split(',').map((k) => k.trim()) : [],
      isAvailable: f['是否上架'] ?? true,
   }))
}

function formatBanners(records) {
   return records.map((f) => ({
      image: f['图片URL'] || '',
      label: f['标签名'] || '',
      order: f['排序'] || 0,
   }))
}

// ===== 写入 config.json =====
function writeConfig(store, products, banners) {
   const config = { store, products, banners }
   fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
   console.log(`✅ config.json 已更新：${CONFIG_PATH}`)
}

// ===== 同步数据库 =====
async function syncBanners(prisma, records) {
   if (!records.length) {
      console.log('⚠️  飞书 Banner 表为空，跳过数据库同步')
      return
   }
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
   console.log(`✅ 数据库 Banner 同步完成，共 ${records.length} 条`)
}

async function syncProducts(prisma, records) {
   if (!records.length) {
      console.log('⚠️  飞书商品表为空，跳过数据库同步')
      return
   }

   for (const f of records) {
      if (!f['商品名称']) continue

      const brandTitle = f['品牌'] || '未知品牌'
      const categoryTitle = f['分类'] || '其他'
      const price = parseFloat(f['价格']) || 0

      const brand = await prisma.brand.upsert({
         where: { title: brandTitle },
         update: {},
         create: {
            title: brandTitle,
            description: `${brandTitle} 品牌`,
            logo: '',
         },
      })

      await prisma.category.upsert({
         where: { title: categoryTitle },
         update: {},
         create: { title: categoryTitle },
      })

      const existing = await prisma.product.findFirst({
         where: { title: f['商品名称'] },
      })

      if (existing) {
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
   console.log(`✅ 数据库商品同步完成，共 ${records.length} 条`)
}

// ===== 主函数 =====
async function main() {
   console.log('\n🚀 开始同步飞书数据...\n')

   const prisma = new PrismaClient()

   try {
      // 第一步：抓取飞书数据
      const token = await getAccessToken()
      console.log('✅ 飞书 Token 获取成功')

      const [storeRecords, productRecords, bannerRecords] = await Promise.all([
         getRecords(token, TABLES.store),
         getRecords(token, TABLES.products),
         getRecords(token, TABLES.banners),
      ])

      console.log(`📋 店铺信息：${storeRecords.length} 条`)
      console.log(`🛍️  商品列表：${productRecords.length} 条`)
      console.log(`🖼️  Banner：${bannerRecords.length} 条\n`)

      // 第二步：格式化数据
      const store = formatStore(storeRecords)
      const products = formatProducts(productRecords)
      const banners = formatBanners(bannerRecords)

      // 第三步：写入 config.json
      writeConfig(store, products, banners)

      // 第四步：同步数据库
      await syncBanners(prisma, bannerRecords)
      await syncProducts(prisma, productRecords)

      console.log('\n🎉 全部完成！')
      console.log('👉 刷新网页查看最新数据：http://localhost:7777')
   } catch (error) {
      console.error('❌ 同步失败：', error)
   } finally {
      await prisma.$disconnect()
   }
}

main()
