// cron.js
// 功能：定期为所有已上线客户生成 SEO 博客文章
// 运行方法：node cron.js

const { execSync } = require('child_process')
const path = require('path')
const { pingSitemap, buildFeishuSeoFields, extractSiteUrl, warmGeoEndpoints } = require('./seo')

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || 'YOUR_FEISHU_APP_ID'
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || 'YOUR_FEISHU_APP_SECRET'
const FEISHU_APP_TOKEN = process.env.FEISHU_APP_TOKEN || 'YOUR_FEISHU_APP_TOKEN'
const STORE_TABLE_ID = 'tblAn8PI1eoduVkn'

const NEON_API_KEY = process.env.NEON_API_KEY || 'YOUR_NEON_API_KEY'
const NEON_ORG_ID = process.env.NEON_ORG_ID || 'YOUR_NEON_ORG_ID'

const IS_CI = process.env.GITHUB_ACTIONS === 'true'
const STOREFRONT_DIR = IS_CI
   ? path.join(process.cwd())
   : path.join(process.env.HOME, 'Desktop/next-prisma-tailwind-ecommerce/apps/storefront')

function log(emoji, msg) {
   console.log(`[${new Date().toLocaleString('zh-CN')}] ${emoji}  ${msg}`)
}

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

async function getActiveClients() {
   const token = await getFeishuToken()
   const res = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${STORE_TABLE_ID}/records`,
      { headers: { Authorization: `Bearer ${token}` } }
   )
   const data = await res.json()
   const items = data.data?.items || []

   return {
      token,
      clients: items
         .filter((r) => r.fields['部署状态']?.includes('已上线'))
         .map((r) => ({
            clientId: r.fields['客户ID'],
            recordId: r.record_id,
            siteUrl: extractSiteUrl(r.fields['前台地址']),
         }))
         .filter((c) => c.clientId),
   }
}

async function getConnectionString(clientId) {
   const projectName = `shop-${clientId}`

   const listRes = await fetch(
      `https://console.neon.tech/api/v2/projects?org_id=${NEON_ORG_ID}`,
      { headers: { Authorization: `Bearer ${NEON_API_KEY}` } }
   )
   const listData = await listRes.json()
   const project = listData.projects?.find((p) => p.name === projectName)

   if (!project) {
      log('⚠️', `找不到客户 ${clientId} 的数据库`)
      return null
   }

   const connRes = await fetch(
      `https://console.neon.tech/api/v2/projects/${project.id}/connection_uri?role_name=neondb_owner&database_name=neondb`,
      { headers: { Authorization: `Bearer ${NEON_API_KEY}` } }
   )
   const connData = await connRes.json()
   return connData.uri
}

async function updateFeishuSeo(token, recordId, siteUrl, pingResult) {
   const fields = buildFeishuSeoFields(siteUrl, pingResult)
   const res = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${STORE_TABLE_ID}/records/${recordId}`,
      {
         method: 'PUT',
         headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({ fields }),
      }
   )
   const data = await res.json()
   if (data.code !== 0) {
      log('⚠️', `飞书 SEO 回写失败：${JSON.stringify(data)}`)
      return false
   }
   log('✅', '飞书 SEO 字段已更新（含 Google 手动提交链接）')
   return true
}

async function notifySearchEngines(token, client) {
   if (!client.siteUrl) {
      log('⚠️', `客户 [${client.clientId}] 无前台地址，跳过 sitemap 通知`)
      return
   }

   log('🔍', `通知搜索引擎：${client.siteUrl}`)
   const pingResult = await pingSitemap(client.siteUrl)
   log(pingResult.bing?.ok ? '✅' : '⚠️', `Bing Ping：${pingResult.bing?.status || '失败'}`)

   const geoResult = await warmGeoEndpoints(client.siteUrl)
   log(geoResult.llms?.ok ? '✅' : '⚠️', `GEO llms.txt：${geoResult.llms?.status || geoResult.llms?.error || '失败'}`)

   if (client.recordId) {
      await updateFeishuSeo(token, client.recordId, client.siteUrl, pingResult)
   }
}

async function generateBlogForClient(clientId) {
   log('📝', `开始为客户 [${clientId}] 生成博客文章...`)

   const connectionString = await getConnectionString(clientId)
   if (!connectionString) return false

   try {
      execSync(
         `node ${STOREFRONT_DIR}/ai-blog.js ${clientId} "${connectionString}"`,
         { stdio: 'inherit', cwd: STOREFRONT_DIR }
      )
      log('✅', `客户 [${clientId}] 博客文章生成成功`)
      return true
   } catch (error) {
      log('❌', `客户 [${clientId}] 博客文章生成失败：${error.message}`)
      return false
   }
}

async function main() {
   console.log(`\n${'='.repeat(50)}`)
   console.log(`🤖 SEO 博客定期生成任务开始`)
   console.log(`⏰ 时间：${new Date().toLocaleString('zh-CN')}`)
   console.log(`${'='.repeat(50)}\n`)

   const { token, clients } = await getActiveClients()
   log('✅', `共 ${clients.length} 个已上线客户：${clients.map((c) => c.clientId).join(', ')}`)

   if (clients.length === 0) {
      log('⚠️', '没有已上线客户，退出')
      return
   }

   let success = 0
   let failed = 0

   for (const client of clients) {
      const result = await generateBlogForClient(client.clientId)
      if (result) {
         success++
         await notifySearchEngines(token, client)
      } else {
         failed++
      }

      await new Promise((r) => setTimeout(r, 3000))
   }

   console.log(`\n${'='.repeat(50)}`)
   console.log(`🎉 任务完成！`)
   console.log(`✅ 成功：${success} 个客户`)
   console.log(`❌ 失败：${failed} 个客户`)
   console.log(`📊 每个成功客户：新增 1 篇博客 + Bing 自动 Ping + 飞书 SEO 更新`)
   console.log(`${'='.repeat(50)}\n`)
}

main().catch(console.error)
