import { config } from './config'

export interface LocaleConfig {
   language: string
   region: string
   currency: string
   timezone: string
   countryCode: string
   taxRate: number
}

const DEFAULT_LOCALE: LocaleConfig = {
   language: 'en',
   region: 'US',
   currency: 'USD',
   timezone: 'America/New_York',
   countryCode: 'US',
   taxRate: 0.09,
}

export function getLocale(): LocaleConfig {
   const fromConfig = config.locale

   return {
      ...DEFAULT_LOCALE,
      ...fromConfig,
      language:
         process.env.NEXT_PUBLIC_LOCALE ||
         fromConfig?.language ||
         DEFAULT_LOCALE.language,
      region:
         process.env.NEXT_PUBLIC_REGION ||
         fromConfig?.region ||
         DEFAULT_LOCALE.region,
      currency: (
         process.env.NEXT_PUBLIC_CURRENCY ||
         fromConfig?.currency ||
         DEFAULT_LOCALE.currency
      ).toUpperCase(),
      timezone:
         process.env.STORE_TIMEZONE ||
         fromConfig?.timezone ||
         DEFAULT_LOCALE.timezone,
      countryCode:
         process.env.NEXT_PUBLIC_COUNTRY_CODE ||
         fromConfig?.countryCode ||
         DEFAULT_LOCALE.countryCode,
      taxRate: Number(
         process.env.NEXT_PUBLIC_TAX_RATE ??
            fromConfig?.taxRate ??
            DEFAULT_LOCALE.taxRate
      ),
   }
}

export function getHtmlLang(): string {
   return getLocale().language
}

export function getStripeCurrency(): string {
   return getLocale().currency.toLowerCase()
}

export function getTaxRate(): number {
   return getLocale().taxRate
}

export function formatMoney(amount: number): string {
   const { currency, language } = getLocale()
   try {
      return new Intl.NumberFormat(language, {
         style: 'currency',
         currency,
      }).format(amount)
   } catch {
      return `${currency} ${amount.toFixed(2)}`
   }
}

export function toStripeUnitAmount(price: number): number {
   const currency = getLocale().currency
   if (currency === 'JPY' || currency === 'KRW' || currency === 'VND') {
      return Math.round(price)
   }
   return Math.round(price * 100)
}
