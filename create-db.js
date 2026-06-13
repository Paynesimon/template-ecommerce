// create-db.js
// 功能：自动在 Neon 创建新的独立数据库
// 运行方法：node create-db.js 客户ID
// 例如：node create-db.js client002

const NEON_API_KEY = 'napi_leahg3saie54btzit25y1ap4gsljsqvr10fo6go5m8fads46n95cd9mzhc0lc1f4'
const NEON_ORG_ID = 'org-wild-sound-86237677'

async function createDatabase(clientId) {
   const projectName = `shop-${clientId}`

   console.log(`\n🚀 开始为客户 [${clientId}] 创建独立数据库...\n`)

   // 第一步：创建 Neon 项目（每个项目自带一个数据库）
   console.log('📦 创建 Neon 项目...')
   const createRes = await fetch('https://console.neon.tech/api/v2/projects', {
      method: 'POST',
      headers: {
         Authorization: `Bearer ${NEON_API_KEY}`,
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({
         project: {
            name: projectName,
            org_id: NEON_ORG_ID,
            region_id: 'aws-us-east-1',
            pg_version: 16,
         },
      }),
   })

   const data = await createRes.json()

   if (!createRes.ok) {
      throw new Error(`创建数据库失败：${JSON.stringify(data)}`)
   }

   const project = data.project
   const connection = data.connection_uris?.[0]

   if (!connection) {
      throw new Error('未获取到数据库连接字符串')
   }

   const connectionString = connection.connection_uri

   console.log(`✅ 数据库创建成功！`)
   console.log(`📁 项目名称：${project.name}`)
   console.log(`🆔 项目 ID：${project.id}`)
   console.log(`🔗 连接字符串：${connectionString}`)

   return {
      projectId: project.id,
      projectName: project.name,
      connectionString,
   }
}

// 主函数
async function main() {
   const clientId = process.argv[2]

   if (!clientId) {
      console.error('❌ 请提供客户ID，例如：node create-db.js client002')
      process.exit(1)
   }

   try {
      const db = await createDatabase(clientId)
      console.log(`\n🎉 完成！连接字符串已准备好：`)
      console.log(db.connectionString)
   } catch (error) {
      console.error('❌ 出错了：', error.message)
   }
}

main()
