import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { fund_company, fund_name, fund_code, country } = req.query

  const whereParts: string[] = []
  if (fund_company) whereParts.push(`fund_company LIKE '%${fund_company}%'`)
  if (fund_name) whereParts.push(`fund_name LIKE '%${fund_name}%'`)
  if (fund_code) whereParts.push(`fund_code LIKE '%${fund_code}%'`)
  if (country) whereParts.push(`fund_name LIKE '%${country}%'`)

  const whereClause = whereParts.length > 0 ? whereParts.join(' AND ') : '1=1'
  const quotas = await prisma.$queryRawUnsafe(`SELECT * FROM fund_quota WHERE ${whereClause}`)

  res.status(200).json(quotas)
}
