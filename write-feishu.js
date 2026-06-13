// write-feishu.js
// 功能：把网站地址回写到飞书店铺信息表
// 这个函数会被集成到 main.js 里

const FEISHU_APP_ID = 'cli_aaaa4e460f781bc3'
const FEISHU_APP_SECRET = 'jQHMKcQLlr4h0pbHDYQi7EIjFIohtsbl'
const FEISHU_APP_TOKEN = 'Txeab1NDVaBiNssZ9mIc2fwmngo'
const STORE_TABLE_ID = 'tblAn8PI1eoduVkn'

async function getFeishuToken() {
   const res = await fetch(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            app_id: FEISHU_APP_ID,
            app_secret: FEISHU_APP_SECRET,
         }),
      }
   )
   const data = await res.json()
   return data.tenant_access_token
}

async function writeBackToFeishu(recordId, siteUrl, clientId) {
   const token = await getFeishuToken()

   const res = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${STORE_TABLE_ID}/records/${recordId}`,
      {
         method: 'PUT',
         headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({
            fields: {
               网站地址: { link: siteUrl, text: siteUrl },
               部署状态: `✅ 已上线 - ${new Date().toLocaleString('zh-CN')}`,
            },
         }),
      }
   )

   const data = await res.json()
   if (data.code === 0) {
      console.log(`✅  飞书回写成功！`)
      console.log(`    网站地址：${siteUrl}`)
   } else {
      throw new Error(`飞书回写失败：${JSON.stringify(data)}`)
   }
}

// 测试运行
async function main() {
   await writeBackToFeishu(
      'recvly91Z4cxqw',
      'https://site-client001.vercel.app',
      'client001'
   )
}

main().catch(console.error)
