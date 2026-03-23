import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTests, getQuestions } from '../hooks/useTests'
import { buildSessionQuestions, generateTriangleSVG, formatTime, evaluateAnswer, QUESTION_TYPE_LABELS } from '../lib/gameLogic'

// ===== AUDIO =====
let audioCtx = null
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}
function playTone(f, t, d, v = 0.1, on = true) {
  if (!on) return
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    const osc = ctx.createOscillator(), gain = ctx.createGain()
    osc.type = t; osc.frequency.value = f
    gain.gain.setValueAtTime(v, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + d)
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + d)
  } catch {}
}
function soundSuccess(on) { playTone(523.25, 'sine', 0.1, 0.1, on); setTimeout(() => playTone(659.25, 'sine', 0.1, 0.1, on), 100); setTimeout(() => playTone(1046.5, 'sine', 0.4, 0.1, on), 200) }
function soundError(on) { playTone(300, 'sawtooth', 0.2, 0.1, on); setTimeout(() => playTone(250, 'sawtooth', 0.3, 0.1, on), 150) }
function fireConfetti(repeat = false) {
  if (typeof window.confetti !== 'function') return
  window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } })
  if (repeat) { const iv = setInterval(() => window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }), 1000); setTimeout(() => clearInterval(iv), 4000) }
}

const EXPLANATION_OPTIONS = [
  { value: 'tong3goc', label: 'Vì tổng 3 góc trong một tam giác bằng 180°.' },
  { value: 'tamgiacvuong', label: 'Vì trong tam giác vuông, tổng hai góc nhọn bằng 90°.' },
  { value: 'tamgiacdeu', label: 'Vì trong tam giác đều, 3 góc bằng nhau, mỗi góc 60°.' },
  { value: 'tamgiaccan', label: 'Vì trong tam giác cân, hai góc ở đáy bằng nhau.' },
  { value: 'gocbet', label: 'Vì đây là hai góc kề bù, có tổng bằng 180°.' },
]

