import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import Fuse from 'fuse.js'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { fund_company, fund_name, fund_code, country } = req.query

  const whereParts: string[] = []
  if (fund_company) whereParts.push(`fund_company LIKE '%${fund_company}%'`)
  if (fund_code) whereParts.push(`fund_code LIKE '%${fund_code}%'`)
  if (country) whereParts.push(`fund_name LIKE '%${country}%'`)

  const whereClause = whereParts.length > 0 ? whereParts.join(' AND ') : '1=1'
  let quotas = await prisma.$queryRawUnsafe(`SELECT * FROM fund_quota WHERE ${whereClause}`)

  if (fund_name) {
    const fuse = new Fuse(quotas, {
      keys: ['fund_name'],
      threshold: 0.4, // adjust for strictness
    })
    quotas = fuse.search(fund_name as string).map(result => result.item)
  }

  res.status(200).json(quotas)
}
