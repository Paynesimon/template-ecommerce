'use client'

import { Separator } from '@/components/native/separator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { useAuthenticated } from '@/hooks/useAuthentication'
import { formatMoney, getTaxRate } from '@/lib/locale'
import { isVariableValid } from '@/lib/utils'
import { useCartContext } from '@/state/Cart'
import { useState } from 'react'

export function Receipt() {
   const { authenticated } = useAuthenticated()
   const { loading, cart } = useCartContext()
   const [checkoutLoading, setCheckoutLoading] = useState(false)
   const [error, setError] = useState('')

   function calculatePayableCost() {
      let totalAmount = 0,
         discountAmount = 0

      if (isVariableValid(cart?.items)) {
         for (const item of cart?.items) {
            totalAmount += item?.count * item?.product?.price
            discountAmount += item?.count * item?.product?.discount
         }
      }

      const afterDiscountAmount = totalAmount - discountAmount
      const taxAmount = afterDiscountAmount * getTaxRate()
      const payableAmount = afterDiscountAmount + taxAmount

      return {
         totalAmount: formatMoney(totalAmount),
         discountAmount: formatMoney(discountAmount),
         afterDiscountAmount: formatMoney(afterDiscountAmount),
         taxAmount: formatMoney(taxAmount),
         payableAmount: formatMoney(payableAmount),
      }
   }

   async function handleCheckout() {
      if (!authenticated) {
         window.location.href = '/login'
         return
      }

      try {
         setCheckoutLoading(true)
         setError('')

         // 构建购物车商品列表
         const items = cart?.items?.map((item: any) => ({
            title: item?.product?.title,
            price: item?.product?.price,
            quantity: item?.count,
            images: item?.product?.images || [],
            description: item?.product?.description || '',
         }))

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
         setCheckoutLoading(false)
      }
   }

   const cartEmpty = !isVariableValid(cart?.items) || cart?.items?.length === 0

   return (
      <Card className={loading ? 'animate-pulse' : ''}>
         <CardHeader className="p-4 pb-0">
            <h2 className="font-bold tracking-tight">Receipt</h2>
         </CardHeader>
         <CardContent className="p-4 text-sm">
            <div className="block space-y-[1vh]">
               <div className="flex justify-between">
                  <p>Total Amount</p>
                  <h3>{calculatePayableCost().totalAmount}</h3>
               </div>
               <div className="flex justify-between">
                  <p>Discount Amount</p>
                  <h3>{calculatePayableCost().discountAmount}</h3>
               </div>
               <div className="flex justify-between">
                  <p>Tax Amount</p>
                  <h3>{calculatePayableCost().taxAmount}</h3>
               </div>
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between">
               <p>Payable Amount</p>
               <h3>{calculatePayableCost().payableAmount}</h3>
            </div>
            {error && (
               <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
         </CardContent>
         <Separator />
         <CardFooter>
            <Button
               disabled={cartEmpty || checkoutLoading}
               className="w-full"
               onClick={handleCheckout}
            >
               {checkoutLoading ? '处理中...' : 'Checkout'}
            </Button>
         </CardFooter>
      </Card>
   )
}
