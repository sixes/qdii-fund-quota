import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const issuers = await prisma.eTFData.findMany({
      select: { issuer: true },
      distinct: ['issuer'],
    })

    const issuerList = issuers
      .map(item => item.issuer)
      .filter(Boolean)
      .sort()

    res.status(200).json({ issuers: issuerList })
  } catch (error) {
    console.error('Error fetching issuers from PostgreSQL:', error)
    res.status(500).json({ error: 'Failed to fetch issuers' })
  } finally {
    await prisma.$disconnect()
  }
}
