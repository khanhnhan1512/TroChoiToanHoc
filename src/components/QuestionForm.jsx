import { useState, useEffect } from 'react'
import { stdHints } from '../lib/gameLogic'
import { processImageFile } from '../lib/gameLogic'

const SVG_TYPES = ['vuong', 'can', 'deu', 'thuong', 'tu', 'vuongcan']
const SVG_LABELS = {
  vuong: 'Tam giác vuông',
  can: 'Tam giác cân',
  deu: 'Tam giác đều',
  vuongcan: 'Tam giác vuông cân',
  tu: 'Tam giác tù',
  thuong: 'Tam giác thường',
}

const EXPLANATION_OPTIONS = [
  { value: 'tong3goc', label: 'Tổng 3 góc bằng 180°' },
  { value: 'tamgiacvuong', label: 'Tam giác vuông (2 góc nhọn = 90°)' },
  { value: 'tamgiacdeu', label: 'Tam giác đều (mỗi góc 60°)' },
  { value: 'tamgiaccan', label: 'Tam giác cân (2 góc đáy bằng nhau)' },
  { value: 'gocbet', label: 'Góc kề bù (tổng 180°)' },
]

export default function QuestionForm({ testId, question, onSave, onClose }) {
  const isEditing = !!question

  const [type, setType] = useState(question?.type || 'input')
  const [questionText, setQuestionText] = useState(question?.question_text || '')
  const [answerInput, setAnswerInput] = useState(question?.answer || '')
  const [explanationKey, setExplanationKey] = useState(question?.explanation_key || 'tong3goc')
  const [imageMode, setImageMode] = useState(question?.image_mode || 'svg')
  const [svgAnswer, setSvgAnswer] = useState(question?.answer || 'vuong')
  const [hints, setHints] = useState(question?.hints || ['', '', ''])
  const [saving, setSaving] = useState(false)
  const [imgFiles, setImgFiles] = useState({ correct: null, wrong1: null, wrong2: null })

  // Auto-fill hints when explanation changes
  useEffect(() => {
    const key = type === 'input' ? explanationKey : 'image'
    if (stdHints[key]) {
      setHints([stdHints[key][0], stdHints[key][1], hints[2]])
    }
  }, [explanationKey, type])

  function handleTypeChange(newType) {
    setType(newType)
    const key = newType === 'input' ? explanationKey : 'image'
    setHints([stdHints[key][0], stdHints[key][1], ''])
  }

  async function handleSave() {
    if (!questionText.trim()) return alert('Vui lòng nhập nội dung câu hỏi!')

    setSaving(true)
    try {
      let qData = {
        test_id: testId,
        type,
        question_text: questionText,
        hints,
        sort_order: question?.sort_order || Date.now(),
      }

      if (isEditing) qData.id = question.id

      if (type === 'input') {
        const a = parseInt(answerInput)
        if (isNaN(a)) { setSaving(false); return alert('Vui lòng nhập đáp án số!') }
        qData.answer = String(a)
        qData.explanation_key = explanationKey
        qData.image_mode = null
        qData.triangle_type = 'thuong'
        qData.options = null
      } else {
        qData.explanation_key = 'image'
        qData.image_mode = imageMode

        if (imageMode === 'svg') {
          qData.answer = svgAnswer
          qData.triangle_type = svgAnswer
          const opts = SVG_TYPES.filter((x) => x !== svgAnswer).sort(() => 0.5 - Math.random()).slice(0, 2)
          opts.push(svgAnswer)
          qData.options = opts.sort(() => 0.5 - Math.random())
        } else {
          // Upload mode
          const { correct, wrong1, wrong2 } = imgFiles
          if (!correct || !wrong1 || !wrong2) {
            if (isEditing && question.image_mode === 'upload') {
              // keep old images
              qData.answer = question.answer
              qData.options = question.options
            } else {
              setSaving(false)
              return alert('Vui lòng tải lên đủ 3 ảnh (1 đúng, 2 sai)!')
            }
          } else {
            const b64c = await processImageFile(correct)
            const b64w1 = await processImageFile(wrong1)
            const b64w2 = await processImageFile(wrong2)
            if (!b64c || !b64w1 || !b64w2) { setSaving(false); return alert('Lỗi xử lý ảnh!') }
            qData.answer = b64c
            qData.options = [b64c, b64w1, b64w2].sort(() => 0.5 - Math.random())
          }
        }
      }

      await onSave(qData)
      onClose()
    } catch (err) {
      alert('Lỗi lưu câu hỏi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <h2 style={{ color: 'var(--primary)', marginTop: 0, borderBottom: '2px solid #eee', paddingBottom: 10 }}>
          {isEditing ? 'Chỉnh Sửa Câu Hỏi' : 'Thêm Câu Hỏi Mới'}
        </h2>

        {/* Loại câu hỏi */}
        <div className="form-group">
          <label>1. Loại câu hỏi:</label>
          <select className="form-control" value={type} onChange={(e) => handleTypeChange(e.target.value)}>
            <option value="input">Nhập số đo độ (Cần giải thích quy luật)</option>
            <option value="image">Chọn hình ảnh đúng (Không cần giải thích)</option>
          </select>
        </div>

        {/* Nội dung đề bài */}
        <div className="form-group">
          <label>2. Nội dung đề bài:</label>
          <input
            type="text"
            className="form-control"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="VD: Góc A = 60°, góc B = 40°. Tính góc C?"
          />
        </div>

        {/* Đáp án - Input */}
        {type === 'input' && (
          <>
            <div className="form-group">
              <label>3. Đáp án đúng (Chỉ nhập số):</label>
              <input
                type="number"
                className="form-control"
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder="VD: 80"
              />
            </div>
            <div className="form-group">
              <label>4. Giải thích đúng (Quy luật Toán học):</label>
              <select
                className="form-control"
                value={explanationKey}
                onChange={(e) => setExplanationKey(e.target.value)}
              >
                {EXPLANATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Đáp án - Image */}
        {type === 'image' && (
          <div className="form-group">
            <label>3. Nguồn hình ảnh minh họa:</label>
            <select className="form-control" value={imageMode} onChange={(e) => setImageMode(e.target.value)}>
              <option value="svg">Sử dụng Hình vẽ Toán học của hệ thống</option>
              <option value="upload">Tải ảnh lên từ máy tính/điện thoại</option>
            </select>

            {imageMode === 'svg' && (
              <div style={{ marginTop: 10 }}>
                <label>Đáp án đúng (Hình ảnh cần chọn):</label>
                <select className="form-control" value={svgAnswer} onChange={(e) => setSvgAnswer(e.target.value)}>
                  {SVG_TYPES.map((t) => (
                    <option key={t} value={t}>{SVG_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            )}

            {imageMode === 'upload' && (
              <div style={{ marginTop: 10, background: '#fff3e0', padding: 15, borderRadius: 8 }}>
                <p style={{ fontSize: 13, color: '#888', marginTop: 0 }}>
                  Hệ thống sẽ tự động thu nhỏ ảnh.
                  {isEditing && question.image_mode === 'upload' && ' (Để trống nếu muốn giữ ảnh cũ)'}
                </p>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 14, color: 'var(--success)' }}>✅ Ảnh ĐÚNG (Đáp án):</label>
                  <input type="file" accept="image/*" className="form-control" style={{ padding: 5 }}
                    onChange={(e) => setImgFiles((p) => ({ ...p, correct: e.target.files[0] }))} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 14, color: 'var(--error)' }}>❌ Ảnh SAI số 1:</label>
                  <input type="file" accept="image/*" className="form-control" style={{ padding: 5 }}
                    onChange={(e) => setImgFiles((p) => ({ ...p, wrong1: e.target.files[0] }))} />
                </div>
                <div>
                  <label style={{ fontSize: 14, color: 'var(--error)' }}>❌ Ảnh SAI số 2:</label>
                  <input type="file" accept="image/*" className="form-control" style={{ padding: 5 }}
                    onChange={(e) => setImgFiles((p) => ({ ...p, wrong2: e.target.files[0] }))} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gợi ý */}
        <div className="hint-group">
          <label style={{ color: 'var(--primary)', fontSize: 18 }}>
            {type === 'input' ? '5.' : '4.'} Cài đặt Gợi ý (Scaffolding):
          </label>
          <p style={{ fontSize: 14, color: '#666', marginTop: 0 }}>
            Gợi ý hướng dẫn tư duy, <b>không đưa sẵn phép tính hoặc đáp án</b>.
          </p>
          <input
            type="text"
            className="form-control"
            style={{ marginBottom: 8 }}
            placeholder="Lượt 1 (Nhắc kiến thức chung)..."
            value={hints[0]}
            onChange={(e) => setHints([e.target.value, hints[1], hints[2]])}
          />
          <input
            type="text"
            className="form-control"
            style={{ marginBottom: 8 }}
            placeholder="Lượt 2 (Nhắc rõ quy luật)..."
            value={hints[1]}
            onChange={(e) => setHints([hints[0], e.target.value, hints[2]])}
          />
          <input
            type="text"
            className="form-control"
            placeholder="Lượt 3 (Hướng dẫn tư duy thao tác)..."
            style={{ borderColor: 'var(--error)' }}
            value={hints[2]}
            onChange={(e) => setHints([hints[0], hints[1], e.target.value])}
          />
        </div>

        <div style={{ textAlign: 'right', marginTop: 20 }}>
          <button className="btn-small btn-cancel" onClick={onClose} style={{ marginRight: 8 }}>
            Hủy bỏ
          </button>
          <button className="btn-small btn-success" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu Câu Hỏi'}
          </button>
        </div>
      </div>
    </div>
  )
}
