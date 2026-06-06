import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const level = await db.level.findUnique({
    where: { id },
    include: {
      round: {
        include: {
          waves: {
            orderBy: { order: 'asc' },
            include: {
              monsters: {
                include: {
                  monster: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!level) {
    return NextResponse.json({ error: 'Level not found' }, { status: 404 })
  }

  return NextResponse.json(level.round.waves)
}
