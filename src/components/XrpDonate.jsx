import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const XRP_ADDRESS = 'rEqYE3DJFfhsD47BarCDA4CCZriiQ5pNV5';

export default function XrpDonate() {
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    navigator.clipboard.writeText(XRP_ADDRESS).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="merch-donate-xrp">
      <p className="merch-donate-xrp-label">Donate with XRP</p>
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
            <button
              type="button"
              className="merch-donate-xrp-copy"
              onClick={copyAddress}
              title="Copy XRP address"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p className="xrp-donate-note">
            Payments go directly to a hardware wallet — no intermediary, fully sovereign
          </p>
        </div>
      </div>
    </div>
  );
}
