import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const REQUIRED = ['idle-1.png', 'walk-1.png', 'attack-1.png', 'death-1.png']

function scanSets(type: string): string[] {
  const dir = path.join(process.cwd(), 'public', 'assets', type)
  if (!fs.existsSync(dir)) return []

  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(name => {
      const folder = path.join(dir, name)
      return REQUIRED.every(f => fs.existsSync(path.join(folder, f)))
    })
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') ?? 'heroes'
  if (!['heroes', 'creatures'].includes(type)) {
    return NextResponse.json({ error: 'type must be heroes or creatures' }, { status: 400 })
  }
  const sets = scanSets(type)
  return NextResponse.json(sets)
}
