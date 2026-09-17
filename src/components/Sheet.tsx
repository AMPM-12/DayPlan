import type { ReactNode } from 'react'

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md rounded-t-3xl bg-cream p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-charcoal/10" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-charcoal/5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
