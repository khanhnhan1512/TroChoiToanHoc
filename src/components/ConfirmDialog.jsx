/**
 * ConfirmDialog — thay thế window.confirm() bằng dialog có giao diện rõ ràng
 * Usage:
 *   const { confirm, ConfirmDialog } = useConfirm()
 *   await confirm({ title, message, confirmText, danger }) → true/false
 */
import { useState, useCallback } from 'react'

export function useConfirm() {
  const [state, setState] = useState(null) // { title, message, confirmText, danger, resolve }

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({ ...opts, resolve })
    })
  }, [])

  function handleConfirm() {
    state?.resolve(true)
    setState(null)
  }

  function handleCancel() {
    state?.resolve(false)
    setState(null)
  }

  function Dialog() {
    if (!state) return null
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
        onClick={handleCancel}
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
            {state.danger ? '🗑️' : '❓'}
          </div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--text)', fontSize: 18 }}>
            {state.title || 'Xác nhận'}
          </h3>
          {state.message && (
            <p style={{ margin: '0 0 20px', color: '#555', fontSize: 14, lineHeight: 1.5 }}>
              {state.message}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '10px 24px', borderRadius: 8, border: '1.5px solid #ccc',
                background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: 14,
                color: '#555',
              }}
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              style={{
                padding: '10px 24px', borderRadius: 8, border: 'none',
                background: state.danger ? '#dc3545' : 'var(--primary)',
                color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: 14,
              }}
            >
              {state.confirmText || 'Xác nhận'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return { confirm, ConfirmDialog: Dialog }
}
