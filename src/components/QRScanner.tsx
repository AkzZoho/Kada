import React from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, ScanLine } from 'lucide-react';

interface QRScannerProps {
  onScan: (text: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [err, setErr] = React.useState('');
  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    const scanner = new Html5Qrcode('kada-qr-reader');
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 230, height: 230 } },
        (text) => {
          onScan(text);
        },
        () => {}
      )
      .then(() => {
        startedRef.current = true;
      })
      .catch(() => {
        setErr('Camera access denied. Please allow camera permission and try again.');
      });

    return () => {
      if (startedRef.current) {
        scanner.stop().catch(() => {}).finally(() => scanner.clear());
      } else {
        scanner.clear();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ScanLine size={18} />
            Scan Product QR
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ padding: '16px 20px 20px' }}>
          {err ? (
            <div style={{ color: 'var(--danger)', background: 'var(--danger-light)', padding: '14px 16px', borderRadius: 10, fontSize: 13, textAlign: 'center' }}>
              {err}
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div id="kada-qr-reader" style={{ borderRadius: 12, overflow: 'hidden', width: '100%' }} />
              <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                Point the camera at a product QR code
              </p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
