// src/app/(store)/(routes)/cart/components/checkout-button.tsx
// 结账按钮组件

'use client'

import { useState } from 'react'

interface CartItem {
   id: string
   title: string
   price: number
   quantity: number
   images: string[]
   description?: string
}

interface CheckoutButtonProps {
   items: CartItem[]
}

export default function CheckoutButton({ items }: CheckoutButtonProps) {
   const [loading, setLoading] = useState(false)
   const [error, setError] = useState('')

   const handleCheckout = async () => {
      try {
         setLoading(true)
         setError('')

         const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
         })

         const data = await response.json()

         if (!response.ok) {
            setError(data.error || '支付失败，请重试')
            return
         }

         // 跳转到 Stripe 支付页面
         if (data.url) {
            window.location.href = data.url
         }
      } catch (err) {
         setError('网络错误，请重试')
      } finally {
         setLoading(false)
      }
   }

   return (
      <div className="flex flex-col gap-2">
         {error && (
            <p className="text-red-500 text-sm">{error}</p>
         )}
         <button
            onClick={handleCheckout}
            disabled={loading || items.length === 0}
            className="w-full bg-black text-white py-3 px-6 rounded-md hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
         >
            {loading ? '处理中...' : '立即结账'}
         </button>
      </div>
   )
}
