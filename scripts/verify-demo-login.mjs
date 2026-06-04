import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import bcrypt from "bcryptjs"
import pg from "pg"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
dotenv.config({ path: path.join(root, ".env.local") })
dotenv.config({ path: path.join(root, ".env") })

const url = process.env.DATABASE_URL
if (!url) {
  console.error("FAIL: DATABASE_URL missing")
  process.exit(1)
}

const host = url.match(/@([^/]+)/)?.[1] ?? "?"
console.log("DATABASE_URL host:", host)

const client = new pg.Client({ connectionString: url })
await client.connect()

const { rows } = await client.query(
  `SELECT username, "passwordHash" IS NOT NULL AS has_hash,
          "twoFactorEnabled", "twoFactorSecret" IS NOT NULL AS has_totp_secret
   FROM "User" WHERE username IN ('demo', 'demo2') ORDER BY username`
)

if (rows.length === 0) {
  console.error("FAIL: no demo users in DB — run: npm run setup:dev")
  await client.end()
  process.exit(1)
}

for (const row of rows) {
  const userRes = await client.query(`SELECT "passwordHash" FROM "User" WHERE username = $1`, [
    row.username,
  ])
  const hash = userRes.rows[0]?.passwordHash
  const match = hash ? await bcrypt.compare("demo1234", hash) : false
  console.log(
    JSON.stringify({
      username: row.username,
      has_hash: row.has_hash,
      password_demo1234: match,
      twoFactorEnabled: row.twoFactorEnabled,
      has_totp_secret: row.has_totp_secret,
    })
  )
}

await client.end()
console.log("OK: DB check done")
