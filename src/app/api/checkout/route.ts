// src/app/api/checkout/route.ts
// Stripe Checkout API 路由

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
   try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY

      if (!stripeSecretKey) {
         return NextResponse.json(
            { error: '支付未配置，请联系店主' },
            { status: 400 }
         )
      }

      const stripe = new Stripe(stripeSecretKey, {
         apiVersion: '2026-05-27.dahlia',
      })

      const { items } = await req.json()

      if (!items || items.length === 0) {
         return NextResponse.json(
            { error: '购物车为空' },
            { status: 400 }
         )
      }

      // 构建 Stripe line_items
      const lineItems = items.map((item: any) => ({
         price_data: {
            currency: 'usd',
            product_data: {
               name: item.title,
               images: item.images?.length > 0 ? [item.images[0]] : [],
               description: item.description || '',
            },
            unit_amount: Math.round(item.price * 100), // Stripe 使用分为单位
         },
         quantity: item.quantity || 1,
      }))

      // 创建 Checkout Session
      const session = await stripe.checkout.sessions.create({
         payment_method_types: ['card'],
         line_items: lineItems,
         mode: 'payment',
         success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
         cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
         metadata: {
            source: 'storefront',
         },
      })

      return NextResponse.json({ url: session.url })
   } catch (error: any) {
      console.error('Stripe checkout error:', error)
      return NextResponse.json(
         { error: error.message },
         { status: 500 }
      )
   }
}
