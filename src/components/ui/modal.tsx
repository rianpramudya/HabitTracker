'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import s from '../dashboard.module.css';
export default function Modal({
  title,
  close,
  children,
  closeLabel,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  closeLabel: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header className={s.dialogHead}>
        <h2 id="dialog-title">{title}</h2>
        <button className={s.iconButton} onClick={close} aria-label={closeLabel}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
