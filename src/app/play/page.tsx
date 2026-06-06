import GameCanvas from '@/components/GameCanvas'

export default function PlayPage() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-white text-2xl font-mono font-bold tracking-widest">HERO RPG</h1>
      <GameCanvas />
    </main>
  )
}
