// seo.js — 搜索引擎 sitemap 通知 + 飞书 SEO / GEO 字段

const { buildFeishuGeoFields, warmGeoEndpoints } = require('./geo')

function normalizeSiteUrl(siteUrl) {
   return String(siteUrl || '').replace(/\/$/, '')
}

async function pingSitemap(siteUrl) {
   const base = normalizeSiteUrl(siteUrl)
   const sitemapUrl = `${base}/sitemap.xml`
   const result = { sitemapUrl, bing: null, warmed: false }

   try {
      const bingRes = await fetch(
         `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
      )
      result.bing = { ok: bingRes.ok, status: bingRes.status }
   } catch (error) {
      result.bing = { ok: false, error: error.message }
   }

   try {
      await fetch(sitemapUrl)
      result.warmed = true
   } catch {
      result.warmed = false
   }

   return result
}

function buildFeishuSeoFields(siteUrl, pingResult) {
   const base = normalizeSiteUrl(siteUrl)
   const sitemapUrl = pingResult?.sitemapUrl || `${base}/sitemap.xml`
   const bingOk = pingResult?.bing?.ok
   const bingStatus = bingOk
      ? '✅ 已自动 Ping Bing'
      : `⚠️ Bing Ping 失败 (${pingResult?.bing?.status || pingResult?.bing?.error || '未知'})`

   return {
      Sitemap地址: { link: sitemapUrl, text: sitemapUrl },
      Google收录: {
         link: 'https://search.google.com/search-console',
         text: '👉 点击打开 Google Search Console',
      },
      Bing收录: bingStatus,
      SEO更新时间: new Date().toLocaleString('zh-CN'),
      SEO待办: [
         '① 点击「Google收录」打开 Search Console',
         '② 左侧「站点地图」→ 输入 sitemap.xml 并提交',
         `③ Sitemap 地址：${sitemapUrl}`,
         bingOk ? '④ Bing 已自动通知' : '④ Bing 需手动在 Webmaster Tools 提交',
         `⑤ GEO：${base}/llms.txt 与 ${base}/ai.txt 已生成`,
      ].join('\n'),
      ...buildFeishuGeoFields(siteUrl),
   }
}

function extractSiteUrl(field) {
   if (!field) return null
   if (typeof field === 'string') return field.replace(/\/$/, '')
   if (field.link) return String(field.link).replace(/\/$/, '')
   if (field.text) return String(field.text).replace(/\/$/, '')
   return null
}

module.exports = {
   pingSitemap,
   buildFeishuSeoFields,
   extractSiteUrl,
   normalizeSiteUrl,
   warmGeoEndpoints,
   buildFeishuGeoFields,
}
