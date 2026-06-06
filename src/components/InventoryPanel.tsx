interface Props {
  onClose: () => void
}

export default function InventoryPanel({ onClose }: Props) {
  return (
    <div className="flex flex-col bg-gray-900 border border-blue-900/40 rounded-b p-3 gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackpackIcon className="text-blue-400/70" />
          <span className="text-blue-400/80 font-mono text-sm font-bold tracking-wider">MOCHILA</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-300 text-xs leading-none px-1 py-0.5 rounded hover:bg-gray-800 transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-10 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-800/80 border border-gray-700/60 rounded hover:border-blue-400/30 transition-colors cursor-pointer"
          />
        ))}
      </div>
    </div>
  )
}

function BackpackIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" className={className}>
      <rect x="1" y="5" width="12" height="10" rx="2" />
      <path d="M4 5 Q7 2 10 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <rect x="5" y="9" width="4" height="2.5" rx="1" fill="#1f2937" />
    </svg>
  )
}
