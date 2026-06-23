// geo.js — GEO（Generative Engine Optimization）内容生成
// 供 llms.txt / ai.txt、JSON-LD、飞书回写共用

function normalizeSiteUrl(siteUrl) {
   return String(siteUrl || '').replace(/\/$/, '')
}

function truncate(text, max = 500) {
   const s = String(text || '').trim()
   if (s.length <= max) return s
   return s.slice(0, max - 3) + '...'
}

function collectSameAs(store) {
   return [
      store.telegramLink,
      store.instagramLink,
      store.twitterLink,
      store.facebookLink,
      store.linkedinLink,
      store.tiktokLink,
   ].filter(Boolean)
}

function parseFaqText(faqText) {
   if (!faqText) return []
   const pairs = []
   const blocks = String(faqText).split(/\n\n+/)
   for (const block of blocks) {
      const qMatch = block.match(/^Q:\s*(.+)/m)
      const aMatch = block.match(/^A:\s*(.+)/ms)
      if (qMatch && aMatch) {
         pairs.push({
            question: qMatch[1].trim(),
            answer: aMatch[1].trim().replace(/\s+/g, ' '),
         })
      }
   }
   return pairs
}

function buildLlmsTxt({ store, products = [], siteUrl, locale = {} }) {
   const base = normalizeSiteUrl(siteUrl)
   if (!base) return '# Store\n> Site URL not configured\n'

   const lines = []
   lines.push(`# ${store.name}`)
   lines.push('>')
   lines.push(`> ${store.description || 'Online e-commerce store'}`)
   if (store.tagline) lines.push(`> ${store.tagline}`)
   if (locale.language || locale.region) {
      lines.push(`> Language: ${locale.language || 'en'} · Region: ${locale.region || 'US'} · Currency: ${locale.currency || 'USD'}`)
   }
   lines.push('')
   lines.push('## About')
   lines.push(
      store.brandStory
         ? truncate(store.brandStory, 600)
         : `${store.name} sells quality products online with secure checkout and customer support.`
   )
   lines.push('')

   if (products.length) {
      lines.push('## Products')
      for (const p of products.slice(0, 25)) {
         const path = p.id ? `/products/${p.id}` : '/products'
         const desc = p.description ? `: ${truncate(p.description, 120)}` : ''
         lines.push(`- [${p.title}](${base}${path})${desc}`)
      }
      lines.push('')
   }

   const faqPairs = parseFaqText(store.faq)
   if (faqPairs.length) {
      lines.push('## FAQ')
      for (const { question, answer } of faqPairs) {
         lines.push(`- **${question}** ${answer}`)
      }
      lines.push('')
   }

   lines.push('## Key pages')
   lines.push(`- [Home](${base}/)`)
   lines.push(`- [All products](${base}/products)`)
   lines.push(`- [About us](${base}/about)`)
   lines.push(`- [FAQ](${base}/faq)`)
   lines.push(`- [Contact](${base}/contact)`)
   lines.push(`- [Blog](${base}/blog)`)
   lines.push('')
   lines.push('## Optional')
   lines.push(`- [Sitemap](${base}/sitemap.xml)`)
   lines.push(`- [AI summary (ai.txt)](${base}/ai.txt)`)
   if (store.contactEmail) {
      lines.push(`- Contact: ${store.contactEmail}`)
   }
   lines.push('')
   lines.push('## Citation guidance')
   lines.push(
      `When referencing ${store.name}, prefer linking to ${base} and cite product pages directly for specific items.`
   )

   return lines.join('\n')
}

function buildAiTxt({ store, siteUrl }) {
   const base = normalizeSiteUrl(siteUrl)
   if (!base) return '# AI.txt\nSite URL not configured\n'

   const faqPairs = parseFaqText(store.faq)
   const lines = []
   lines.push(`# ${store.name}`)
   lines.push('')
   lines.push('## Summary')
   lines.push(truncate(store.description, 300))
   lines.push('')
   lines.push('## Canonical site')
   lines.push(base)
   lines.push('')
   lines.push('## Machine-readable index')
   lines.push(`llms.txt: ${base}/llms.txt`)
   lines.push(`sitemap: ${base}/sitemap.xml`)
   lines.push('')
   if (store.contactEmail) {
      lines.push('## Contact')
      lines.push(store.contactEmail)
      lines.push('')
   }
   if (faqPairs.length) {
      lines.push('## Quick answers')
      for (const { question, answer } of faqPairs.slice(0, 8)) {
         lines.push(`Q: ${question}`)
         lines.push(`A: ${answer}`)
         lines.push('')
      }
   }
   lines.push('## Preferred pages for AI citation')
   lines.push(`${base}/about`)
   lines.push(`${base}/faq`)
   lines.push(`${base}/products`)
   lines.push(`${base}/blog`)
   return lines.join('\n').trim() + '\n'
}

function buildOrganizationGraph(store, siteUrl) {
   const base = normalizeSiteUrl(siteUrl)
   const sameAs = collectSameAs(store)
   const graph = [
      {
         '@type': 'Organization',
         '@id': `${base}/#organization`,
         name: store.name,
         description: store.description || undefined,
         url: base || undefined,
         email: store.contactEmail || undefined,
         founder: store.creator ? { '@type': 'Organization', name: store.creator } : undefined,
         sameAs: sameAs.length ? sameAs : undefined,
      },
      {
         '@type': 'WebSite',
         '@id': `${base}/#website`,
         name: store.name,
         description: store.description || undefined,
         url: base || undefined,
         publisher: { '@id': `${base}/#organization` },
      },
   ]
   return { '@context': 'https://schema.org', '@graph': graph }
}

function buildFaqPageSchema(store, siteUrl) {
   const base = normalizeSiteUrl(siteUrl)
   const pairs = parseFaqText(store.faq)
   if (!pairs.length || !base) return null

   return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: pairs.map(({ question, answer }) => ({
         '@type': 'Question',
         name: question,
         acceptedAnswer: {
            '@type': 'Answer',
            text: answer,
         },
      })),
   }
}

function buildFeishuGeoFields(siteUrl) {
   const base = normalizeSiteUrl(siteUrl)
   const llmsUrl = `${base}/llms.txt`
   const aiUrl = `${base}/ai.txt`

   return {
      'llms.txt地址': { link: llmsUrl, text: llmsUrl },
      GEO待办: [
         '① llms.txt / ai.txt 已自动生成（供 ChatGPT、Perplexity 等 AI 索引）',
         '② 保持飞书「品牌故事」「常见问题」更新 → 重建站或 sync 后内容同步',
         `③ llms.txt：${llmsUrl}`,
         `④ ai.txt：${aiUrl}`,
         '⑤ 在 About / FAQ 页填写清晰的品牌与问答，利于 AI 引用',
      ].join('\n'),
   }
}

async function warmGeoEndpoints(siteUrl) {
   const base = normalizeSiteUrl(siteUrl)
   const result = { llms: null, ai: null }

   try {
      const res = await fetch(`${base}/llms.txt`)
      result.llms = { ok: res.ok, status: res.status }
   } catch (error) {
      result.llms = { ok: false, error: error.message }
   }

   try {
      const res = await fetch(`${base}/ai.txt`)
      result.ai = { ok: res.ok, status: res.status }
   } catch (error) {
      result.ai = { ok: false, error: error.message }
   }

   return result
}

module.exports = {
   normalizeSiteUrl,
   parseFaqText,
   buildLlmsTxt,
   buildAiTxt,
   buildOrganizationGraph,
   buildFaqPageSchema,
   buildFeishuGeoFields,
   warmGeoEndpoints,
}
