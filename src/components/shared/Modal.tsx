import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function Modal({
  title,
  id,
  busy,
  onClose,
  children,
}: {
  title: string
  id: string
  busy: boolean
  onClose: () => void
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement as HTMLElement | null
    element?.showModal()
    return () => {
      element?.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return createPortal(
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby={id}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const element = event.currentTarget
        const controls = Array.from(
          element.querySelectorAll<HTMLElement>(
            'a[href], button, input, select, textarea, [tabindex]',
          ),
        ).filter(
          (control) =>
            control.tabIndex >= 0 &&
            !control.matches(':disabled') &&
            control.getClientRects().length > 0 &&
            window.getComputedStyle(control).visibility !== 'hidden',
        )
        const active = document.activeElement
        if (controls.length === 0) {
          event.preventDefault()
          document.getElementById(id)?.focus()
        } else if (event.shiftKey && (active === controls[0] || !element.contains(active))) {
          event.preventDefault()
          controls[controls.length - 1].focus()
        } else if (
          !event.shiftKey &&
          (active === controls[controls.length - 1] || !element.contains(active))
        ) {
          event.preventDefault()
          controls[0].focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <div className="modal-heading">
        <h2 id={id} tabIndex={-1}>
          {title}
        </h2>
        <button
          className="icon-button"
          type="button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>,
    document.body,
  )
}
