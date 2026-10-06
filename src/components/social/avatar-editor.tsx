'use client';

import { useEffect, useRef, useState } from 'react';
import { clamp, cropGeometry, type CropPosition } from '@/modules/social/avatar-crop';
import s from './avatar-editor.module.css';

const VIEW = 248;
const OUTPUT = 320;
const MAX_BYTES = 524288;
const INITIAL: CropPosition = { x: 0, y: 0, zoom: 1 };

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function exportCrop(image: HTMLImageElement, position: CropPosition) {
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT;
  canvas.height = OUTPUT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('processing');
  const frame = cropGeometry(image.naturalWidth, image.naturalHeight, OUTPUT, position);
  context.drawImage(image, frame.left, frame.top, frame.width, frame.height);
  let blob = await canvasBlob(canvas, 'image/jpeg', 0.85);
  if (!blob || blob.size > MAX_BYTES) blob = await canvasBlob(canvas, 'image/jpeg', 0.68);
  if (!blob || blob.size > MAX_BYTES) blob = await canvasBlob(canvas, 'image/png');
  if (!blob || blob.size > MAX_BYTES || !['image/jpeg', 'image/png'].includes(blob.type))
    throw new Error('processing');
  return new File([blob], blob.type === 'image/png' ? 'avatar.png' : 'avatar.jpg', {
    type: blob.type,
  });
}

export default function AvatarEditor({
  source,
  language,
  onSave,
  onClose,
}: {
  source: File;
  language: 'id' | 'en';
  onSave: (file: File) => Promise<string | null>;
  onClose: () => void;
}) {
  const en = language === 'en';
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; origin: CropPosition } | null>(null);
  const [url, setUrl] = useState('');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [position, setPosition] = useState<CropPosition>(INITIAL);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(source);
    const image = new Image();
    let active = true;
    image.onload = () => {
      if (active && image.naturalWidth > 0 && image.naturalHeight > 0) {
        imageRef.current = image;
        setUrl(objectUrl);
        setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
      }
    };
    image.onerror = () => {
      if (active)
        setError(
          en
            ? 'This photo cannot be opened. Choose another image.'
            : 'Foto tidak dapat dibuka. Pilih gambar lain.',
        );
    };
    image.src = objectUrl;
    return () => {
      active = false;
      imageRef.current = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [source, en]);

  const frame = dimensions
    ? cropGeometry(dimensions.width, dimensions.height, VIEW, position)
    : null;

  async function save() {
    if (!imageRef.current || saving) return;
    setSaving(true);
    setError('');
    try {
      const output = await exportCrop(imageRef.current, position);
      const failure = await onSave(output);
      if (failure) setError(failure);
      else onClose();
    } catch {
      setError(
        en
          ? 'Photo could not be processed. Try another image.'
          : 'Foto tidak dapat diproses. Coba gambar lain.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={s.dialog}
      aria-labelledby="avatar-editor-title"
      onCancel={(event) => {
        if (saving) event.preventDefault();
        else onClose();
      }}
    >
      <div className={s.content}>
        <div className={s.heading}>
          <h2 id="avatar-editor-title">{en ? 'Adjust profile photo' : 'Atur foto profil'}</h2>
          <p>
            {en
              ? 'Drag the photo to frame your face. Zoom in if needed.'
              : 'Geser foto untuk menentukan bagian yang terlihat. Perbesar bila perlu.'}
          </p>
        </div>
        <div
          className={s.crop}
          role="img"
          aria-label={
            en ? 'Circular preview of the new profile photo' : 'Preview bundar foto profil baru'
          }
          onPointerDown={(event) => {
            if (!frame || saving) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { x: event.clientX, y: event.clientY, origin: position };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || !frame || saving) return;
            setPosition((current) => ({
              ...current,
              x: frame.panX
                ? clamp(drag.origin.x + (event.clientX - drag.x) / frame.panX, -1, 1)
                : 0,
              y: frame.panY
                ? clamp(drag.origin.y + (event.clientY - drag.y) / frame.panY, -1, 1)
                : 0,
            }));
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          {frame && url ? (
            <img
              src={url}
              alt=""
              draggable={false}
              style={{ width: frame.width, height: frame.height, left: frame.left, top: frame.top }}
            />
          ) : (
            <span className={s.loading}>{en ? 'Opening photo…' : 'Membuka foto…'}</span>
          )}
        </div>
        <div className={s.controls}>
          <label htmlFor="avatar-zoom">
            {en ? 'Zoom' : 'Perbesar'} <output>{Math.round(position.zoom * 100)}%</output>
          </label>
          <input
            id="avatar-zoom"
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={position.zoom}
            disabled={!dimensions || saving}
            onChange={(event) =>
              setPosition((current) => ({ ...current, zoom: Number(event.target.value) }))
            }
          />
          <label htmlFor="avatar-horizontal">{en ? 'Move horizontally' : 'Geser mendatar'}</label>
          <input
            id="avatar-horizontal"
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={position.x}
            disabled={!dimensions || saving || !frame?.panX}
            onChange={(event) =>
              setPosition((current) => ({ ...current, x: Number(event.target.value) }))
            }
          />
          <label htmlFor="avatar-vertical">{en ? 'Move vertically' : 'Geser vertikal'}</label>
          <input
            id="avatar-vertical"
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={position.y}
            disabled={!dimensions || saving || !frame?.panY}
            onChange={(event) =>
              setPosition((current) => ({ ...current, y: Number(event.target.value) }))
            }
          />
        </div>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <div className={s.actions}>
          <button type="button" className={s.cancel} disabled={saving} onClick={onClose}>
            {en ? 'Cancel' : 'Batal'}
          </button>
          <button
            type="button"
            className={s.save}
            disabled={!dimensions || saving}
            onClick={() => void save()}
          >
            {saving ? (en ? 'Saving…' : 'Menyimpan…') : en ? 'Save photo' : 'Simpan foto'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
