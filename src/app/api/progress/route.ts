import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session')
  if (!sessionId) return NextResponse.json({ coins: 0 })

  try {
    const row = await db.playerProgress.findUnique({ where: { sessionId } })
    return NextResponse.json({ coins: row?.coins ?? 0 })
  } catch {
    return NextResponse.json({ coins: 0 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, coins } = (await req.json()) as { session: string; coins: number }
    if (!session || typeof coins !== 'number') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    await db.playerProgress.upsert({
      where:  { sessionId: session },
      update: { coins },
      create: { sessionId: session, coins },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
