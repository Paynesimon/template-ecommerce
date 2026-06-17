// cron.js
// 功能：定期为所有已上线客户生成 SEO 博客文章
// 运行方法：node cron.js
// 建议每周运行一次（部署到 Railway 后设置定时触发）

const { execSync } = require('child_process')
const path = require('path')

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

// ===== 获取飞书 Token =====
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

// ===== 获取所有已上线客户 =====
async function getActiveClients() {
   const token = await getFeishuToken()
   const res = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${STORE_TABLE_ID}/records`,
      { headers: { Authorization: `Bearer ${token}` } }
   )
   const data = await res.json()
   const items = data.data?.items || []

   return items
      .filter(r => r.fields['部署状态']?.includes('已上线'))
      .map(r => r.fields['客户ID'])
      .filter(Boolean)
}

// ===== 获取客户数据库连接字符串 =====
async function getConnectionString(clientId) {
   const projectName = `shop-${clientId}`

   // 先找项目 ID
   const listRes = await fetch(
      `https://console.neon.tech/api/v2/projects?org_id=${NEON_ORG_ID}`,
      { headers: { Authorization: `Bearer ${NEON_API_KEY}` } }
   )
   const listData = await listRes.json()
   const project = listData.projects?.find(p => p.name === projectName)

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

// ===== 为单个客户生成博客文章 =====
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

// ===== 主函数 =====
async function main() {
   console.log(`\n${'='.repeat(50)}`)
   console.log(`🤖 SEO 博客定期生成任务开始`)
   console.log(`⏰ 时间：${new Date().toLocaleString('zh-CN')}`)
   console.log(`${'='.repeat(50)}\n`)

   // 获取所有已上线客户
   log('📋', '读取已上线客户列表...')
   const clients = await getActiveClients()
   log('✅', `共 ${clients.length} 个已上线客户：${clients.join(', ')}`)

   if (clients.length === 0) {
      log('⚠️', '没有已上线客户，退出')
      return
   }

   // 逐个生成博客文章
   let success = 0
   let failed = 0

   for (const clientId of clients) {
      const result = await generateBlogForClient(clientId)
      if (result) success++
      else failed++

      // 每个客户之间等待 3 秒，避免 API 限流
      await new Promise(r => setTimeout(r, 3000))
   }

   console.log(`\n${'='.repeat(50)}`)
   console.log(`🎉 任务完成！`)
   console.log(`✅ 成功：${success} 个客户`)
   console.log(`❌ 失败：${failed} 个客户`)
   console.log(`📊 每个客户新增 1 篇 SEO 博客文章`)
   console.log(`${'='.repeat(50)}\n`)
}

main().catch(console.error)
