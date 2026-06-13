// src/app/(store)/(routes)/about/page.tsx
import { config } from '@/lib/config'

export default function AboutPage() {
   return (
      <div className="max-w-3xl mx-auto py-16 space-y-8">
         <h1 className="text-4xl font-bold">{config.store.name}</h1>
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
      </div>
   )
}
