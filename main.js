// main.js 最终整合版 v6
// 新增：域名绑定 + DNS 说明回写飞书
// 运行方法：node main.js 客户ID
// 例如：node main.js client004

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// ===== 配置 =====
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || 'YOUR_FEISHU_APP_ID'
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || 'YOUR_FEISHU_APP_SECRET'
const FEISHU_APP_TOKEN = process.env.FEISHU_APP_TOKEN || 'YOUR_FEISHU_APP_TOKEN'
const FEISHU_TABLES = {
   store: 'tblAn8PI1eoduVkn',
   products: 'tbldKPEdxtADz4v9',
   banners: 'tblBXnPE0tUz4xut',
   payment: 'tblZJZBzZRlTyuJy',
}

const NEON_API_KEY = process.env.NEON_API_KEY || 'YOUR_NEON_API_KEY'
const NEON_ORG_ID = process.env.NEON_ORG_ID || 'YOUR_NEON_ORG_ID'

// 自动检测运行环境：本地 or GitHub Actions
const IS_CI = process.env.GITHUB_ACTIONS === 'true'
const GITHUB_TOKEN = IS_CI
   ? (process.env.GH_PAT || process.env.GITHUB_PAT || process.env.PAT || '')
   : (process.env.GH_PAT || process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN')
let githubUsername = (process.env.GH_USERNAME || process.env.GITHUB_ACTOR || '').trim()

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || 'YOUR_VERCEL_TOKEN'
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || 'YOUR_VERCEL_TEAM_ID'
const MAIL_SMTP_USER = process.env.MAIL_SMTP_USER || 'YOUR_MAIL_USER'
const MAIL_SMTP_PASS = process.env.MAIL_SMTP_PASS || 'YOUR_MAIL_PASS'
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'YOUR_JWT_SECRET'

const BASE_DIR = IS_CI
   ? path.join(process.cwd())
   : path.join(process.env.HOME, 'Desktop/next-prisma-tailwind-ecommerce/apps/storefront')
const STOREFRONT_DIR = IS_CI
   ? path.join(process.cwd())
   : path.join(process.env.HOME, 'Desktop/next-prisma-tailwind-ecommerce/apps/storefront')
const ADMIN_DIR = IS_CI
   ? path.join(process.cwd(), '..', 'admin')
   : path.join(process.env.HOME, 'Desktop/next-prisma-tailwind-ecommerce/apps/admin')
const CONFIG_PATH = path.join(STOREFRONT_DIR, 'config.json')
const { parseLocaleFromFeishuFields } = require('./locale')

// ===== 工具函数 =====
function log(emoji, msg) { console.log(`${emoji}  ${msg}`) }

function githubHeaders() {
   return {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
   }
}

async function ensureGithubConfig() {
   const hasPat = !!(process.env.GH_PAT || process.env.GITHUB_PAT || process.env.PAT)

   if (IS_CI && !hasPat) {
      throw new Error(
         '未检测到 GH_PAT。请到 myshop-builder → Settings → Secrets and variables → Actions → Secrets 添加 GH_PAT（Classic PAT，勾选 repo 权限）。注意：必须放在 Secrets 标签页，不能放在 Variables；内置 GITHUB_TOKEN 无法创建新仓库。'
      )
   }
   if (!GITHUB_TOKEN || GITHUB_TOKEN.startsWith('YOUR_')) {
      throw new Error('缺少 GitHub Token：请在 Secrets 中设置 GH_PAT（需 repo 权限）')
   }

   if (githubUsername && !githubUsername.startsWith('YOUR_')) {
      log('✅', `GitHub 用户：${githubUsername}`)
      return
   }

   const res = await fetch('https://api.github.com/user', { headers: githubHeaders() })
   const data = await res.json().catch(() => ({}))
   if (res.ok && data.login) {
      githubUsername = data.login
      log('✅', `GitHub 用户（从 PAT 自动识别）：${githubUsername}`)
      return
   }

   throw new Error('缺少 GitHub 用户名：请在 Secrets 中设置 GH_USERNAME，或确保 GH_PAT 有效')
}

function run(command, cwd, env) {
   execSync(command, {
      cwd: cwd || STOREFRONT_DIR,
      stdio: 'inherit',
      env: { ...process.env, ...env },
   })
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

// ===== 第一步：抓取飞书数据 =====

// ===== AI 文案生成 =====
async function generateAIContent(clientId) {
   const { execSync } = require('child_process')
   try {
      log('🤖', 'AI 生成文案中...')
      execSync(`node ${__dirname}/ai-gen.js ${clientId}`, { stdio: 'inherit' })
      log('✅', 'AI 文案生成完成')
   } catch (error) {
      log('⚠️', 'AI 文案生成失败，继续建站：' + error.message)
   }
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

async function fetchFeishuData(clientId) {
   const token = await getFeishuToken()
   const [storeItems, productItems, bannerItems, paymentItems] = await Promise.all([
      getRecords(token, FEISHU_TABLES.store),
      getRecords(token, FEISHU_TABLES.products),
      getRecords(token, FEISHU_TABLES.banners),
      getRecords(token, FEISHU_TABLES.payment),
   ])

   const storeItem = storeItems.find((r) => r.fields['客户ID'] === clientId)
   if (!storeItem) throw new Error(`飞书里找不到客户ID为 "${clientId}" 的店铺信息`)

   const f = storeItem.fields
   const store = {
      name: f['店铺名称'] || 'My Shop',
      description: f['店铺简介'] || 'E-Commerce Store',
      tagline: f['产品栏标语'] || 'Our Products',
      brandStory: f['品牌故事'] || '',
      creator: f['创建者'] || 'My Shop',
      keywords: f['关键词'] ? f['关键词'].split(',').map((k) => k.trim()) : [],
      contactEmail: f['联系邮箱'] || '',
      telegramLink: f['Telegram链接'] || '',
      instagramLink: f['Instagram链接'] || '',
      twitterLink: f['Twitter链接'] || '',
      facebookLink: f['Facebook链接'] || '',
      linkedinLink: f['LinkedIn链接'] || '',
      tiktokLink: f['TikTok链接'] || '',
      faq: f['常见问题'] || '',
   }

   const adminEmail = (f['管理员邮箱'] || MAIL_SMTP_USER).toLowerCase().trim()
   const customDomain = f['自定义域名'] || ''
   const locale = parseLocaleFromFeishuFields(f)

   const products = recordsForClient(productItems, clientId).map(mapProductRecord)

   const banners = recordsForClient(bannerItems, clientId).map(mapBannerRecord)

   const paymentItem = paymentItems.find((r) => r.fields['客户ID'] === clientId)
   const payment = {
      methods: paymentItem?.fields['支付方式'] || [],
      stripePublicKey: paymentItem?.fields['Stripe 公钥'] || '',
      stripeSecretKey: paymentItem?.fields['Stripe 私钥'] || '',
      paypalClientId: paymentItem?.fields['PayPal Client ID'] || '',
   }

   log('✅', `飞书数据抓取完成：店铺「${store.name}」，管理员「${adminEmail}」，${products.length} 个商品`)
   log('🌍', `语言/地区：${locale.language} · ${locale.region} · ${locale.currency}`)
   if (customDomain) log('🌐', `自定义域名：${customDomain}`)

   return { store, products, banners, storeRecordId: storeItem.record_id, token, adminEmail, payment, customDomain, locale }
}

// ===== 第二步：创建独立数据库 =====
async function createDatabase(clientId, locale) {
   const projectName = `shop-${clientId}`
   const regionId = locale?.neonRegion || 'aws-us-east-1'
   const listRes = await fetch(
      `https://console.neon.tech/api/v2/projects?org_id=${NEON_ORG_ID}`,
      { headers: { Authorization: `Bearer ${NEON_API_KEY}` } }
   )
   const listData = await listRes.json()
   const existing = listData.projects?.find((p) => p.name === projectName)

   if (existing) {
      log('⚠️', `数据库已存在：${projectName}`)
      const connRes = await fetch(
         `https://console.neon.tech/api/v2/projects/${existing.id}/connection_uri?role_name=neondb_owner&database_name=neondb`,
         { headers: { Authorization: `Bearer ${NEON_API_KEY}` } }
      )
      const connData = await connRes.json()
      return { projectId: existing.id, connectionString: connData.uri }
   }

   const createRes = await fetch('https://console.neon.tech/api/v2/projects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${NEON_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
         project: { name: projectName, org_id: NEON_ORG_ID, region_id: regionId, pg_version: 16 },
      }),
   })
   const data = await createRes.json()
   if (!createRes.ok) throw new Error(`创建数据库失败：${JSON.stringify(data)}`)
   const connectionString = data.connection_uris?.[0]?.connection_uri
   if (!connectionString) throw new Error('未获取到数据库连接字符串')
   log('✅', `独立数据库创建成功：${projectName}（${regionId}）`)
   return { projectId: data.project.id, connectionString }
}

