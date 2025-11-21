import React, { useEffect, useState } from 'react'

export default function TokenSelect({ tokens = [], value, onChange }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onDoc(e) {
      if (!e.target.closest('.token-select')) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const selected = tokens.find(t => t.address === value)

  return (
    <div className="token-select relative w-full">
      <button type="button" onClick={() => setOpen(!open)} className="w-full border rounded px-3 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-sm">{selected?.symbol?.slice(0,2) || '?'}</div>
          <div className="text-left">
            <div className="text-sm font-medium">{selected?.symbol || 'Select'}</div>
            <div className="text-xs text-slate-500">{selected?.name || ''}</div>
          </div>
        </div>
        <div className="text-sm text-slate-500">▾</div>
      </button>

      {open && (
        <div className="absolute z-10 mt-2 w-full bg-white border rounded shadow p-2 max-h-60 overflow-auto">
          {tokens.map(t => (
            <button key={t.address} onClick={() => { onChange(t.address); setOpen(false) }} className="w-full text-left px-2 py-2 hover:bg-slate-50 rounded flex items-center">
              <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-sm mr-3">{t.symbol?.slice(0,2) || '?'}</div>
              <div>
                <div className="text-sm font-medium">{t.symbol}</div>
                <div className="text-xs text-slate-500">{t.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
