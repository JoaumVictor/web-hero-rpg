import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const level = await db.level.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      number: true,
      recommendedLevel: true,
      zone: { select: { name: true, world: { select: { name: true } } } },
    },
  })

  if (!level) {
    return NextResponse.json({ error: 'Level not found' }, { status: 404 })
  }

  return NextResponse.json(level)
}