// ===== 第三步：推送数据库表结构 =====
async function pushSchema(connectionString) {
   log('⏳', '推送数据库表结构...')
   run('npx prisma db push --skip-generate', STOREFRONT_DIR, { DATABASE_URL: connectionString })
   log('✅', '数据库表结构推送完成')
}

// ===== 第四步：同步数据 + 创建 Owner =====
async function syncDatabase(products, banners, connectionString, adminEmail) {
   process.env.DATABASE_URL = connectionString
   const { PrismaClient } = require('@prisma/client')
   const prisma = new PrismaClient()
   try {
      const existingOwner = await prisma.owner.findFirst({ where: { email: adminEmail } })
      if (!existingOwner) {
         await prisma.owner.create({ data: { email: adminEmail } })
         log('✅', `管理员账号已创建：${adminEmail}`)
      } else {
         log('⚠️', `管理员账号已存在：${adminEmail}`)
      }

      if (banners.length) {
         await prisma.banner.deleteMany()
         for (const b of banners) {
            if (!b.image) continue
            await prisma.banner.create({ data: { image: b.image, label: b.label } })
         }
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
                  price: p.price, description: p.description,
                  images: p.images, keywords: p.keywords,
                  isAvailable: p.isAvailable, brandId: brand.id,
                  categories: { set: [{ title: categoryTitle }] },
               },
            })
            log('🔄', `更新商品：${p.title}`)
         } else {
            await prisma.product.create({
               data: {
                  title: p.title, price: p.price,
                  description: p.description, images: p.images,
                  keywords: p.keywords, isAvailable: p.isAvailable,
                  stock: 10, discount: 0,
                  brand: { connect: { id: brand.id } },
                  categories: { connect: [{ title: categoryTitle }] },
               },
            })
            log('➕', `新增商品：${p.title}`)
         }
      }
      log('✅', `数据库同步完成`)
   } finally {
      await prisma.$disconnect()
   }
}

