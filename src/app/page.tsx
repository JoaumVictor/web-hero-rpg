'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPlayerId, saveSession } from '@/lib/session'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (getPlayerId()) router.replace('/play')
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        setError(msg ?? 'Erro ao entrar')
        return
      }
      const { playerId, email: confirmedEmail, coins } = await res.json()
      saveSession(playerId, confirmedEmail, coins)
      router.push('/play')
    } catch {
      setError('Não foi possível conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-yellow-400 font-mono font-bold text-3xl tracking-widest">HERO RPG</h1>
        <p className="text-gray-500 font-mono text-sm">idle adventure</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 w-72 bg-gray-900 border border-gray-800 rounded-lg p-6"
      >
        <label className="text-gray-400 font-mono text-xs tracking-wider">SEU EMAIL</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
          required
          autoFocus
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white font-mono text-sm
                     focus:outline-none focus:border-yellow-600/60 placeholder:text-gray-600"
        />
        {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-1 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/40
                     text-yellow-400 font-mono font-bold text-sm tracking-widest rounded
                     transition-colors disabled:opacity-50"
        >
          {loading ? 'ENTRANDO...' : 'JOGAR'}
        </button>
      </form>

      <p className="text-gray-700 font-mono text-xs">
        Sem senha. Só o email.
      </p>
    </main>
  )
}
