import React, { useEffect, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export default function TokenSelect({ tokens = [], value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    function onDoc(e) {
      if (!e.target.closest('.token-select')) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const selected = tokens.find(t => t.address === value)
  const filteredTokens = tokens.filter(t =>
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="token-select relative min-w-[140px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-slate-600 rounded-xl px-3 py-2 flex justify-between items-center transition-all duration-200 group"
      >
        <div className="flex items-center gap-2">
          {selected ? (
            <>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                {selected.symbol.slice(0, 2)}
              </div>
              <span className="font-bold text-white">{selected.symbol}</span>
            </>
          ) : (
            <span className="text-slate-400 font-medium">Select</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''} group-hover:text-white`} />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fade-in">
          <div className="p-2 border-b border-slate-700/50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tokens"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {filteredTokens.length > 0 ? (
              filteredTokens.map(t => (
                <button
                  key={t.address}
                  onClick={() => { onChange(t.address); setOpen(false); setSearch('') }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-700/50 flex items-center gap-3 transition-colors ${t.address === value ? 'bg-slate-700/30' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-600">
                    {t.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{t.symbol}</div>
                    <div className="text-xs text-slate-400">{t.name}</div>
                  </div>
                  {t.address === value && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]"></div>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-center text-sm text-slate-500">
                No tokens found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