// ===== 第五步：写 config.json =====
function writeConfig(store, products, banners, locale) {
   fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify({ locale, store, products, banners }, null, 2),
      'utf-8'
   )
   log('✅', `config.json 已更新（${locale.language} / ${locale.region} / ${locale.currency}）`)
}

// ===== 第六步：GitHub 建库 + Push =====
async function pushToGithub(clientId, repoSuffix, sourceDir) {
   const repoName = `${repoSuffix}-${clientId}`
   const headers = githubHeaders()

   const checkRes = await fetch(
      `https://api.github.com/repos/${githubUsername}/${repoName}`,
      { headers }
   )

   if (checkRes.status === 404) {
      const createRes = await fetch('https://api.github.com/user/repos', {
         method: 'POST',
         headers: { ...headers, 'Content-Type': 'application/json' },
         body: JSON.stringify({ name: repoName, description: `${repoSuffix} - ${clientId}`, private: true, auto_init: false }),
      })
      const createBody = await createRes.json().catch(() => ({}))
      if (!createRes.ok) {
         const alreadyExists = createRes.status === 422 && (
            createBody.message?.includes('already exists') ||
            createBody.errors?.some((e) => e.message?.includes('already exists'))
         )
         if (alreadyExists) {
            log('⚠️', `GitHub 仓库已存在：${repoName}`)
         } else {
            throw new Error(`创建 GitHub 仓库失败：${repoName} (${createRes.status}) ${createBody.message || JSON.stringify(createBody)}`)
         }
      } else {
         log('✅', `GitHub 仓库创建成功：${repoName}`)
      }
   } else if (checkRes.status === 200) {
      log('⚠️', `GitHub 仓库已存在：${repoName}`)
   } else {
      const checkBody = await checkRes.json().catch(() => ({}))
      throw new Error(`检查 GitHub 仓库失败：${repoName} (${checkRes.status}) ${checkBody.message || JSON.stringify(checkBody)}`)
   }

   const pushUrl = `https://${githubUsername}:${GITHUB_TOKEN}@github.com/${githubUsername}/${repoName}.git`
   const gitDir = path.join(sourceDir, '.git')
   // CI 检出模板时会带上模板仓库的 .git，直接 push 会导致 pack 错误；每次部署用全新 git 历史
   if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true })
   }
   run('git init', sourceDir)
   run('git branch -M main', sourceDir)
   run(`git config user.email "${MAIL_SMTP_USER}"`, sourceDir)
   run(`git config user.name "${githubUsername}"`, sourceDir)
   run('git add .', sourceDir)
   run(`git commit -m "deploy: ${clientId} - ${new Date().toISOString()}"`, sourceDir)
   run(`git remote add origin ${pushUrl}`, sourceDir)
   run('git push -u origin main --force', sourceDir)
   log('✅', `代码推送成功：${repoName}`)

   const repoRes = await fetch(
      `https://api.github.com/repos/${githubUsername}/${repoName}`,
      { headers }
   )
   const repoData = await repoRes.json()
   return repoData.id
}

