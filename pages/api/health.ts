import type { NextApiRequest, NextApiResponse } from 'next'

type HealthResponse = {
  status: 'ok'
  timestamp: string
  uptime: number
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  // Simple health check endpoint for Netlify
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
}