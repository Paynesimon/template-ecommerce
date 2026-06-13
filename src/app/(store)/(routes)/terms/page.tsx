// src/app/(store)/(routes)/terms/page.tsx
import { config } from '@/lib/config'

export default function TermsPage() {
   return (
      <div className="max-w-3xl mx-auto py-16 space-y-8">
         <h1 className="text-4xl font-bold">Terms & Conditions</h1>
         <div className="space-y-6 text-muted-foreground">
            <p>Last updated: {new Date().getFullYear()}</p>
            <div className="space-y-4">
               <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
               <p>By accessing and using {config.store.name}, you agree to be bound by these Terms and Conditions.</p>
            </div>
            <div className="space-y-4">
               <h2 className="text-xl font-semibold text-foreground">2. Products and Services</h2>
               <p>We reserve the right to modify or discontinue any product or service without notice.</p>
            </div>
            <div className="space-y-4">
               <h2 className="text-xl font-semibold text-foreground">3. Payment</h2>
               <p>All payments are processed securely. We accept major credit cards and other payment methods.</p>
            </div>
            <div className="space-y-4">
               <h2 className="text-xl font-semibold text-foreground">4. Contact</h2>
               <p>For questions about these terms, contact us at {config.store.contactEmail || 'our support team'}.</p>
            </div>
         </div>
      </div>
   )
}