// ===== 第七步：Vercel 部署 =====
async function deployVercel(clientId, projectSuffix, repoName, repoId, envVars) {
   const projectName = `${projectSuffix}-${clientId}`

   async function vercelRequest(method, p, body) {
      const url = `https://api.vercel.com${p}?teamId=${VERCEL_TEAM_ID}`
      const res = await fetch(url, {
         method,
         headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
         body: body ? JSON.stringify(body) : undefined,
      })
      return res.json()
   }

   const project = await vercelRequest('POST', '/v10/projects', {
      name: projectName,
      framework: 'nextjs',
      gitRepository: { type: 'github', repo: `${githubUsername}/${repoName}` },
      environmentVariables: envVars,
   })
   if (project.error && project.error.code !== 'project_already_exists' && project.error.code !== 'conflict') {
      throw new Error(`创建 Vercel 项目失败：${JSON.stringify(project.error)}`)
   }

   if (project.error?.code === 'project_already_exists' || project.error?.code === 'conflict') {
      log('🔄', `更新环境变量：${projectName}`)
      const listRes = await vercelRequest('GET', `/v10/projects/${projectName}/env`)
      for (const envVar of envVars) {
         const existing = listRes.envs?.find(e => e.key === envVar.key)
         if (existing) await vercelRequest('DELETE', `/v10/projects/${projectName}/env/${existing.id}`)
         await vercelRequest('POST', `/v10/projects/${projectName}/env`, envVar)
      }
      log('✅', `环境变量已更新：${projectName}`)
   }

   log('✅', `Vercel 项目就绪：${projectName}`)

   const deployment = await vercelRequest('POST', '/v13/deployments', {
      name: projectName,
      gitSource: { type: 'github', repoId: String(repoId), ref: 'main', org: githubUsername, repo: repoName },
      projectSettings: { framework: 'nextjs' },
   })
   if (deployment.error) throw new Error(`触发部署失败：${JSON.stringify(deployment.error)}`)
   log('⏳', `部署中，等待完成...`)

   for (let i = 0; i < 36; i++) {
      await new Promise((r) => setTimeout(r, 10000))
      const status = await vercelRequest('GET', `/v13/deployments/${deployment.id}`)
      const state = status.status || status.readyState
      log('🔄', `[${i + 1}/36] 状态：${state}`)
      if (state === 'READY') return `https://${status.url}`
      if (state === 'ERROR' || state === 'CANCELED') {
         const detail = status.errorMessage || status.error?.message || status.readyStateReason
         throw new Error(`部署失败：${state}${detail ? ` — ${detail}` : ''}`)
      }
   }
   throw new Error('部署超时')
}


