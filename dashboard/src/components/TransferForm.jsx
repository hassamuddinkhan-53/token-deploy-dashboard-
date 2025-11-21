import React, { useState } from 'react';

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
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 border border-blue-100 flex flex-col gap-2 transition-all duration-300">
      <label className="text-xs font-semibold">Recipient</label>
      <input
        className="border rounded px-2 py-1 text-sm"
        value={recipient}
        onChange={e => setRecipient(e.target.value)}
        placeholder="0x..."
        disabled={loading}
      />
      <label className="text-xs font-semibold">Amount</label>
      <input
        className="border rounded px-2 py-1 text-sm"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="Amount"
        disabled={loading}
      />
      <label className="text-xs font-semibold">Token</label>
      <select
        className="border rounded px-2 py-1 text-sm"
        value={token}
        onChange={e => setToken(e.target.value)}
        disabled={loading}
      >
        {tokens.map(t => (
          <option key={t.address} value={t.address}>{t.symbol}</option>
        ))}
      </select>
      {error && <div className="text-red-500 text-xs animate-pulse">{error}</div>}
      <button
        type="submit"
        className={`mt-2 bg-blue-600 text-white rounded px-4 py-2 font-bold transition-all duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
        disabled={loading}
      >
        {loading ? 'Transferring...' : 'Transfer'}
      </button>
    </form>
  );
}
