import React, { useState } from 'react';
import { Send, User, Coins, AlertCircle } from 'lucide-react';

export default function TransferForm({ tokens, onTransfer, loading }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState(tokens[0]?.address || '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!recipient || !amount || !token) {
      setError('All fields are required.');
      return;
    }
    onTransfer({ recipient, amount, token, setError });
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-secondary-500/20 text-secondary-400">
          <Send size={24} />
        </div>
        <h3 className="text-lg font-bold text-white">Transfer Tokens</h3>
      </div>

      <div className="space-y-4 flex-grow">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 ml-1">Recipient Address</label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="glass-input w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-600"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="0x..."
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 ml-1">Amount</label>
            <div className="relative">
              <Coins size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="glass-input w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-600"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.0"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 ml-1">Token</label>
            <select
              className="glass-input w-full px-4 py-3 rounded-xl text-sm text-white bg-slate-900/50 appearance-none cursor-pointer"
              value={token}
              onChange={e => setToken(e.target.value)}
              disabled={loading}
            >
              {tokens.map(t => (
                <option key={t.address} value={t.address} className="bg-slate-800 text-white">
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg animate-pulse">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      <button
        type="submit"
        className={`mt-6 w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${loading
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
            : 'glass-button'
          }`}
        disabled={loading}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
            Processing...
          </>
        ) : (
          <>
            <Send size={16} />
            Transfer Funds
          </>
        )}
      </button>
    </form>
  );
}
