import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
   apiVersion: '2026-05-27.dahlia' as any,
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
   try {
      const body = await req.text()
      const signature = req.headers.get('stripe-signature')!

      let event: any
      try {
         event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      } catch (err) {
         console.error('Webhook 签名验证失败:', err)
         return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }

      if (event.type === 'checkout.session.completed') {
         const session: any = event.data.object

         const lineItems = await (stripe.checkout.sessions as any).listLineItems(session.id, {
            expand: ['data.price.product'],
         })

         const customerEmail = session.customer_details?.email
         if (!customerEmail) {
            return NextResponse.json({ received: true })
         }

         const user = await prisma.user.upsert({
            where: { email: customerEmail.toLowerCase() },
            update: {},
            create: {
               email: customerEmail.toLowerCase(),
               cart: { create: {} },
            },
         })

         const paymentProvider = await prisma.paymentProvider.upsert({
            where: { title: 'Stripe' },
            update: { isActive: true },
            create: { title: 'Stripe', description: 'Stripe Payment', isActive: true },
         })

         const totalAmount = (session.amount_total || 0) / 100

         const order = await prisma.order.create({
            data: {
               status: 'Processing',
               total: totalAmount,
               payable: totalAmount,
               shipping: 0,
               tax: totalAmount * 0.09,
               discount: 0,
               isPaid: true,
               user: { connect: { id: user.id } },
               payments: {
                  create: {
                     status: 'Paid',
                     isSuccessful: true,
                     payable: totalAmount,
                     refId: session.payment_intent || session.id,
                     user: { connect: { id: user.id } },
                     provider: { connect: { id: paymentProvider.id } },
                  },
               },
            },
         })

         for (const item of lineItems.data) {
            const productName = item.price?.product?.name
            if (!productName) continue

            const product = await prisma.product.findFirst({
               where: { title: { contains: productName, mode: 'insensitive' } },
            })

            if (product) {
               await prisma.orderItem.create({
                  data: {
                     order: { connect: { id: order.id } },
                     product: { connect: { id: product.id } },
                     count: item.quantity || 1,
                     price: (item.price?.unit_amount || 0) / 100,
                     discount: 0,
                  },
               })
            }
         }

         await prisma.cartItem.deleteMany({ where: { cartId: user.id } })
         console.log(`✅ 订单创建成功：${order.id}`)
      }

      return NextResponse.json({ received: true })
   } catch (error: any) {
      console.error('Webhook 处理失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
   }
}
