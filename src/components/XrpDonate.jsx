import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api';

const XRP_ADDRESS = 'rEqYE3DJFfhsD47BarCDA4CCZriiQ5pNV5';
const MIN_XRP = 10;

export default function XrpDonate() {
  const [copied,  setCopied]  = useState(false);
  const [done,    setDone]    = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState(null);
  const [form,    setForm]    = useState({
    donor_name:           '',
    donor_email:          '',
    declared_amount_xrp:  '',
    sender_xrp_address:   '',
    note:                 '',
    mycelium_username:    '',
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function copyAddress() {
    navigator.clipboard.writeText(XRP_ADDRESS).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function validate() {
    if (!form.donor_name.trim())          return 'Name is required.';
    if (!form.donor_email.trim())         return 'Email address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.donor_email.trim()))
      return 'Please enter a valid email address.';
    const amt = parseFloat(form.declared_amount_xrp);
    if (!form.declared_amount_xrp || isNaN(amt) || amt <= 0)
      return 'Please enter the amount of XRP you are sending.';
    if (amt < MIN_XRP)
      return `Minimum donation is ${MIN_XRP} XRP.`;
    if (!form.sender_xrp_address.trim() || form.sender_xrp_address.trim().length < 12)
      return 'Sender XRP address must be at least 12 characters.';
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    const validErr = validate();
    if (validErr) { setErr(validErr); return; }
    setBusy(true); setErr(null);
    try {
      await api.submitXrpDonation({
        donor_name:          form.donor_name.trim(),
        donor_email:         form.donor_email.trim(),
        declared_amount_xrp: parseFloat(form.declared_amount_xrp),
        sender_xrp_address:  form.sender_xrp_address.trim(),
        note:                form.note.trim() || undefined,
        mycelium_username:   form.mycelium_username.trim() || undefined,
      });
      setDone(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="merch-donate-xrp">
      <p className="merch-donate-xrp-label">Donate with XRP</p>

      {/* QR + address */}
      <div className="xrp-donate-body">
        <div className="xrp-qr-wrap">
          <QRCodeSVG
            value={XRP_ADDRESS}
            size={96}
            bgColor="transparent"
            fgColor="#00ff88"
            level="M"
          />
        </div>
        <div className="xrp-donate-info">
          <div className="merch-donate-xrp-row">
            <span className="merch-donate-xrp-addr">{XRP_ADDRESS}</span>
            <button type="button" className="merch-donate-xrp-copy" onClick={copyAddress} title="Copy XRP address">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p className="xrp-donate-note">
            Payments go directly to a hardware wallet — no intermediary, fully sovereign
          </p>
        </div>
      </div>

      {/* Declaration form */}
      <div className="xrp-declare-section">
        {done ? (
          <div className="xrp-declare-success">
            <span className="xrp-declare-success-icon">✓</span>
            <div>
              <p className="xrp-declare-success-title">Declaration received</p>
              <p className="xrp-declare-success-body">
                Your donation declaration has been received. Please complete your XRP transfer and allow up to 24 hours for confirmation.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="xrp-declare-heading">Declare your transfer</p>
            <p className="xrp-declare-sub">After sending XRP, fill this out so we can match your transaction.</p>
            <form className="xrp-declare-form" onSubmit={submit} noValidate>
              <div className="xrp-field-row">
                <div className="form-group">
                  <label className="form-label">Name or Mycelium username <span className="form-required">*</span></label>
                  <input className="form-input" value={form.donor_name}
                    onChange={e => set('donor_name', e.target.value)} placeholder="Your name or @username" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email <span className="form-required">*</span></label>
                  <input className="form-input" type="email" value={form.donor_email}
                    onChange={e => set('donor_email', e.target.value)} placeholder="you@example.com" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Amount you are sending (XRP) <span className="form-required">*</span></label>
                <input className="form-input" type="number" min={MIN_XRP} step="0.000001"
                  value={form.declared_amount_xrp}
                  onChange={e => set('declared_amount_xrp', e.target.value)}
                  placeholder={`Minimum ${MIN_XRP} XRP`} />
              </div>

              <div className="form-group">
                <label className="form-label">Your XRP sender address <span className="form-required">*</span></label>
                <input className="form-input" value={form.sender_xrp_address}
                  onChange={e => set('sender_xrp_address', e.target.value)}
                  placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" />
                <span className="form-hint">
                  Enter your full XRP sender address, or at minimum the first 6 and last 6 characters.
                  If sending from an exchange, your sending address may differ per transaction — check your exchange transaction history.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Note <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                <input className="form-input" value={form.note}
                  onChange={e => set('note', e.target.value)} placeholder="Anything you'd like to add" />
              </div>

              {err && <p className="form-error">{err}</p>}

              <button type="submit" className="btn btn-primary xrp-declare-submit" disabled={busy}>
                {busy ? '…' : 'I Am Sending XRP'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
