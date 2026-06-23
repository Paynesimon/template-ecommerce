// ai-gen.js
// 功能：用火山方舟 AI 自动生成店铺文案，写回飞书
// 运行方法：node ai-gen.js 客户ID
// 例如：node ai-gen.js client001

const ARK_API_KEY = process.env.ARK_API_KEY || 'YOUR_ARK_API_KEY'
const ARK_MODEL = process.env.ARK_MODEL || 'ep-20260520160054-cvn7v'
const ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || 'YOUR_FEISHU_APP_ID'
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || 'YOUR_FEISHU_APP_SECRET'
const FEISHU_APP_TOKEN = process.env.FEISHU_APP_TOKEN || 'YOUR_FEISHU_APP_TOKEN'
const STORE_TABLE_ID = 'tblAn8PI1eoduVkn'
const PRODUCTS_TABLE_ID = 'tbldKPEdxtADz4v9'
const { parseLocaleFromFeishuFields, getAiLanguageName, formatPriceForPrompt } = require('./locale')

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

// ===== 飞书 API =====
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

async function updateRecord(token, tableId, recordId, fields) {
   const res = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${tableId}/records/${recordId}`,
      {
         method: 'PUT',
         headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({ fields }),
      }
   )
   const data = await res.json()
   if (data.code !== 0) throw new Error(`飞书更新失败：${JSON.stringify(data)}`)
}

// ===== 生成店铺文案 =====
async function generateStoreContent(storeName, products, locale) {
   const langName = getAiLanguageName(locale.language)
   const productList = products
      .map((p) => `- ${p.title} (${formatPriceForPrompt(p.price, locale.currency)})`)
      .join('\n')

   log('🤖', '生成品牌故事...')
   const brandStory = await askAI(`
You are a professional e-commerce copywriter. Write a compelling brand story for an online store.

Store name: ${storeName}
Target market: ${locale.region}
Products sold:
${productList}

Write a 2-3 paragraph brand story that:
- Introduces the brand with passion and authenticity
- Highlights what makes this store unique
- Connects emotionally with potential customers
- Is written in ${langName}, professional but friendly tone

Return only the brand story text, no titles or extra formatting.
`)

   log('🤖', '生成店铺标语...')
   const tagline = await askAI(`
Write a short, catchy tagline (max 10 words) for an online store called "${storeName}" that sells: ${products.map((p) => p.title).join(', ')}.
Write in ${langName}. Return only the tagline, nothing else.
`)

   log('🤖', '生成 FAQ...')
   const faq = await askAI(`
Write 5 common FAQ questions and answers for an online store called "${storeName}".
Format each as:
Q: [question]
A: [answer]

Topics to cover: shipping, returns, payment, product quality, customer support.
Write in ${langName}. Keep answers concise and helpful. Return only the Q&A pairs.
`)

   return {
      brandStory: brandStory.trim(),
      tagline: tagline.trim(),
      faq: faq.trim(),
   }
}

// ===== 生成商品描述 =====
async function generateProductDescription(productTitle, brandName, price, locale) {
   const langName = getAiLanguageName(locale.language)
   log('🤖', `生成商品描述：${productTitle}...`)
   const description = await askAI(`
Write a compelling product description for an e-commerce listing.

Product: ${productTitle}
Brand: ${brandName}
Price: ${formatPriceForPrompt(price, locale.currency)}

Write 2-3 sentences that:
- Highlight key features and benefits
- Create desire in the buyer
- Are professional and persuasive
- Written in ${langName}

Return only the product description, no titles or extra formatting.
`)
   return description.trim()
}

// ===== 主函数 =====
async function main() {
   const clientId = process.argv[2]
   if (!clientId) {
      console.error('❌ 请提供客户ID，例如：node ai-gen.js client001')
      process.exit(1)
   }

   console.log(`\n${'='.repeat(50)}`)
   console.log(`🤖 开始为客户 [${clientId}] 生成 AI 文案`)
   console.log(`${'='.repeat(50)}\n`)

   const token = await getFeishuToken()

   // 读取店铺信息
   const storeItems = await getRecords(token, STORE_TABLE_ID)
   const storeItem = storeItems.find(r => r.fields['客户ID'] === clientId)
   if (!storeItem) throw new Error(`找不到客户ID为 "${clientId}" 的店铺信息`)

   const storeName = storeItem.fields['店铺名称'] || clientId
   const locale = parseLocaleFromFeishuFields(storeItem.fields)
   log('🌍', `目标语言/地区：${locale.language} · ${locale.region} · ${locale.currency}`)

   // 读取商品列表
   const productItems = await getRecords(token, PRODUCTS_TABLE_ID)
   const products = productItems
      .filter((r) => String(r.fields['客户ID'] || '').trim() === clientId)
      .map((r) => ({
      recordId: r.record_id,
      title: r.fields['商品名称'] || '',
      brand: r.fields['品牌'] || '',
      price: r.fields['价格'] || 0,
      description: r.fields['商品描述'] || '',
   })).filter(p => p.title)

   log('✅', `读取到店铺「${storeName}」，${products.length} 个商品`)

   // 第一步：生成店铺文案
   console.log('\n📝 生成店铺文案...')
   const storeContent = await generateStoreContent(storeName, products, locale)

   // 回写店铺文案到飞书
   await updateRecord(token, STORE_TABLE_ID, storeItem.record_id, {
      '品牌故事': storeContent.brandStory,
      '产品栏标语': storeContent.tagline,
      '常见问题': storeContent.faq,
   })
   log('✅', '店铺文案已回写飞书')

   // 第二步：生成商品描述
   console.log('\n📦 生成商品描述...')
   for (const product of products) {
      if (product.description && product.description.length > 20) {
         log('⚠️', `${product.title} 已有描述，跳过`)
         continue
      }
      const description = await generateProductDescription(
         product.title,
         product.brand,
         product.price,
         locale
      )
      await updateRecord(token, PRODUCTS_TABLE_ID, product.recordId, {
         '商品描述': description,
      })
      log('✅', `${product.title} 描述已生成`)
   }

   console.log(`\n${'='.repeat(50)}`)
   console.log(`🎉 AI 文案生成完成！`)
   console.log(`📋 品牌故事、标语、FAQ、商品描述已全部写入飞书`)
   console.log(`💡 运行 node main.js ${clientId} 可将内容同步到网站`)
   console.log(`${'='.repeat(50)}\n`)
}

main().catch(console.error)
