import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { fund_company, fund_name, fund_code } = req.query

  const where: any = {}
  if (fund_company) where.fund_company = { contains: fund_company as string }
  if (fund_name) where.fund_name = { contains: fund_name as string }
  if (fund_code) where.fund_code = { contains: fund_code as string }

  const quotas = await prisma.fundQuota.findMany({
    where,
    orderBy: { fund_company: 'asc' }
  })

  res.status(200).json(quotas)
}