export default function TestPlayer() {
  const { testId } = useParams()
  const navigate = useNavigate()

  const [test, setTest] = useState(null)
  const [allQuestions, setAllQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [screen, setScreen] = useState('start')
  const [sessionQs, setSessionQs] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [conceptMistakes, setConceptMistakes] = useState({})

  // Universal answer states
  const [userAnswer, setUserAnswer] = useState('')        // string for mc/fill/tf/input
  const [userExplanation, setUserExplanation] = useState('') // for type=input
  const [selectedImage, setSelectedImage] = useState('')   // for type=image
  const [orderList, setOrderList] = useState([])           // for type=ordering

  const [feedback, setFeedback] = useState({ show: false, type: '', msg: '' })
  const [submitDisabled, setSubmitDisabled] = useState(false)

  const [timeElapsed, setTimeElapsed] = useState(0)
  const timerRef = useRef(null)
  const [soundOn, setSoundOn] = useState(true)
  const [volume, setVolume] = useState(0.3)
  const bgmRef = useRef(null)
  const musicStarted = useRef(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    loadData()
    if (!window.confetti) {
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
      document.head.appendChild(s)
    }
  }, [testId])

  async function loadData() {
    try {
      const [allTests, qs] = await Promise.all([getTests(), getQuestions(testId)])
      const found = allTests.find(t => t.id === testId)
      if (!found || !found.is_published) { setError('Bài test này không tồn tại hoặc chưa được mở.'); return }
      setTest(found); setAllQuestions(qs)
    } catch (err) { setError('Lỗi: ' + err.message) }
    finally { setLoading(false) }
  }

  function startGame() {
    if (soundOn && !musicStarted.current && bgmRef.current) { bgmRef.current.play().catch(() => {}); musicStarted.current = true }
    const qs = buildSessionQuestions(allQuestions)
    if (!qs.length) return alert('Bài test chưa có câu hỏi!')
    setSessionQs(qs); setCurrentIndex(0); setTotalScore(0); setConceptMistakes({}); setWrongAttempts(0)
    setFeedback({ show: false, type: '', msg: '' }); setTimeElapsed(0); setScreen('play')
    clearInterval(timerRef.current); timerRef.current = setInterval(() => setTimeElapsed(t => t + 1), 1000)
  }

  // Reset per-question
  useEffect(() => {
    if (screen !== 'play') return
    setWrongAttempts(0); setUserAnswer(''); setUserExplanation(''); setSelectedImage('')
    setFeedback({ show: false, type: '', msg: '' }); setSubmitDisabled(false)
    // Init ordering list from shuffled options
    const q = sessionQs[currentIndex]
    if (q?.type === 'ordering' && q.options) {
      setOrderList([...q.options])
    } else {
      setOrderList([])
    }
  }, [currentIndex, screen])

  function getUserAnswerForType(q) {
    switch (q.type) {
      case 'multiple_choice': return userAnswer
      case 'fill_text': return userAnswer
      case 'true_false': return userAnswer
      case 'ordering': return orderList
      case 'image': return selectedImage
      case 'input': return userAnswer
      default: return userAnswer
    }
  }

  function validateBeforeSubmit(q) {
    switch (q.type) {
      case 'multiple_choice': return userAnswer !== '' || '⚠️ Hãy chọn một đáp án!'
      case 'fill_text': return userAnswer.trim() !== '' || '⚠️ Hãy điền đáp án!'
      case 'true_false': return userAnswer !== '' || '⚠️ Hãy chọn Đúng hoặc Sai!'
      case 'ordering': return true
      case 'image': return selectedImage !== '' || '⚠️ Hãy chọn một hình ảnh!'
      case 'input':
        if (userAnswer === '' || isNaN(parseInt(userAnswer))) return '⚠️ Hãy nhập số!'
        if (!userExplanation) return '⚠️ Hãy chọn lý do giải thích!'
        return true
      default: return true
    }
  }

  function checkAnswer() {
    const q = sessionQs[currentIndex]
    if (!q) return
    const valid = validateBeforeSubmit(q)
    if (valid !== true) return alert(valid)

    const ans = getUserAnswerForType(q)
    const { isCorrect, expCorrect } = evaluateAnswer(q, ans, userExplanation)

    if (isCorrect && expCorrect) {
      soundSuccess(soundOn)
      const pts = Math.max(2, 10 - wrongAttempts * 2)
      setTotalScore(s => s + pts)
      setFeedback({ show: true, type: 'correct', msg: `⭐ Chính xác! Cộng ${pts} điểm.` })
      setSubmitDisabled(true); fireConfetti(false)
      setTimeout(() => {
        if (currentIndex + 1 >= sessionQs.length) finishGame()
        else setCurrentIndex(i => i + 1)
      }, 2000)
    } else {
      const nw = wrongAttempts + 1; setWrongAttempts(nw)
      const mistakeKey = q.explanation_key || q.type
      setConceptMistakes(m => ({ ...m, [mistakeKey]: true }))
      soundError(soundOn); setShake(true); setTimeout(() => setShake(false), 500)
      const prefix = !isCorrect ? '❌ <b>Sai rồi:</b> ' : '❌ <b>Giải thích chưa chuẩn:</b> '
      const hintMsg = q.hints?.[Math.min(nw - 1, 2)] || 'Hãy suy nghĩ kỹ hơn nhé!'
      setFeedback({ show: true, type: 'hint', msg: `${prefix} ${hintMsg} <br><small style="color:#888;font-weight:normal;">(Bị trừ 2 điểm - Lượt thử: ${nw})</small>` })
    }
  }

  function finishGame() {
    clearInterval(timerRef.current); soundSuccess(soundOn); setTimeout(() => soundSuccess(soundOn), 1000)
    fireConfetti(true); setScreen('end')
  }

  function toggleSound() {
    const v = !soundOn; setSoundOn(v)
    if (bgmRef.current) { if (v && musicStarted.current) bgmRef.current.play().catch(() => {}); else bgmRef.current.pause() }
  }

  function handleVolumeChange(e) {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (bgmRef.current) bgmRef.current.volume = v
    if (v === 0) setSoundOn(false)
    else if (!soundOn) { setSoundOn(true); if (musicStarted.current) bgmRef.current.play().catch(() => {}) }
  }

  // Ordering: move item
  function moveOrder(fromIdx, toIdx) {
    if (toIdx < 0 || toIdx >= orderList.length) return
    const n = [...orderList]; const [item] = n.splice(fromIdx, 1); n.splice(toIdx, 0, item); setOrderList(n)
  }

  if (loading) return <div className="game-wrapper"><div className="game-container" style={{ textAlign: 'center', padding: 60 }}>⏳ Đang tải...</div></div>
  if (error) return <div className="game-wrapper"><div className="game-container" style={{ textAlign: 'center' }}><div style={{ fontSize: 48 }}>😢</div><h2 style={{ color: 'var(--error)' }}>{error}</h2><button className="btn-action" onClick={() => navigate('/')}>Về trang chủ</button></div></div>

  const q = sessionQs[currentIndex]

  return (
    <div className="game-wrapper">
      <audio ref={bgmRef} loop onCanPlay={e => { e.target.volume = volume }}><source src="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3" type="audio/mpeg" /></audio>
      <div className={`game-container${shake ? ' shake' : ''}`}>
        <div className="sound-controls" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="sound-btn" onClick={toggleSound} title={soundOn ? 'Tắt âm' : 'Bật âm'}>
            {volume === 0 || !soundOn ? '🔇' : volume < 0.4 ? '🔉' : '🔊'}
          </button>
          <input
            type="range" min={0} max={1} step={0.05} value={soundOn ? volume : 0}
            onChange={handleVolumeChange}
            style={{ width: 70, accentColor: 'var(--primary)', cursor: 'pointer' }}
            title={`Âm lượng: ${Math.round((soundOn ? volume : 0) * 100)}%`}
          />
        </div>
        <button className="mode-switch" onClick={() => navigate('/')}>🏠 Về trang chủ</button>
        <h1>🐪 MẬT MÃ KIM TỰ THÁP 🐪</h1>
        {test && <p style={{ color: 'var(--secondary)', fontWeight: 'bold', marginTop: -10 }}>{test.title}</p>}

        {/* START */}
        {screen === 'start' && (
          <div>
            <div className="ai-box">
              <div className="ai-avatar">🤖</div>
              <div className="ai-bubble">
                <b>"Chào các bạn!"</b><br /><br />
                Hãy vận dụng tư duy để mở các cánh cửa bí mật! Trả lời đúng ngay lần đầu = <b>10 điểm</b>. Mỗi lần sai trừ 2 điểm nhưng có gợi ý.
              </div>
            </div>
            {allQuestions.length === 0
              ? <p style={{ color: 'var(--error)', fontWeight: 'bold' }}>⚠️ Bài test chưa có câu hỏi.</p>
              : <button className="btn-action" onClick={startGame}>BẮT ĐẦU KHÁM PHÁ 🗺️</button>}
          </div>
        )}

        {/* PLAY */}
        {screen === 'play' && q && (
          <div>
            <div className="status-bar">
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${(currentIndex / sessionQs.length) * 100}%` }} />
                <div className="progress-text">Cửa ải: {currentIndex + 1}/{sessionQs.length}</div>
              </div>
              <div className="timer-badge">⏱️ {formatTime(timeElapsed)}</div>
              <div className="info-badge">⭐ {totalScore}</div>
            </div>

            <div className="question-card">
              <div className="question-text"><b>Câu {currentIndex + 1}:</b> {q.question_text}</div>
              {q.question_image && (
                <img src={q.question_image} alt="Hình đề bài"
                  style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 10, margin: '10px auto 4px', display: 'block', border: '2px solid #eee' }} />
              )}

              {/* ===== MULTIPLE CHOICE ===== */}
              {q.type === 'multiple_choice' && q.options && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((opt, i) => (
                    <button key={i} disabled={submitDisabled}
                      onClick={() => setUserAnswer(String(i))}
                      style={{
                        textAlign: 'left', padding: '12px 16px', borderRadius: 10, fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
                        border: userAnswer === String(i) ? '3px solid var(--primary)' : '2px solid #ddd',
                        background: userAnswer === String(i) ? '#fff3e0' : 'white',
                        transition: '0.2s',
                      }}>
                      <span style={{ color: 'var(--secondary)', marginRight: 10 }}>{String.fromCharCode(65 + i)}.</span> {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* ===== FILL TEXT ===== */}
              {q.type === 'fill_text' && (
                <div className="input-row" style={{ justifyContent: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 'bold' }}>Đáp án:</span>
                  <input type="text" value={userAnswer} onChange={e => setUserAnswer(e.target.value)}
                    disabled={submitDisabled} placeholder="Nhập đáp án..."
                    style={{ fontSize: 20, padding: 10, width: 220, textAlign: 'center', border: '3px solid var(--secondary)', borderRadius: 12, fontWeight: 'bold' }}
                    onKeyDown={e => e.key === 'Enter' && checkAnswer()}
                  />
                </div>
              )}

              {/* ===== TRUE FALSE ===== */}
              {q.type === 'true_false' && (
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                  {[{ val: 'true', label: 'ĐÚNG', color: 'var(--success)' }, { val: 'false', label: 'SAI', color: 'var(--error)' }].map(o => (
                    <button key={o.val} disabled={submitDisabled} onClick={() => setUserAnswer(o.val)}
                      style={{
                        padding: '16px 36px', borderRadius: 16, fontSize: 20, fontWeight: 900, cursor: 'pointer',
                        border: userAnswer === o.val ? `4px solid ${o.color}` : '3px solid #ccc',
                        background: userAnswer === o.val ? (o.val === 'true' ? '#e8f5e9' : '#fff0f3') : 'white',
                        color: o.color, transition: '0.2s',
                      }}>{o.label}</button>
                  ))}
                </div>
              )}

              {/* ===== ORDERING ===== */}
              {q.type === 'ordering' && (
                <div style={{ width: '100%' }}>
                  <p style={{ fontSize: 14, color: '#888', margin: '0 0 10px', textAlign: 'center' }}>Kéo hoặc dùng nút mũi tên để sắp xếp thứ tự đúng:</p>
                  {orderList.map((item, i) => (
                    <div key={`${item}-${i}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 6,
                        background: 'white', border: '2px solid #ddd', borderRadius: 10
                      }}>
                      <span style={{ fontWeight: 900, color: 'var(--secondary)', width: 24 }}>{i + 1}.</span>
                      <span style={{ flex: 1, fontSize: 16 }}>{item}</span>
                      <button disabled={submitDisabled || i === 0} onClick={() => moveOrder(i, i - 1)}
                        style={{ background: 'none', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', padding: '2px 8px', fontSize: 16 }}>▲</button>
                      <button disabled={submitDisabled || i === orderList.length - 1} onClick={() => moveOrder(i, i + 1)}
                        style={{ background: 'none', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', padding: '2px 8px', fontSize: 16 }}>▼</button>
                    </div>
                  ))}
                </div>
              )}

              {/* ===== IMAGE ===== */}
              {q.type === 'image' && (
                <div className="image-select-area">
                  {(q.options || []).map((opt, idx) => (
                    <div key={idx} className={`img-option${selectedImage === opt ? ' selected' : ''}`}
                      onClick={() => !submitDisabled && setSelectedImage(opt)}>
                      {q.image_mode === 'upload'
                        ? <img src={opt} alt={`Hình ${idx + 1}`} />
                        : <span dangerouslySetInnerHTML={{ __html: generateTriangleSVG(opt, 150, 110) }} />}
                      <div style={{ fontWeight: 'bold', marginTop: 10, color: 'var(--text)' }}>Hình {idx + 1}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* ===== INPUT (TOÁN) ===== */}
              {q.type === 'input' && (
                <>
                  <div style={{ marginBottom: 20 }} dangerouslySetInnerHTML={{ __html: generateTriangleSVG(q.triangle_type || 'thuong') }} />
                  <div className="input-row">
                    <span style={{ fontSize: 18, fontWeight: 'bold' }}>Đáp án:</span>
                    <input type="number" value={userAnswer} onChange={e => setUserAnswer(e.target.value)}
                      placeholder="?" disabled={submitDisabled}
                      onKeyDown={e => e.key === 'Enter' && document.getElementById('expSelect')?.focus()} />
                    <span style={{ fontSize: 18, fontWeight: 'bold' }}>độ (°)</span>
                  </div>
                  <div className="input-row" style={{ display: 'flex' }}>
                    <select id="expSelect" className="explanation-select" value={userExplanation}
                      onChange={e => setUserExplanation(e.target.value)} disabled={submitDisabled}>
                      <option value="">-- Vì sao em chọn đáp án này? --</option>
                      {EXPLANATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>

            <button className="btn-action" disabled={submitDisabled} onClick={checkAnswer}>CHỐT ĐÁP ÁN 🚪</button>

            {feedback.show && feedback.type === 'hint' && (
              <div className="feedback-box hint" style={{ display: 'block' }} dangerouslySetInnerHTML={{ __html: feedback.msg }} />
            )}
            {feedback.show && feedback.type === 'correct' && (
              <div className="feedback-box message" style={{ display: 'block' }}>{feedback.msg}</div>
            )}
          </div>
        )}

        {/* END */}
        {screen === 'end' && (
          <div>
            <div className="status-bar">
              <div className="progress-bar-container"><div className="progress-bar" style={{ width: '100%' }} /><div className="progress-text">HOÀN THÀNH</div></div>
              <div className="timer-badge">⏱️ {formatTime(timeElapsed)}</div>
              <div className="info-badge">⭐ {totalScore}</div>
            </div>
            <div style={{ marginTop: 20, border: '3px dashed var(--secondary)', padding: 20, borderRadius: 15, background: 'white' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: 28 }}>🎉 HOÀN THÀNH THỬ THÁCH 🎉</h2>
                <div style={{ background: '#f8f9fa', border: '2px solid #ccc', borderRadius: 10, padding: 15, marginTop: 15, display: 'inline-block' }}>
                  <div style={{ fontSize: 22, fontWeight: 'bold' }}>Tổng điểm: <span style={{ color: 'var(--error)', fontSize: 30 }}>{totalScore}</span> / {sessionQs.length * 10}</div>
                  <div style={{ fontSize: 18, marginTop: 5 }}>⏱️ Thời gian: <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{formatTime(timeElapsed)}</span></div>
                </div>
              </div>

              {Object.keys(conceptMistakes).length === 0 ? (
                <div className="ai-box" style={{ background: '#e3f2fd', borderColor: '#42a5f5' }}>
                  <div className="ai-avatar">🤖</div>
                  <div className="ai-bubble"><b>Hoàn hảo!</b> Em trả lời đúng ngay lần đầu tất cả! 🏆</div>
                </div>
              ) : (
                <div className="ai-box" style={{ background: '#fff3e0', borderColor: '#ff9800', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 10 }}>
                    <div className="ai-avatar" style={{ animation: 'none' }}>🤖</div>
                    <div className="ai-bubble"><b>Em làm rất tốt!</b> Hãy ôn lại những phần bị nhầm để lần sau lấy trọn điểm nhé!</div>
                  </div>
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-action" onClick={startGame}>CHƠI LẠI 🔄</button>
                <button className="btn-action" style={{ background: 'var(--secondary)', boxShadow: '0 8px 0 #1a7f9e' }} onClick={() => navigate('/')}>Chọn bài khác 📋</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
