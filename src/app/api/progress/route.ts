import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const playerId = req.nextUrl.searchParams.get('player')
  const sessionId = req.nextUrl.searchParams.get('session')

  try {
    if (playerId) {
      const row = await db.player.findUnique({ where: { id: playerId } })
      return NextResponse.json({ coins: row?.coins ?? 0 })
    }
    if (sessionId) {
      const row = await db.playerProgress.findUnique({ where: { sessionId } })
      return NextResponse.json({ coins: row?.coins ?? 0 })
    }
  } catch {}

  return NextResponse.json({ coins: 0 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const coins = typeof body.coins === 'number' ? body.coins : 0

    if (body.player) {
      await db.player.update({ where: { id: body.player }, data: { coins } })
      return NextResponse.json({ ok: true })
    }

    if (body.session) {
      await db.playerProgress.upsert({
        where: { sessionId: body.session },
        update: { coins },
        create: { sessionId: body.session, coins },
      })
      return NextResponse.json({ ok: true })
    }
  } catch {}

  return NextResponse.json({ ok: false }, { status: 400 })
}
