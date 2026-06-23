// locale.js — 方案 A：每站点单一语言 + 地区（建站时从飞书写入 config.json）

const REGION_PRESETS = {
   US: {
      neonRegion: 'aws-us-east-1',
      countryCode: 'US',
      taxRate: 0.09,
      timezone: 'America/New_York',
      defaultCurrency: 'USD',
      defaultLanguage: 'en',
   },
   EU: {
      neonRegion: 'aws-eu-central-1',
      countryCode: 'DE',
      taxRate: 0.2,
      timezone: 'Europe/Berlin',
      defaultCurrency: 'EUR',
      defaultLanguage: 'en',
   },
   UK: {
      neonRegion: 'aws-eu-west-2',
      countryCode: 'GB',
      taxRate: 0.2,
      timezone: 'Europe/London',
      defaultCurrency: 'GBP',
      defaultLanguage: 'en',
   },
   CN: {
      neonRegion: 'aws-ap-southeast-1',
      countryCode: 'CN',
      taxRate: 0.13,
      timezone: 'Asia/Shanghai',
      defaultCurrency: 'CNY',
      defaultLanguage: 'zh-CN',
   },
   SEA: {
      neonRegion: 'aws-ap-southeast-1',
      countryCode: 'SG',
      taxRate: 0.08,
      timezone: 'Asia/Singapore',
      defaultCurrency: 'USD',
      defaultLanguage: 'en',
   },
   JP: {
      neonRegion: 'aws-ap-northeast-1',
      countryCode: 'JP',
      taxRate: 0.1,
      timezone: 'Asia/Tokyo',
      defaultCurrency: 'JPY',
      defaultLanguage: 'ja',
   },
}

const LANGUAGE_ALIASES = {
   en: 'en',
   english: 'en',
   'zh-cn': 'zh-CN',
   'zh-hans': 'zh-CN',
   chinese: 'zh-CN',
   中文: 'zh-CN',
   简体中文: 'zh-CN',
   'zh-tw': 'zh-TW',
   繁体中文: 'zh-TW',
   de: 'de',
   german: 'de',
   德语: 'de',
   fr: 'fr',
   french: 'fr',
   法语: 'fr',
   ja: 'ja',
   japanese: 'ja',
   日语: 'ja',
   ko: 'ko',
   korean: 'ko',
   韩语: 'ko',
   es: 'es',
   spanish: 'es',
   西班牙语: 'es',
}

const AI_LANGUAGE_NAMES = {
   en: 'English',
   'zh-CN': 'Simplified Chinese',
   'zh-TW': 'Traditional Chinese',
   de: 'German',
   fr: 'French',
   ja: 'Japanese',
   ko: 'Korean',
   es: 'Spanish',
}

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND'])

function normalizeRegion(value) {
   const key = String(value || 'US')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
   if (REGION_PRESETS[key]) return key
   if (key === 'USA' || key === 'AMERICA') return 'US'
   if (key === 'CHINA' || key === '中国') return 'CN'
   if (key === 'EUROPE' || key === '欧洲') return 'EU'
   if (key === 'SINGAPORE' || key === '东南亚') return 'SEA'
   return 'US'
}

function normalizeLanguage(value, fallback = 'en') {
   const raw = String(value || fallback).trim()
   const key = raw.toLowerCase()
   return LANGUAGE_ALIASES[key] || raw
}

function normalizeCurrency(value, fallback = 'USD') {
   return String(value || fallback)
      .trim()
      .toUpperCase()
      .slice(0, 3)
}

function parseLocaleFromFeishuFields(fields = {}) {
   const region = normalizeRegion(
      fields['目标地区'] || fields['地区'] || fields['市场'] || 'US'
   )
   const preset = REGION_PRESETS[region] || REGION_PRESETS.US
   const language = normalizeLanguage(
      fields['默认语言'] || fields['语言'],
      preset.defaultLanguage
   )
   const currency = normalizeCurrency(fields['货币'], preset.defaultCurrency)
   const timezone = String(fields['时区'] || preset.timezone).trim()

   return {
      language,
      region,
      currency,
      timezone,
      countryCode: preset.countryCode,
      taxRate: preset.taxRate,
      neonRegion: preset.neonRegion,
   }
}

function getAiLanguageName(language) {
   return AI_LANGUAGE_NAMES[language] || language
}

function stripeUnitAmount(price, currency) {
   const amount = Number(price) || 0
   const code = normalizeCurrency(currency)
   if (ZERO_DECIMAL_CURRENCIES.has(code)) return Math.round(amount)
   return Math.round(amount * 100)
}

function formatPriceForPrompt(price, currency) {
   const code = normalizeCurrency(currency)
   if (ZERO_DECIMAL_CURRENCIES.has(code)) return `${code} ${Math.round(Number(price) || 0)}`
   return `${code} ${(Number(price) || 0).toFixed(2)}`
}

module.exports = {
   REGION_PRESETS,
   normalizeRegion,
   normalizeLanguage,
   normalizeCurrency,
   parseLocaleFromFeishuFields,
   getAiLanguageName,
   stripeUnitAmount,
   formatPriceForPrompt,
}
