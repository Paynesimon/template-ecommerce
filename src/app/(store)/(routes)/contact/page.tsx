// src/app/(store)/(routes)/contact/page.tsx
import { config } from '@/lib/config'

export default function ContactPage() {
   return (
      <div className="max-w-3xl mx-auto py-16 space-y-8">
         <h1 className="text-4xl font-bold">Contact Us</h1>
         <div className="space-y-4">
            <p className="text-muted-foreground">
               Have a question or need help? We'd love to hear from you.
            </p>
            {config.store.contactEmail && (
               <div className="flex items-center gap-3">
                  <span className="font-medium">Email:</span>
                  <a
                     href={`mailto:${config.store.contactEmail}`}
                     className="text-primary hover:underline"
                  >
                     {config.store.contactEmail}
                  </a>
               </div>
            )}
            {config.store.telegramLink && (
               <div className="flex items-center gap-3">
                  <span className="font-medium">Telegram:</span>
                  <a
                     href={config.store.telegramLink}
                     target="_blank"
                     rel="noreferrer"
                     className="text-primary hover:underline"
                  >
                     Join our Telegram
                  </a>
               </div>
            )}
         </div>
      </div>
   )
}
