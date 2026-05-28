import { useState } from 'react';
import api from '../api';

const QUICK_AMOUNTS = [5, 10, 25, 50];

export default function DonateButton({ className = 'btn btn-primary', label = 'Donate' }) {
  const [open,      setOpen]      = useState(false);
  const [selected,  setSelected]  = useState(10);
  const [custom,    setCustom]    = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  function close() {
    setOpen(false);
    setError(null);
    setCustom('');
    setSelected(10);
  }

  function effectiveAmount() {
    if (custom !== '') {
      const n = parseFloat(custom);
      return isNaN(n) ? null : n;
    }
    return selected;
  }

  async function handleDonate() {
    const amount = effectiveAmount();
    if (!amount || amount < 1) {
      setError('Please enter an amount of at least $1.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { url } = await api.createDonationSession(amount);
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  const amount = effectiveAmount();
  const canDonate = amount && amount >= 1 && !loading;

  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        {label}
      </button>

      {open && (
        <div className="donate-overlay" onClick={e => { if (e.target === e.currentTarget) close(); }}>
          <div className="donate-modal" role="dialog" aria-modal="true" aria-labelledby="donate-title">

            <div className="donate-modal-header">
              <h2 id="donate-title" className="donate-modal-title">Support Mycelium</h2>
              <button className="btn btn-ghost donate-modal-close" onClick={close} aria-label="Close">✕</button>
            </div>

            <div className="donate-modal-body">
              <p className="donate-modal-desc">
                Your donation keeps this platform free and sovereign — no ads, no data harvesting, no corporate strings.
              </p>

              <div className="donate-quick-amounts">
                {QUICK_AMOUNTS.map(n => (
                  <button
                    key={n}
                    className={`donate-amount-btn${selected === n && custom === '' ? ' is-selected' : ''}`}
                    onClick={() => { setSelected(n); setCustom(''); setError(null); }}
                  >
                    ${n}
                  </button>
                ))}
              </div>

              <div className="donate-custom-row">
                <span className="donate-custom-prefix">$</span>
                <input
                  type="number"
                  className="donate-custom-input"
                  placeholder="Other amount"
                  min="1"
                  step="1"
                  value={custom}
                  onChange={e => { setCustom(e.target.value); setError(null); }}
                  aria-label="Custom donation amount"
                />
              </div>

              {error && <p className="donate-error">{error}</p>}
            </div>

            <div className="donate-modal-footer">
              <button type="button" className="btn btn-ghost" onClick={close} disabled={loading}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDonate}
                disabled={!canDonate}
              >
                {loading
                  ? 'Redirecting…'
                  : `Donate${amount && amount >= 1 ? ` $${Number.isInteger(amount) ? amount : amount.toFixed(2)}` : ''}`}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
