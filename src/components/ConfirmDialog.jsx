/**
 * ConfirmDialog — thay thế window.confirm() và window.alert() bằng dialog có giao diện rõ ràng
 *
 * useConfirm:
 *   const { confirm, ConfirmDialog } = useConfirm()
 *   await confirm({ title, message, confirmText, danger }) → true/false
 *
 * useAlert:
 *   const { alert, AlertDialog } = useAlert()
 *   await alert({ title, message, icon })
 */
import { useState, useCallback } from 'react'

function BaseDialog({ state, onConfirm, onCancel, showCancel }) {
  if (!state) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={showCancel ? onCancel : onConfirm}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 14,
          padding: '28px 28px 22px',
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 12 }}>
          {state.icon || (state.danger ? '🗑️' : showCancel ? '❓' : 'ℹ️')}
        </div>
        <h3 style={{ margin: '0 0 8px', color: 'var(--text)', fontSize: 18 }}>
          {state.title || (showCancel ? 'Xác nhận' : 'Thông báo')}
        </h3>
        {state.message && (
          <p style={{ margin: '0 0 20px', color: '#555', fontSize: 14, lineHeight: 1.5 }}>
            {state.message}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {showCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: '10px 24px', borderRadius: 8, border: '1.5px solid #ccc',
                background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: 14,
                color: '#555',
              }}
            >
              Hủy
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: state.danger ? '#dc3545' : 'var(--primary)',
              color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: 14,
            }}
          >
            {state.confirmText || (showCancel ? 'Xác nhận' : 'Đóng')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function useConfirm() {
  const [state, setState] = useState(null)

  const confirm = useCallback((opts) => new Promise((resolve) => {
    setState({ ...opts, resolve })
  }), [])

  function handleConfirm() { state?.resolve(true); setState(null) }
  function handleCancel() { state?.resolve(false); setState(null) }

  function ConfirmDialog() {
    return <BaseDialog state={state} onConfirm={handleConfirm} onCancel={handleCancel} showCancel />
  }

  return { confirm, ConfirmDialog }
}

export function useAlert() {
  const [state, setState] = useState(null)

  const alert = useCallback((opts) => new Promise((resolve) => {
    // Cho phép gọi dạng alert('string') hoặc alert({ title, message })
    const normalized = typeof opts === 'string' ? { message: opts } : opts
    setState({ ...normalized, resolve })
  }), [])

  function handleClose() { state?.resolve(); setState(null) }

  function AlertDialog() {
    return <BaseDialog state={state} onConfirm={handleClose} onCancel={handleClose} showCancel={false} />
  }

  return { alert, AlertDialog }
}
