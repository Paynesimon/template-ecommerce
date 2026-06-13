// src/app/(store)/(routes)/telegram/page.tsx
import { config } from '@/lib/config'
import { redirect } from 'next/navigation'

export default function TelegramPage() {
   if (config.store.telegramLink) {
      redirect(config.store.telegramLink)
   }

   return (
      <div className="max-w-3xl mx-auto py-16 space-y-8 text-center">
         <h1 className="text-4xl font-bold">Join Our Community</h1>
         <p className="text-muted-foreground">
            Follow us on social media to stay updated with our latest products and offers.
         </p>
      </div>
   )
}
