// TEMPORARY — see src/utils/dragDebug.ts. Delete both once the
// drag-and-drop investigation is resolved.
import { useEffect, useState } from 'react'
import {
  clearDragDebugEntries,
  getDragDebugEntries,
  isDragDebugEnabled,
  setDragDebugEnabled,
  subscribeDragDebug,
} from '../utils/dragDebug'

export function DragDebugOverlay() {
  const [enabled, setEnabled] = useState(isDragDebugEnabled())
  const [entries, setEntries] = useState(getDragDebugEntries())
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    return subscribeDragDebug(() => {
      setEnabled(isDragDebugEnabled())
      setEntries(getDragDebugEntries())
    })
  }, [])

  if (!enabled) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 'max(0.5rem, env(safe-area-inset-top))',
        left: '0.5rem',
        right: '0.5rem',
        zIndex: 9999,
        fontFamily: 'ui-monospace, monospace',
        fontSize: '10px',
        lineHeight: 1.35,
        background: 'rgba(15,15,20,0.92)',
        color: '#7CFC7C',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.15)',
          color: '#fff',
        }}
      >
        <span onClick={() => setCollapsed((v) => !v)} style={{ fontWeight: 700 }}>
          🐛 drag debug ({entries.length}) {collapsed ? '▸' : '▾'}
        </span>
        <span style={{ display: 'flex', gap: '10px' }}>
          <span onClick={() => clearDragDebugEntries()}>clear</span>
          <span onClick={() => setDragDebugEnabled(false)}>close</span>
        </span>
      </div>
      {!collapsed && (
        <div style={{ maxHeight: '38vh', overflowY: 'auto', padding: '4px 8px' }}>
          {entries.length === 0 ? (
            <div style={{ color: '#888' }}>no events yet — press a row or its handle</div>
          ) : (
            entries
              .slice()
              .reverse()
              .map((e, i) => (
                <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {e.time} {e.msg}
                </div>
              ))
          )}
        </div>
      )}
    </div>
  )
}
