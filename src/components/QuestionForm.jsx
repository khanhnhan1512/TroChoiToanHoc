import { useState, useEffect } from 'react'
import { stdHints, QUESTION_TYPE_LABELS, processImageFile } from '../lib/gameLogic'

const SVG_TYPES = ['vuong', 'can', 'deu', 'thuong', 'tu', 'vuongcan']
const SVG_LABELS = {
  vuong: 'Tam giác vuông', can: 'Tam giác cân', deu: 'Tam giác đều',
  vuongcan: 'Tam giác vuông cân', tu: 'Tam giác tù', thuong: 'Tam giác thường',
}

const MATH_EXPLANATION_OPTIONS = [
  { value: 'tong3goc', label: 'Tổng 3 góc bằng 180°' },
  { value: 'tamgiacvuong', label: 'Tam giác vuông (2 góc nhọn = 90°)' },
  { value: 'tamgiacdeu', label: 'Tam giác đều (mỗi góc 60°)' },
  { value: 'tamgiaccan', label: 'Tam giác cân (2 góc đáy bằng nhau)' },
  { value: 'gocbet', label: 'Góc kề bù (tổng 180°)' },
]

export default function QuestionForm({ testId, question, onSave, onClose }) {
  const isEditing = !!question

  const [type, setType] = useState(question?.type || 'multiple_choice')
  const [questionText, setQuestionText] = useState(question?.question_text || '')
  const [hints, setHints] = useState(question?.hints || ['', '', ''])
  const [saving, setSaving] = useState(false)

  // === multiple_choice ===
  const [mcOptions, setMcOptions] = useState(question?.options || ['', '', '', ''])
  const [mcAnswer, setMcAnswer] = useState(question?.answer || '0') // index as string

  // === fill_text ===
  const [fillAnswer, setFillAnswer] = useState(question?.answer || '')

  // === true_false ===
  const [tfAnswer, setTfAnswer] = useState(question?.answer || 'true')

  // === ordering ===
  const [orderItems, setOrderItems] = useState(
    question?.type === 'ordering' && question?.options
      ? question.options
      : ['', '', '', '']
  )

  // === image (cũ) ===
  const [imageMode, setImageMode] = useState(question?.image_mode || 'svg')
  const [svgAnswer, setSvgAnswer] = useState(question?.answer || 'vuong')
  const [imgFiles, setImgFiles] = useState({ correct: null, wrong1: null, wrong2: null })

  // === input (toán cũ) ===
  const [inputAnswer, setInputAnswer] = useState(question?.answer || '')
  const [explanationKey, setExplanationKey] = useState(question?.explanation_key || 'tong3goc')

  // === ảnh minh hoạ đề bài (dùng chung tất cả loại) ===
  const [questionImage, setQuestionImage] = useState(question?.question_image || null)

  async function handleQuestionImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await processImageFile(file)
    if (b64) setQuestionImage(b64)
  }

  // Init from question when editing
  useEffect(() => {
    if (!question) return
    setType(question.type)
    setQuestionText(question.question_text)
    setHints(question.hints || ['', '', ''])

    switch (question.type) {
      case 'multiple_choice':
        setMcOptions(question.options || ['', '', '', ''])
        setMcAnswer(question.answer || '0')
        break
      case 'fill_text':
        setFillAnswer(question.answer || '')
        break
      case 'true_false':
        setTfAnswer(question.answer || 'true')
        break
      case 'ordering':
        setOrderItems(question.options || ['', '', '', ''])
        break
      case 'image':
        setImageMode(question.image_mode || 'svg')
        setSvgAnswer(question.answer || 'vuong')
        break
      case 'input':
        setInputAnswer(question.answer || '')
        setExplanationKey(question.explanation_key || 'tong3goc')
        break
    }
  }, [question])

  function handleTypeChange(newType) {
    setType(newType)
    setHints(['', '', ''])
  }

  async function handleSave() {
    if (!questionText.trim()) return alert('Vui lòng nhập nội dung câu hỏi!')

    setSaving(true)
    try {
      let qData = {
        test_id: testId,
        type,
        question_text: questionText,
        hints: hints.filter((h, i) => i === 0 || h), // keep at least slot 0
        sort_order: question?.sort_order || Date.now(),
        // clear fields by default
        explanation_key: null,
        image_mode: null,
        triangle_type: null,
        options: null,
        question_image: questionImage || null,
      }
      if (isEditing) qData.id = question.id

      switch (type) {
        case 'multiple_choice': {
          const cleaned = mcOptions.map(o => o.trim()).filter(Boolean)
          if (cleaned.length < 2) { setSaving(false); return alert('Cần ít nhất 2 phương án!') }
          const ansIdx = parseInt(mcAnswer)
          if (isNaN(ansIdx) || ansIdx >= cleaned.length) { setSaving(false); return alert('Chọn đáp án đúng!') }
          qData.options = cleaned
          qData.answer = String(ansIdx)
          break
        }
        case 'fill_text': {
          if (!fillAnswer.trim()) { setSaving(false); return alert('Nhập đáp án!') }
          qData.answer = fillAnswer.trim()
          break
        }
        case 'true_false': {
          qData.answer = tfAnswer
          qData.options = ['Đúng', 'Sai']
          break
        }
        case 'ordering': {
          const cleaned = orderItems.map(o => o.trim()).filter(Boolean)
          if (cleaned.length < 2) { setSaving(false); return alert('Cần ít nhất 2 mục để sắp xếp!') }
          // answer = mảng thứ tự đúng (JSON), options = mảng đã xáo trộn
          qData.answer = JSON.stringify(cleaned) // thứ tự đúng
          qData.options = [...cleaned].sort(() => 0.5 - Math.random())
          break
        }
        case 'image': {
          qData.explanation_key = 'image'
          qData.image_mode = imageMode
          if (imageMode === 'svg') {
            qData.answer = svgAnswer
            qData.triangle_type = svgAnswer
            const opts = SVG_TYPES.filter(x => x !== svgAnswer).sort(() => 0.5 - Math.random()).slice(0, 2)
            opts.push(svgAnswer)
            qData.options = opts.sort(() => 0.5 - Math.random())
          } else {
            const { correct, wrong1, wrong2 } = imgFiles
            if (!correct || !wrong1 || !wrong2) {
              if (isEditing && question.image_mode === 'upload') {
                qData.answer = question.answer
                qData.options = question.options
              } else {
                setSaving(false); return alert('Tải lên đủ 3 ảnh!')
              }
            } else {
              const [b64c, b64w1, b64w2] = await Promise.all([
                processImageFile(correct), processImageFile(wrong1), processImageFile(wrong2)
              ])
              if (!b64c || !b64w1 || !b64w2) { setSaving(false); return alert('Lỗi xử lý ảnh!') }
              qData.answer = b64c
              qData.options = [b64c, b64w1, b64w2].sort(() => 0.5 - Math.random())
            }
          }
          break
        }
        case 'input': {
          const a = parseInt(inputAnswer)
          if (isNaN(a)) { setSaving(false); return alert('Nhập đáp án số!') }
          qData.answer = String(a)
          qData.explanation_key = explanationKey
          qData.triangle_type = 'thuong'
          break
        }
      }

      await onSave(qData)
      onClose()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: 10, marginBottom: 16 }}>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>
            {isEditing ? 'Chỉnh Sửa Câu Hỏi' : 'Thêm Câu Hỏi Mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999', lineHeight: 1, padding: '0 4px' }}
            title="Đóng"
          >✕</button>
        </div>

        {/* 1. Loại câu hỏi */}
        <div className="form-group">
          <label>1. Loại câu hỏi:</label>
          <select className="form-control" value={type} onChange={(e) => handleTypeChange(e.target.value)}>
            {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* 2. Nội dung đề bài */}
        <div className="form-group">
          <label>2. Nội dung đề bài:</label>
          <textarea
            className="form-control"
            rows={3}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder={
              type === 'ordering' ? 'VD: Sắp xếp các bước giải theo thứ tự đúng'
              : type === 'true_false' ? 'VD: Tổng 3 góc trong tam giác bằng 180°'
              : type === 'multiple_choice' ? 'VD: Thủ đô của Việt Nam là gì?'
              : type === 'fill_text' ? 'VD: 2 + 2 = ___'
              : 'VD: Góc A = 60°, góc B = 40°. Tính góc C?'
            }
          />
        </div>

        {/* 2b. Ảnh minh hoạ đề bài (tùy chọn) */}
        <div className="form-group">
          <label>Ảnh minh hoạ đề bài <span style={{ fontWeight: 'normal', color: '#888', fontSize: 13 }}>(tùy chọn)</span></label>
          <input type="file" accept="image/*" className="form-control" style={{ padding: 5 }}
            onChange={handleQuestionImageChange} />
          {questionImage && (
            <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
              <img src={questionImage} alt="Ảnh đề bài" style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 8, border: '2px solid #d0e3f7' }} />
              <button type="button" onClick={() => setQuestionImage(null)}
                style={{ position: 'absolute', top: -8, right: -8, background: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 14, lineHeight: '24px', textAlign: 'center', padding: 0 }}>✕</button>
            </div>
          )}
        </div>

        {/* 3. Đáp án theo loại */}
        <div style={{ background: '#f0f7ff', padding: 16, borderRadius: 10, marginBottom: 16, border: '2px solid #d0e3f7' }}>
          <label style={{ fontWeight: 'bold', color: 'var(--text)', fontSize: 16, marginBottom: 8, display: 'block' }}>
            3. Cài đặt đáp án:
          </label>

          {/* TRẮC NGHIỆM */}
          {type === 'multiple_choice' && (
            <div>
              <p style={{ fontSize: 13, color: '#666', margin: '0 0 10px' }}>Nhập các phương án, tích chọn đáp án đúng.</p>
              {mcOptions.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <input
                    type="radio"
                    name="mcAnswer"
                    checked={mcAnswer === String(i)}
                    onChange={() => setMcAnswer(String(i))}
                    style={{ width: 18, height: 18, accentColor: 'var(--success)' }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    style={{ flex: 1 }}
                    value={opt}
                    onChange={(e) => {
                      const n = [...mcOptions]; n[i] = e.target.value; setMcOptions(n)
                    }}
                    placeholder={`Phương án ${String.fromCharCode(65 + i)}`}
                  />
                  {mcOptions.length > 2 && (
                    <button type="button" onClick={() => {
                      const n = mcOptions.filter((_, j) => j !== i)
                      setMcOptions(n)
                      if (parseInt(mcAnswer) >= n.length) setMcAnswer(String(n.length - 1))
                      else if (parseInt(mcAnswer) > i) setMcAnswer(String(parseInt(mcAnswer) - 1))
                    }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#dc3545' }}>✕</button>
                  )}
                </div>
              ))}
              {mcOptions.length < 6 && (
                <button type="button" className="btn-small btn-success" style={{ marginTop: 4, fontSize: 13 }}
                  onClick={() => setMcOptions([...mcOptions, ''])}>+ Thêm phương án</button>
              )}
            </div>
          )}

          {/* ĐIỀN ĐÁP ÁN */}
          {type === 'fill_text' && (
            <div>
              <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px' }}>Nhập đáp án đúng. Hệ thống sẽ so sánh không phân biệt hoa/thường.</p>
              <input type="text" className="form-control" value={fillAnswer} onChange={(e) => setFillAnswer(e.target.value)} placeholder="VD: Hà Nội" />
            </div>
          )}

          {/* ĐÚNG / SAI */}
          {type === 'true_false' && (
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '8px 16px', borderRadius: 8, border: tfAnswer === 'true' ? '3px solid var(--success)' : '2px solid #ccc', background: tfAnswer === 'true' ? '#e8f5e9' : 'white' }}>
                <input type="radio" name="tf" checked={tfAnswer === 'true'} onChange={() => setTfAnswer('true')} /> Đúng
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '8px 16px', borderRadius: 8, border: tfAnswer === 'false' ? '3px solid var(--error)' : '2px solid #ccc', background: tfAnswer === 'false' ? '#fff0f3' : 'white' }}>
                <input type="radio" name="tf" checked={tfAnswer === 'false'} onChange={() => setTfAnswer('false')} /> Sai
              </label>
            </div>
          )}

          {/* SẮP XẾP THỨ TỰ */}
          {type === 'ordering' && (
            <div>
              <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px' }}>Nhập các mục <b>theo thứ tự đúng</b>. Hệ thống sẽ tự xáo trộn khi hiển thị cho học sinh.</p>
              {orderItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--secondary)', width: 24 }}>{i + 1}.</span>
                  <input type="text" className="form-control" style={{ flex: 1 }} value={item}
                    onChange={(e) => { const n = [...orderItems]; n[i] = e.target.value; setOrderItems(n) }}
                    placeholder={`Bước ${i + 1}`}
                  />
                  {orderItems.length > 2 && (
                    <button type="button" onClick={() => setOrderItems(orderItems.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#dc3545' }}>✕</button>
                  )}
                </div>
              ))}
              {orderItems.length < 8 && (
                <button type="button" className="btn-small btn-success" style={{ marginTop: 4, fontSize: 13 }}
                  onClick={() => setOrderItems([...orderItems, ''])}>+ Thêm mục</button>
              )}
            </div>
          )}

          {/* CHỌN HÌNH */}
          {type === 'image' && (
            <div>
              <select className="form-control" value={imageMode} onChange={(e) => setImageMode(e.target.value)} style={{ marginBottom: 10 }}>
                <option value="svg">Hình vẽ Toán học của hệ thống</option>
                <option value="upload">Tải ảnh lên từ máy</option>
              </select>
              {imageMode === 'svg' && (
                <div>
                  <label>Đáp án đúng:</label>
                  <select className="form-control" value={svgAnswer} onChange={(e) => setSvgAnswer(e.target.value)}>
                    {SVG_TYPES.map(t => <option key={t} value={t}>{SVG_LABELS[t]}</option>)}
                  </select>
                </div>
              )}
              {imageMode === 'upload' && (
                <div style={{ background: '#fff3e0', padding: 12, borderRadius: 8 }}>
                  <p style={{ fontSize: 13, color: '#888', margin: '0 0 8px' }}>Tải 3 ảnh (1 đúng + 2 sai).</p>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 14, color: 'var(--success)' }}>Ảnh ĐÚNG:</label>
                    <input type="file" accept="image/*" className="form-control" style={{ padding: 5 }}
                      onChange={(e) => setImgFiles(p => ({ ...p, correct: e.target.files[0] }))} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 14, color: 'var(--error)' }}>Ảnh SAI 1:</label>
                    <input type="file" accept="image/*" className="form-control" style={{ padding: 5 }}
                      onChange={(e) => setImgFiles(p => ({ ...p, wrong1: e.target.files[0] }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 14, color: 'var(--error)' }}>Ảnh SAI 2:</label>
                    <input type="file" accept="image/*" className="form-control" style={{ padding: 5 }}
                      onChange={(e) => setImgFiles(p => ({ ...p, wrong2: e.target.files[0] }))} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NHẬP SỐ (TOÁN) */}
          {type === 'input' && (
            <div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label>Đáp án đúng (số):</label>
                <input type="number" className="form-control" value={inputAnswer} onChange={(e) => setInputAnswer(e.target.value)} placeholder="80" />
              </div>
              <div className="form-group">
                <label>Giải thích đúng:</label>
                <select className="form-control" value={explanationKey} onChange={(e) => setExplanationKey(e.target.value)}>
                  {MATH_EXPLANATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 4. Gợi ý */}
        <div className="hint-group">
          <label style={{ color: 'var(--primary)', fontSize: 16 }}>4. Gợi ý khi trả lời sai (tùy chọn):</label>
          <p style={{ fontSize: 13, color: '#666', marginTop: 0 }}>Gợi ý hướng dẫn tư duy, <b>không đưa sẵn đáp án</b>.</p>
          {[0, 1, 2].map(i => (
            <input key={i} type="text" className="form-control"
              style={{ marginBottom: i < 2 ? 8 : 0, borderColor: i === 2 ? 'var(--error)' : undefined }}
              placeholder={`Gợi ý ${i + 1}...`}
              value={hints[i] || ''}
              onChange={(e) => { const n = [...hints]; n[i] = e.target.value; setHints(n) }}
            />
          ))}
        </div>

        <div style={{ textAlign: 'right', marginTop: 20 }}>
          <button className="btn-small btn-cancel" onClick={onClose} style={{ marginRight: 8 }}>Hủy</button>
          <button className="btn-small btn-success" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu Câu Hỏi'}
          </button>
        </div>
      </div>
    </div>
  )
}
