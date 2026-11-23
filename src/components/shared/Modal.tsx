import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function Modal({ title, id, busy, onClose, children }: {
  title: string; id: string; busy: boolean; onClose: () => void; children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement as HTMLElement | null
    element?.showModal()
    return () => { element?.close(); if (previous?.isConnected) previous.focus() }
  }, [])
  return createPortal(<dialog ref={dialog} className="modal" aria-labelledby={id} onCancel={event => {
    event.preventDefault(); if (!busy) onClose()
  }}><div className="modal-heading"><h2 id={id}>{title}</h2>
    <button className="icon-button" type="button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={19} /></button></div>
    {children}
  </dialog>, document.body)
}
