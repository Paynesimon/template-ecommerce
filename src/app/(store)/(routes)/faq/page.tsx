// src/app/(store)/(routes)/faq/page.tsx
import { config } from '@/lib/config'

export default function FAQPage() {
   return (
      <div className="max-w-3xl mx-auto py-16 space-y-8">
         <h1 className="text-4xl font-bold">FAQ</h1>
         {config.store.faq ? (
            <div className="whitespace-pre-line text-muted-foreground leading-relaxed">
               {config.store.faq}
            </div>
         ) : (
            <div className="space-y-6">
               <div className="space-y-2">
                  <h3 className="font-semibold">How do I place an order?</h3>
                  <p className="text-muted-foreground">Browse our products, add items to your cart, and proceed to checkout.</p>
               </div>
               <div className="space-y-2">
                  <h3 className="font-semibold">What payment methods do you accept?</h3>
                  <p className="text-muted-foreground">We accept major credit cards and other secure payment methods.</p>
               </div>
               <div className="space-y-2">
                  <h3 className="font-semibold">How can I track my order?</h3>
                  <p className="text-muted-foreground">You can track your order in your profile under the Orders section.</p>
               </div>
            </div>
         )}
      </div>
   )
}
