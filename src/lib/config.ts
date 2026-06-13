import configData from '../../config.json'

export interface StoreConfig {
   name: string
   description: string
   tagline: string
   brandStory: string
   creator: string
   keywords: string[]
   contactEmail?: string
   telegramLink?: string
   instagramLink?: string
   twitterLink?: string
   facebookLink?: string
   linkedinLink?: string
   tiktokLink?: string
   faq?: string
}

export interface Config {
   store: StoreConfig
   products: any[]
   banners: any[]
}

export const config = configData as Config
