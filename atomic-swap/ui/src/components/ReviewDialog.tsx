import { useEffect } from 'react'
import type { DemoHolding, Contract, Party } from '../types'
import { ArrowSwap, CloseIcon } from './Icons'

interface Props {
  open: boolean
  holding?: Contract<DemoHolding>
  sendAmount: string
  receiveInstrument: string
  receiveAmount: string
  counterparty?: Party
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ReviewDialog({ open, holding, sendAmount, receiveInstrument, receiveAmount, counterparty, busy, onClose, onConfirm }: Props) {
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  if (!open || !holding || !counterparty) return null
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
    <div className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <button className="icon-button dialog-close" aria-label="Close review" onClick={onClose}><CloseIcon /></button>
      <h2 id="review-title">Ready to send this swap?</h2>
      <div className="review-exchange">
        <div><span>You send</span><strong>{sendAmount} <small>{holding.payload.instrumentId.id}</small></strong></div>
        <span className="review-arrows"><ArrowSwap /></span>
        <div><span>You receive</span><strong>{receiveAmount} <small>{receiveInstrument}</small></strong></div>
      </div>
      <p className="review-with">With <strong>{counterparty.hint}</strong></p>
      <p className="review-assurance">Your assets only move when both sides are ready.</p>
      <button className="primary-button review-submit" disabled={busy} onClick={onConfirm}>{busy ? 'Sending…' : 'Send swap request'}</button>
      <button className="text-button" disabled={busy} onClick={onClose}>Go back</button>
    </div>
  </div>
}
