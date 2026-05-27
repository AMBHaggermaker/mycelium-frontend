import { useState, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Crops and resizes an image to a specific dimension before upload.
// Props:
//   aspect        — width/height ratio (1 = square, 4/3, 3, 1.91…)
//   targetWidth   — output canvas px
//   targetHeight  — output canvas px
//   label         — button text (default "Choose Photo")
//   hint          — helper text shown below button (e.g. "400×400px · square")
//   onFile        — (blob, filename) => void
//   disabled
//   btnClassName

export default function ImageCropUploader({
  aspect,
  targetWidth,
  targetHeight,
  label = 'Choose Photo',
  hint,
  onFile,
  disabled,
  btnClassName = 'btn btn-outline btn-sm',
}) {
  const [src,           setSrc]           = useState(null);
  const [filename,      setFilename]      = useState('');
  const [crop,          setCrop]          = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [busy,          setBusy]          = useState(false);
  const [thumb,         setThumb]         = useState(null);
  const imgRef  = useRef(null);
  const fileRef = useRef(null);

  function openPicker() { fileRef.current?.click(); }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => { setSrc(reader.result); setCrop(undefined); setCompletedCrop(undefined); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function onImageLoad(e) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    const c = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, aspect, w, h),
      w, h
    );
    setCrop(c);
  }

  async function confirm() {
    if (!completedCrop || !imgRef.current) return;
    setBusy(true);
    try {
      const blob = await cropToBlob(imgRef.current, completedCrop, targetWidth, targetHeight);
      const url  = URL.createObjectURL(blob);
      if (thumb) URL.revokeObjectURL(thumb);
      setThumb(url);
      setSrc(null);
      onFile(blob, filename.replace(/\.[^.]+$/, '.jpg'));
    } catch (e) {
      alert('Could not process image: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }

  return (
    <div className="img-crop-uploader">
      {hint && <p className="img-crop-hint">{hint}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
        <button type="button" className={btnClassName} onClick={openPicker} disabled={disabled}>
          {thumb ? 'Change' : label}
        </button>
        {thumb && <img src={thumb} alt="preview" className="img-crop-thumb" />}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }} onChange={onFileChange} />

      {src && (
        <div className="img-crop-overlay" onClick={e => e.target === e.currentTarget && cancel()}>
          <div className="img-crop-dialog">
            <div className="img-crop-dialog-header">
              <span>Crop Photo</span>
              <button type="button" className="img-crop-close" onClick={cancel}>✕</button>
            </div>
            <div className="img-crop-dialog-body">
              <ReactCrop
                crop={crop}
                onChange={(_, pct) => setCrop(pct)}
                onComplete={px => setCompletedCrop(px)}
                aspect={aspect}
                minWidth={40}
              >
                <img
                  ref={imgRef}
                  src={src}
                  alt="crop"
                  onLoad={onImageLoad}
                  style={{ maxWidth: '80vw', maxHeight: '60vh', display: 'block' }}
                />
              </ReactCrop>
              <p className="img-crop-size-hint">Output: {targetWidth}×{targetHeight}px</p>
            </div>
            <div className="img-crop-dialog-footer">
              <button type="button" className="btn btn-primary" onClick={confirm}
                disabled={busy || !completedCrop}>
                {busy ? '…' : 'Use Photo'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={cancel}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function cropToBlob(img, crop, targetW, targetH) {
  const canvas = document.createElement('canvas');
  canvas.width  = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  const scaleX = img.naturalWidth  / img.width;
  const scaleY = img.naturalHeight / img.height;

  ctx.drawImage(
    img,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width  * scaleX,
    crop.height * scaleY,
    0, 0, targetW, targetH
  );

  return new Promise((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error('Canvas is empty')), 'image/jpeg', 0.92)
  );
}
