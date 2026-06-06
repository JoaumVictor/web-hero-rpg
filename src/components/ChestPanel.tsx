interface Props {
  onClose: () => void
}

export default function ChestPanel({ onClose }: Props) {
  return (
    <div className="flex flex-col bg-gray-900 border border-yellow-900/40 rounded-lg p-3 gap-3 w-52 self-start">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChestIcon className="text-yellow-500/70" />
          <span className="text-yellow-500/80 font-mono text-sm font-bold tracking-wider">BÁU</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-300 text-xs leading-none px-1 py-0.5 rounded hover:bg-gray-800 transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: 20 }).map((_, i) => (
          <Slot key={i} />
        ))}
      </div>
      <p className="text-gray-600 text-xs font-mono text-center">20 slots</p>
    </div>
  )
}

function Slot() {
  return (
    <div className="w-10 h-10 bg-gray-800/80 border border-gray-700/60 rounded hover:border-yellow-500/30 hover:bg-gray-750 transition-colors cursor-pointer" />
  )
}

function ChestIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor" className={className}>
      <rect x="1" y="6" width="16" height="7" rx="1" />
      <rect x="1" y="1" width="16" height="6" rx="1" />
      <rect x="7" y="4" width="4" height="4" rx="1" fill="#1f2937" />
      <rect x="8" y="5" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5" />
    </svg>
  )
}
