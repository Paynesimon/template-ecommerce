import { config } from '@/lib/config'
import type { Metadata } from 'next'

export const metadata: Metadata = {
   title: `About | ${config.store.name}`,
   description: config.store.brandStory
      ? config.store.brandStory.slice(0, 160)
      : `Learn about ${config.store.name} — ${config.store.description}`,
}

export default function AboutPage() {
   return (
      <div className="max-w-3xl mx-auto py-16 space-y-8">
            <h1 className="text-4xl font-bold">{config.store.name}</h1>
            {config.store.tagline && (
               <p className="text-lg text-muted-foreground">{config.store.tagline}</p>
            )}
            <div className="prose dark:prose-invert max-w-none">
               {config.store.brandStory ? (
                  <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                     {config.store.brandStory}
                  </p>
               ) : (
                  <p className="text-lg text-muted-foreground">
                     Welcome to {config.store.name}. We are dedicated to bringing you the best products.
                  </p>
               )}
            </div>
            {config.store.contactEmail && (
               <p className="text-sm text-muted-foreground">
                  Contact:{' '}
                  <a href={`mailto:${config.store.contactEmail}`} className="underline">
                     {config.store.contactEmail}
                  </a>
               </p>
            )}
      </div>
   )
}