// ===== SEO：通知搜索引擎 + 返回飞书字段 =====
const { pingSitemap, buildFeishuSeoFields, warmGeoEndpoints } = require('./seo')

async function submitSitemapToSearchEngines(siteUrl) {
   try {
      const pingResult = await pingSitemap(siteUrl)
      log(pingResult.bing?.ok ? '✅' : '⚠️', `Bing Sitemap 提交：${pingResult.bing?.status || '失败'}`)
      log('✅', `Sitemap 已预热：${pingResult.sitemapUrl}`)
      log('💡', `Google 需手动提交，链接将回写飞书「Google收录」字段`)

      const geoResult = await warmGeoEndpoints(siteUrl)
      log(geoResult.llms?.ok ? '✅' : '⚠️', `GEO llms.txt：${geoResult.llms?.status || geoResult.llms?.error || '失败'}`)
      log(geoResult.ai?.ok ? '✅' : '⚠️', `GEO ai.txt：${geoResult.ai?.status || geoResult.ai?.error || '失败'}`)

      return pingResult
   } catch (e) {
      log('⚠️', `Sitemap 提交出错：${e.message}`)
      return null
   }
}

// ===== 第八步：绑定自定义域名 =====
async function bindDomain(clientId, customDomain) {
   if (!customDomain) {
      log('⚠️', '未填写自定义域名，跳过')
      return null
   }

   const projectName = `site-${clientId}`
   log('🌐', `开始绑定域名：${customDomain}`)

   const res = await fetch(
      `https://api.vercel.com/v10/projects/${projectName}/domains?teamId=${VERCEL_TEAM_ID}`,
      {
         method: 'POST',
         headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({ name: customDomain }),
      }
   )
   const data = await res.json()

   if (data.error && data.error.code !== 'domain_already_in_use') {
      log('❌', `域名绑定失败：${JSON.stringify(data.error)}`)
      return null
   }

   log('✅', `域名绑定成功：${customDomain}`)

   // 生成 DNS 配置说明
   const isSubdomain = customDomain.split('.').length > 2
   let dnsInstructions = ''

   if (isSubdomain) {
      const subdomain = customDomain.split('.')[0]
      dnsInstructions = `请在域名管理后台添加 DNS 解析：\n\n类型：CNAME\n主机记录：${subdomain}\n记录值：cname.vercel-dns.com\n\n解析生效后（通常1-24小时），访问：https://${customDomain}`
   } else {
      dnsInstructions = `请在域名管理后台添加以下 DNS 解析：\n\n① 类型：A\n主机记录：@\n记录值：76.76.21.21\n\n② 类型：CNAME\n主机记录：www\n记录值：cname.vercel-dns.com\n\n解析生效后（通常1-24小时），访问：https://${customDomain}`
   }

   return { customDomain, dnsInstructions }
}

