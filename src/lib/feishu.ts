// src/lib/feishu.ts
// 从飞书多维表格读取店铺配置数据

const FEISHU_APP_ID = process.env.FEISHU_APP_ID!
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET!
const FEISHU_APP_TOKEN = 'Txeab1NDVaBiNssZ9mIc2fwmngo'

const TABLE_IDS = {
   store: 'tblAn8PI1eoduVkn',
   products: 'tbldKPEdxtADz4v9',
   banners: 'tblBXnPE0tUz4xut',
}

// 获取访问令牌
async function getAccessToken(): Promise<string> {
   const res = await fetch(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            app_id: FEISHU_APP_ID,
            app_secret: FEISHU_APP_SECRET,
         }),
         cache: 'no-store',
      }
   )
   const data = await res.json()
   return data.tenant_access_token
}

// 读取表格数据
async function getTableRecords(tableId: string) {
   const token = await getAccessToken()
   const res = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${tableId}/records`,
      {
         headers: { Authorization: `Bearer ${token}` },
         next: { revalidate: 60 }, // 每60秒重新读取一次
      }
   )
   const data = await res.json()
   return data.data?.items || []
}

// 读取店铺信息
export async function getStoreConfig() {
   try {
      const records = await getTableRecords(TABLE_IDS.store)
      if (!records.length) return null
      const fields = records[0].fields
      return {
         name: fields['店铺名称'] || 'My Shop',
         description: fields['店铺简介'] || 'E-Commerce Store',
         tagline: fields['产品栏标语'] || 'Our Products',
         brandStory: fields['品牌故事'] || '',
         creator: fields['创建者'] || 'My Shop',
         keywords: fields['关键词']?.split(',').map((k: string) => k.trim()) || [],
      }
   } catch (error) {
      console.error('Failed to fetch store config:', error)
      return null
   }
}

// 读取商品列表
export async function getFeishuProducts() {
   try {
      const records = await getTableRecords(TABLE_IDS.products)
      return records.map((record: any) => {
         const fields = record.fields
         return {
            title: fields['商品名称'] || '',
            brand: fields['品牌'] || '',
            price: Number(fields['价格']) || 0,
            description: fields['商品描述'] || '',
            images: [fields['图片URL'] || ''],
            categories: fields['分类']?.split(',').map((c: string) => c.trim()) || [],
            keywords: fields['关键词']?.split(',').map((k: string) => k.trim()) || [],
            isAvailable: fields['是否上架'] ?? true,
         }
      })
   } catch (error) {
      console.error('Failed to fetch products:', error)
      return []
   }
}

// 读取 Banner 轮播图
export async function getFeishuBanners() {
   try {
      const records = await getTableRecords(TABLE_IDS.banners)
      return records
         .sort((a: any, b: any) => (a.fields['排序'] || 0) - (b.fields['排序'] || 0))
         .map((record: any) => ({
            image: record.fields['图片URL'] || '',
            label: record.fields['标签名'] || '',
         }))
   } catch (error) {
      console.error('Failed to fetch banners:', error)
      return []
   }
}
