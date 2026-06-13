// src/app/(store)/(routes)/checkout/success/page.tsx
// 支付成功页面

export default function SuccessPage() {
   return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
         <div className="text-6xl">🎉</div>
         <h1 className="text-3xl font-bold">支付成功！</h1>
         <p className="text-gray-500 text-center max-w-md">
            感谢您的购买！我们已收到您的订单，将尽快为您发货。
         </p>
         <a
            href="/"
            className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition"
         >
            继续购物
         </a>
      </div>
   )
}
