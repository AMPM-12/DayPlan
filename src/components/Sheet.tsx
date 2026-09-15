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
        className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-slate-900"
        // willChange: 'transform' promotes this scroll container to its own
        // compositor layer up front, rather than iOS Safari deciding to
        // (re)composite it lazily — the classic mitigation for the nested
        // -webkit-overflow-scrolling "touch dead zone" bug class, applied
        // here even though that property itself isn't used anywhere in this
        // codebase (verified). Unconfirmed on-device as of this commit —
        // this is the one scrollable container in the app that's actually a
        // nested overflow:auto region rather than plain page scroll, so if
        // that bug class is real anywhere here, it's here.
        style={{ maxHeight: '85vh', overflowY: 'auto', willChange: 'transform' }}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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