// ===== 第九步：回写飞书 =====
async function writeBackToFeishu(token, recordId, siteUrl, adminUrl, domainInfo, seoPing) {
   const fields = {
      前台地址: { link: siteUrl, text: siteUrl },
      后台地址: { link: adminUrl, text: adminUrl },
      部署状态: `✅ 已上线 - ${new Date().toLocaleString('zh-CN')}`,
      ...buildFeishuSeoFields(siteUrl, seoPing),
   }

   if (domainInfo) {
      fields['DNS配置说明'] = domainInfo.dnsInstructions
      fields['域名状态'] = `⏳ 等待DNS解析 - ${domainInfo.customDomain}`
   }

   const res = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLES.store}/records/${recordId}`,
      {
         method: 'PUT',
         headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({ fields }),
      }
   )
   const data = await res.json()
   if (data.code !== 0) throw new Error(`飞书回写失败：${JSON.stringify(data)}`)
   log('✅', `飞书回写成功！`)
}

// ===== 主函数 =====
async function main() {
   const clientId = process.argv[2]
   if (!clientId) {
      console.error('❌ 请提供客户ID，例如：node main.js client005')
      process.exit(1)
   }

   console.log(`\n${'='.repeat(50)}`)
   console.log(`🚀 开始为客户 [${clientId}] 一键建站`)
   console.log(`${'='.repeat(50)}\n`)

   try {
      await ensureGithubConfig()

      console.log('🤖 第零步：AI 生成文案...')
   await generateAIContent(clientId)

   console.log('📋 第一步：抓取飞书数据...')
      const { store, products, banners, storeRecordId, token, adminEmail, payment, customDomain, locale } = await fetchFeishuData(clientId)

      console.log('\n🗄️  第二步：创建独立数据库...')
      const { connectionString } = await createDatabase(clientId, locale)

      console.log('\n🏗️  第三步：推送数据库表结构...')
      await pushSchema(connectionString)

      console.log('\n📦 第四步：同步数据 + 创建管理员账号...')
      await syncDatabase(products, banners, connectionString, adminEmail)

      console.log('\n📝 第五步：更新 config.json...')
      writeConfig(store, products, banners, locale)

      console.log('\n📦 第六步：推送前台代码到 GitHub...')
      const storefrontRepoId = await pushToGithub(clientId, 'site', STOREFRONT_DIR)

      console.log('\n📦 第七步：推送后台代码到 GitHub...')
      const adminRepoId = await pushToGithub(clientId, 'admin', ADMIN_DIR)

      // 构建前台环境变量
      const storefrontEnvVars = [
         { key: 'DATABASE_URL', value: connectionString, type: 'encrypted', target: ['production', 'preview', 'development'] },
         { key: 'JWT_SECRET_KEY', value: JWT_SECRET_KEY, type: 'encrypted', target: ['production', 'preview', 'development'] },
         { key: 'MAIL_SMTP_SERVICE', value: 'gmail', type: 'plain', target: ['production', 'preview', 'development'] },
         { key: 'MAIL_SMTP_USER', value: MAIL_SMTP_USER, type: 'plain', target: ['production', 'preview', 'development'] },
         { key: 'MAIL_SMTP_PASS', value: MAIL_SMTP_PASS, type: 'encrypted', target: ['production', 'preview', 'development'] },
         { key: 'NEXT_PUBLIC_SITE_URL', value: customDomain ? `https://${customDomain}` : `https://site-${clientId}.vercel.app`, type: 'plain', target: ['production', 'preview', 'development'] },
         { key: 'NEXT_PUBLIC_URL', value: customDomain ? `https://${customDomain}` : `https://site-${clientId}.vercel.app`, type: 'plain', target: ['production', 'preview', 'development'] },
         { key: 'NEXT_PUBLIC_LOCALE', value: locale.language, type: 'plain', target: ['production', 'preview', 'development'] },
         { key: 'NEXT_PUBLIC_REGION', value: locale.region, type: 'plain', target: ['production', 'preview', 'development'] },
         { key: 'NEXT_PUBLIC_CURRENCY', value: locale.currency, type: 'plain', target: ['production', 'preview', 'development'] },
         { key: 'NEXT_PUBLIC_COUNTRY_CODE', value: locale.countryCode, type: 'plain', target: ['production', 'preview', 'development'] },
         { key: 'NEXT_PUBLIC_TAX_RATE', value: String(locale.taxRate), type: 'plain', target: ['production', 'preview', 'development'] },
         { key: 'STORE_TIMEZONE', value: locale.timezone, type: 'plain', target: ['production', 'preview', 'development'] },
      ]

      if (payment.stripeSecretKey && payment.stripeSecretKey !== 'sk_test_placeholder') {
         storefrontEnvVars.push(
            { key: 'STRIPE_SECRET_KEY', value: payment.stripeSecretKey, type: 'encrypted', target: ['production', 'preview', 'development'] },
            { key: 'STRIPE_PUBLIC_KEY', value: payment.stripePublicKey, type: 'plain', target: ['production', 'preview', 'development'] },
            { key: 'NEXT_PUBLIC_STRIPE_PUBLIC_KEY', value: payment.stripePublicKey, type: 'plain', target: ['production', 'preview', 'development'] }
         )
         log('✅', 'Stripe 支付配置已注入')
      }

      console.log('\n🌐 第八步：部署前台...')
      const siteUrl = await deployVercel(clientId, 'site', `site-${clientId}`, storefrontRepoId, storefrontEnvVars)

      console.log('\n⚙️  第九步：部署后台...')
      const adminUrl = await deployVercel(clientId, 'admin', `admin-${clientId}`, adminRepoId, [
         { key: 'DATABASE_URL', value: connectionString, type: 'encrypted', target: ['production', 'preview', 'development'] },
         { key: 'NEXT_PUBLIC_URL', value: `https://admin-${clientId}.vercel.app`, type: 'plain', target: ['production', 'preview', 'development'] },
         { key: 'JWT_SECRET_KEY', value: JWT_SECRET_KEY, type: 'encrypted', target: ['production', 'preview', 'development'] },
         { key: 'NEXT_PUBLIC_JWT_SECRET_KEY', value: JWT_SECRET_KEY, type: 'plain', target: ['production', 'preview', 'development'] },
         { key: 'MAIL_SMTP_SERVICE', value: 'gmail', type: 'plain', target: ['production', 'preview', 'development'] },
         { key: 'MAIL_SMTP_USER', value: MAIL_SMTP_USER, type: 'plain', target: ['production', 'preview', 'development'] },
         { key: 'MAIL_SMTP_PASS', value: MAIL_SMTP_PASS, type: 'encrypted', target: ['production', 'preview', 'development'] },
      ])

      console.log('\n🌐 第十步：绑定自定义域名...')
      const domainInfo = await bindDomain(clientId, customDomain)

      console.log('\n🔍 第十一步：通知搜索引擎（Bing 自动 + Google 回写飞书）...')
      const seoPing = await submitSitemapToSearchEngines(siteUrl)

      console.log('\n📬 第十二步：回写飞书...')
      await writeBackToFeishu(token, storeRecordId, siteUrl, adminUrl, domainInfo, seoPing)

      console.log(`\n${'='.repeat(50)}`)
      console.log(`🎉 建站完成！`)
      console.log(`🌐 前台地址：${siteUrl}`)
      console.log(`⚙️  后台地址：${adminUrl}`)
      console.log(`👤 管理员邮箱：${adminEmail}`)
      if (domainInfo) {
         console.log(`🌐 自定义域名：${domainInfo.customDomain}`)
         console.log(`📋 DNS说明已回写到飞书`)
      }
      console.log(`${'='.repeat(50)}\n`)

   } catch (error) {
      console.error('\n❌ 出错了：', error.message)
      process.exit(1)
   }
}

main()
