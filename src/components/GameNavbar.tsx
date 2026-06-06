import Link from 'next/link'

interface Props {
  chestOpen: boolean
  inventoryOpen: boolean
  onChestToggle: () => void
  onInventoryToggle: () => void
}

export default function GameNavbar({
  chestOpen,
  inventoryOpen,
  onChestToggle,
  onInventoryToggle,
}: Props) {
  return (
    <div className="flex gap-2 px-3 py-2 bg-gray-900 border-t border-gray-800">
      <NavButton
        active={chestOpen}
        onClick={onChestToggle}
        activeColor="yellow"
        label="BÁU"
        icon={<ChestIcon />}
      />
      <NavButton
        active={inventoryOpen}
        onClick={onInventoryToggle}
        activeColor="blue"
        label="MOCHILA"
        icon={<BackpackIcon />}
      />
      <Link
        href="/map"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono tracking-wide transition-all border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300"
      >
        <MapIcon />
        MAPA
      </Link>
    </div>
  )
}

function NavButton({
  active,
  onClick,
  activeColor,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  activeColor: 'yellow' | 'blue'
  label: string
  icon: React.ReactNode
}) {
  const colors = {
    yellow: active
      ? 'border-yellow-600/60 bg-yellow-500/10 text-yellow-400'
      : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300',
    blue: active
      ? 'border-blue-600/60 bg-blue-500/10 text-blue-400'
      : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300',
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono tracking-wide transition-all ${colors[activeColor]}`}
    >
      {icon}
      {label}
    </button>
  )
}

function ChestIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 18 14" fill="currentColor">
      <rect x="1" y="6" width="16" height="7" rx="1" />
      <rect x="1" y="1" width="16" height="6" rx="1" />
      <rect x="7" y="4" width="4" height="4" rx="1" fill="#111827" />
      <rect x="8" y="5" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

function BackpackIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 14 16" fill="currentColor">
      <rect x="1" y="5" width="12" height="10" rx="2" />
      <path d="M4 5 Q7 2 10 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <rect x="5" y="9" width="4" height="2.5" rx="1" fill="#111827" />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 16 14" fill="currentColor">
      <polygon points="0,1 5,3 11,0 16,2 16,13 11,11 5,14 0,12" opacity="0.9" />
      <line x1="5" y1="3" x2="5" y2="14" stroke="#111827" strokeWidth="1" />
      <line x1="11" y1="0" x2="11" y2="11" stroke="#111827" strokeWidth="1" />
    </svg>
  )
}
