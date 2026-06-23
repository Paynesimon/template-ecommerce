import { JsonLd } from '@/components/native/JsonLd'
import { buildFaqPageSchema } from '../../../../../geo'
import { config } from '@/lib/config'
import type { Metadata } from 'next'

export const metadata: Metadata = {
   title: `FAQ | ${config.store.name}`,
   description: `Frequently asked questions about ${config.store.name}.`,
}

const DEFAULT_FAQ = [
   {
      question: 'How do I place an order?',
      answer: 'Browse our products, add items to your cart, and proceed to checkout.',
   },
   {
      question: 'What payment methods do you accept?',
      answer: 'We accept major credit cards and other secure payment methods.',
   },
   {
      question: 'How can I track my order?',
      answer: 'You can track your order in your profile under the Orders section.',
   },
]

export default function FAQPage() {
   const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
   let faqSchema = buildFaqPageSchema(config.store, siteUrl)

   if (!faqSchema && siteUrl) {
      faqSchema = {
         '@context': 'https://schema.org',
         '@type': 'FAQPage',
         mainEntity: DEFAULT_FAQ.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: { '@type': 'Answer', text: answer },
         })),
      }
   }

   return (
      <>
         {faqSchema && <JsonLd data={faqSchema} />}
         <div className="max-w-3xl mx-auto py-16 space-y-8">
            <h1 className="text-4xl font-bold">FAQ</h1>
            {config.store.faq ? (
               <div className="whitespace-pre-line text-muted-foreground leading-relaxed">
                  {config.store.faq}
               </div>
            ) : (
               <div className="space-y-6">
                  {DEFAULT_FAQ.map(({ question, answer }) => (
                     <div className="space-y-2" key={question}>
                        <h3 className="font-semibold">{question}</h3>
                        <p className="text-muted-foreground">{answer}</p>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </>
   )
}
