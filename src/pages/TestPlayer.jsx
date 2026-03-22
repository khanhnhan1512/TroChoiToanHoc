import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTests } from '../hooks/useTests'
import { getQuestions } from '../hooks/useTests'
import {
  buildSessionQuestions,
  generateTriangleSVG,
  formatTime,
  evaluateAnswer,
} from '../lib/gameLogic'

// ===== AUDIO =====
let audioCtx = null
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}
function playTone(f, t, d, v = 0.1, soundOn = true) {
  if (!soundOn) return
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = t; osc.frequency.value = f
    gain.gain.setValueAtTime(v, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + d)
    osc.connect(gain); gain.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + d)
  } catch (e) {}
}
function soundSuccess(on) {
  playTone(523.25, 'sine', 0.1, 0.1, on)
  setTimeout(() => playTone(659.25, 'sine', 0.1, 0.1, on), 100)
  setTimeout(() => playTone(1046.5, 'sine', 0.4, 0.1, on), 200)
}
function soundError(on) {
  playTone(300, 'sawtooth', 0.2, 0.1, on)
  setTimeout(() => playTone(250, 'sawtooth', 0.3, 0.1, on), 150)
}

// ===== CONFETTI =====
function fireConfetti(repeat = false) {
  if (typeof window.confetti === 'function') {
    window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } })
    if (repeat) {
      const interval = setInterval(() => window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }), 1000)
      setTimeout(() => clearInterval(interval), 4000)
    }
  }
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

  // Game state
  const [screen, setScreen] = useState('start') // 'start' | 'play' | 'end'
  const [sessionQs, setSessionQs] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [conceptMistakes, setConceptMistakes] = useState({})

  // Answer state
  const [answerInput, setAnswerInput] = useState('')
  const [explanationInput, setExplanationInput] = useState('')
  const [selectedImage, setSelectedImage] = useState('')
  const [feedback, setFeedback] = useState({ show: false, type: '', msg: '' }) // type: 'hint' | 'correct'
  const [submitDisabled, setSubmitDisabled] = useState(false)

  // Timer
  const [timeElapsed, setTimeElapsed] = useState(0)
  const timerRef = useRef(null)

  // Sound
  const [soundOn, setSoundOn] = useState(true)
  const bgmRef = useRef(null)
  const musicStarted = useRef(false)

  // Shake
  const [shake, setShake] = useState(false)

  useEffect(() => {
    loadData()
    // Load confetti
    if (!window.confetti) {
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
      document.head.appendChild(s)
    }
  }, [testId])

  async function loadData() {
    try {
      const [allTests, qs] = await Promise.all([getTests(), getQuestions(testId)])
      const found = allTests.find((t) => t.id === testId)
      if (!found || !found.is_published) {
        setError('Bài test này không tồn tại hoặc chưa được mở.')
        return
      }
      setTest(found)
      setAllQuestions(qs)
    } catch (err) {
      setError('Lỗi tải bài test: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function startGame() {
    if (soundOn && !musicStarted.current && bgmRef.current) {
      bgmRef.current.play().catch(() => {})
      musicStarted.current = true
    }

    const qs = buildSessionQuestions(allQuestions)
    if (qs.length === 0) return alert('Bài test này chưa có câu hỏi!')

    setSessionQs(qs)
    setCurrentIndex(0)
    setTotalScore(0)
    setConceptMistakes({})
    setWrongAttempts(0)
    setFeedback({ show: false, type: '', msg: '' })
    setTimeElapsed(0)
    setScreen('play')

    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setTimeElapsed((t) => t + 1), 1000)
  }

  // Reset per-question state when index changes
  useEffect(() => {
    if (screen !== 'play') return
    setWrongAttempts(0)
    setAnswerInput('')
    setExplanationInput('')
    setSelectedImage('')
    setFeedback({ show: false, type: '', msg: '' })
    setSubmitDisabled(false)
  }, [currentIndex, screen])

  function checkAnswer() {
    const q = sessionQs[currentIndex]
    if (!q) return

    if (q.type === 'image' && !selectedImage) return alert('⚠️ Em hãy click chọn một hình ảnh nhé!')
    if (q.type === 'input') {
      if (answerInput === '' || isNaN(parseInt(answerInput))) return alert('⚠️ Em quên nhập số đo độ rồi!')
      if (!explanationInput) return alert('⚠️ Em hãy chọn một lý do giải thích nhé!')
    }

    const userAns = q.type === 'image' ? selectedImage : answerInput
    const { isCorrect, expCorrect } = evaluateAnswer(q, userAns, explanationInput)

    if (isCorrect && expCorrect) {
      soundSuccess(soundOn)
      const pts = Math.max(2, 10 - wrongAttempts * 2)
      setTotalScore((s) => s + pts)
      setFeedback({ show: true, type: 'correct', msg: `⭐ Chính xác! Cộng ${pts} điểm.` })
      setSubmitDisabled(true)
      fireConfetti(false)

      setTimeout(() => {
        if (currentIndex + 1 >= sessionQs.length) {
          finishGame()
        } else {
          setCurrentIndex((i) => i + 1)
        }
      }, 2000)
    } else {
      const newWrong = wrongAttempts + 1
      setWrongAttempts(newWrong)

      if (q.type === 'input' && q.explanation_key) {
        setConceptMistakes((m) => ({ ...m, [q.explanation_key]: true }))
      } else if (q.type === 'image') {
        setConceptMistakes((m) => ({ ...m, image_logic: true }))
      }

      soundError(soundOn)
      setShake(true)
      setTimeout(() => setShake(false), 500)

      const prefix = !isCorrect ? '❌ <b>Sai rồi:</b> ' : '❌ <b>Giải thích chưa chuẩn:</b> '
      const hintMsg = q.hints[Math.min(newWrong - 1, 2)]
      setFeedback({
        show: true,
        type: 'hint',
        msg: `${prefix} ${hintMsg} <br><small style="color:#888;font-weight:normal;margin-top:5px;display:inline-block;">(Bị trừ 2 điểm - Lượt thử: ${newWrong})</small>`,
      })
    }
  }

  function finishGame() {
    clearInterval(timerRef.current)
    soundSuccess(soundOn)
    setTimeout(() => soundSuccess(soundOn), 1000)
    fireConfetti(true)
    setScreen('end')
  }

  function toggleSound() {
    const newVal = !soundOn
    setSoundOn(newVal)
    if (bgmRef.current) {
      if (newVal && musicStarted.current) bgmRef.current.play().catch(() => {})
      else bgmRef.current.pause()
    }
  }

  if (loading) return <div className="game-wrapper"><div className="game-container" style={{ textAlign: 'center', padding: 60 }}>⏳ Đang tải bài test...</div></div>
  if (error) return (
    <div className="game-wrapper">
      <div className="game-container" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>😢</div>
        <h2 style={{ color: 'var(--error)' }}>{error}</h2>
        <button className="btn-action" onClick={() => navigate('/')}>Về trang chủ</button>
      </div>
    </div>
  )

  const q = sessionQs[currentIndex]

  return (
    <div className="game-wrapper">
      <audio ref={bgmRef} loop>
        <source src="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3" type="audio/mpeg" />
      </audio>

      <div className={`game-container${shake ? ' shake' : ''}`} id="gameBox">
        <div className="sound-controls">
          <button className="sound-btn" onClick={toggleSound}>{soundOn ? '🔊' : '🔇'}</button>
        </div>
        <button className="mode-switch" onClick={() => navigate('/')}>🏠 Về trang chủ</button>

        <h1>🐪 MẬT MÃ KIM TỰ THÁP 🐪</h1>
        {test && <p style={{ color: 'var(--secondary)', fontWeight: 'bold', marginTop: -10 }}>{test.title}</p>}

        {/* ===== START SCREEN ===== */}
        {screen === 'start' && (
          <div id="startScreen">
            <div className="ai-box">
              <div className="ai-avatar">🤖</div>
              <div className="ai-bubble">
                <b>"Chào các bạn đến với trò chơi Mật Mã Kim Tự Tháp thú vị và sinh động nhất!"</b>
                <br /><br />
                Các bạn hãy vận dụng tư duy Toán học để mở các cánh cửa bí mật nhé. Nhớ giải thật nhanh vì thời gian cũng sẽ được tính để xếp hạng đấy!
                <br /><br />
                🎯 <b>Luật chơi:</b> Trả lời đúng ngay lần đầu được cộng <b>10 điểm</b>. Mỗi lần trả lời sai sẽ bị trừ 2 điểm, nhưng bù lại tớ sẽ đưa ra các gợi ý siêu hữu ích.
              </div>
            </div>
            {allQuestions.length === 0 ? (
              <p style={{ color: 'var(--error)', fontWeight: 'bold' }}>⚠️ Bài test này chưa có câu hỏi.</p>
            ) : (
              <button className="btn-action" onClick={startGame}>BẮT ĐẦU KHÁM PHÁ 🗺️</button>
            )}
          </div>
        )}

        {/* ===== PLAY SCREEN ===== */}
        {screen === 'play' && q && (
          <div id="playScreen">
            <div className="status-bar">
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${(currentIndex / sessionQs.length) * 100}%` }} />
                <div className="progress-text">Cửa ải: {currentIndex + 1} / {sessionQs.length}</div>
              </div>
              <div className="timer-badge">⏱️ {formatTime(timeElapsed)}</div>
              <div className="info-badge">⭐ Điểm: {totalScore}</div>
            </div>

            <div className="question-card">
              <div className="question-text">
                <b>Câu {currentIndex + 1}:</b> {q.question_text}
              </div>

              {/* Input question */}
              {q.type === 'input' && (
                <>
                  <div style={{ marginBottom: 20 }} dangerouslySetInnerHTML={{ __html: generateTriangleSVG(q.triangle_type || 'thuong') }} />
                  <div id="inputArea" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <div className="input-row">
                      <span style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--text)' }}>Đáp án:</span>
                      <input
                        type="number"
                        value={answerInput}
                        onChange={(e) => setAnswerInput(e.target.value)}
                        placeholder="?"
                        disabled={submitDisabled}
                        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('expSelect')?.focus()}
                      />
                      <span style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--text)' }}>độ (°)</span>
                    </div>
                  </div>
                  <div className="input-row" style={{ display: 'flex' }}>
                    <select
                      id="expSelect"
                      className="explanation-select"
                      value={explanationInput}
                      onChange={(e) => setExplanationInput(e.target.value)}
                      disabled={submitDisabled}
                    >
                      <option value="">-- Vì sao em chọn đáp án này? --</option>
                      {EXPLANATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Image question */}
              {q.type === 'image' && (
                <div className="image-select-area">
                  {(q.options || []).map((opt, idx) => (
                    <div
                      key={idx}
                      className={`img-option${selectedImage === opt ? ' selected' : ''}`}
                      onClick={() => !submitDisabled && setSelectedImage(opt)}
                    >
                      {q.image_mode === 'upload'
                        ? <img src={opt} alt={`Hình ${idx + 1}`} />
                        : <span dangerouslySetInnerHTML={{ __html: generateTriangleSVG(opt, 150, 110) }} />
                      }
                      <div style={{ fontWeight: 'bold', marginTop: 10, color: 'var(--text)' }}>Hình {idx + 1}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn-action" disabled={submitDisabled} onClick={checkAnswer}>
              CHỐT ĐÁP ÁN 🚪
            </button>

            {feedback.show && feedback.type === 'hint' && (
              <div className="feedback-box hint" style={{ display: 'block' }} dangerouslySetInnerHTML={{ __html: feedback.msg }} />
            )}
            {feedback.show && feedback.type === 'correct' && (
              <div className="feedback-box message" style={{ display: 'block' }}>{feedback.msg}</div>
            )}
          </div>
        )}

        {/* ===== END SCREEN ===== */}
        {screen === 'end' && (
          <div id="playScreen">
            <div className="status-bar">
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: '100%' }} />
                <div className="progress-text">HOÀN THÀNH</div>
              </div>
              <div className="timer-badge">⏱️ {formatTime(timeElapsed)}</div>
              <div className="info-badge">⭐ Điểm: {totalScore}</div>
            </div>

            <div style={{ marginTop: 20, fontSize: 18, textAlign: 'left', border: '3px dashed var(--secondary)', padding: 20, borderRadius: 15, background: 'white' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: 28 }}>🎉 HOÀN THÀNH THỬ THÁCH 🎉</h2>
                <div style={{ background: '#f8f9fa', border: '2px solid #ccc', borderRadius: 10, padding: 15, marginTop: 15, display: 'inline-block' }}>
                  <div style={{ fontSize: 22, fontWeight: 'bold', color: 'var(--text)' }}>
                    Tổng điểm: <span style={{ color: 'var(--error)', fontSize: 30 }}>{totalScore}</span> / {sessionQs.length * 10}
                  </div>
                  <div style={{ fontSize: 18, color: 'var(--text)', marginTop: 5 }}>
                    ⏱️ Thời gian: <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{formatTime(timeElapsed)}</span>
                  </div>
                </div>
              </div>

              {Object.keys(conceptMistakes).length === 0 ? (
                <div className="ai-box" style={{ background: '#e3f2fd', borderColor: '#42a5f5' }}>
                  <div className="ai-avatar">🤖</div>
                  <div className="ai-bubble">
                    <b>Hoàn hảo!</b> Em trả lời đúng ngay lần đầu tiên tất cả các câu. Tư duy Toán học của em cực kỳ nhạy bén. Cô AI dành tặng em danh hiệu <b>Thám Tử Toán Học Xuất Sắc</b> nhé! 🏆
                  </div>
                </div>
              ) : (
                <div className="ai-box" style={{ background: '#fff3e0', borderColor: '#ff9800', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 10 }}>
                    <div className="ai-avatar" style={{ animation: 'none' }}>🤖</div>
                    <div className="ai-bubble"><b>Em làm rất tốt vì đã kiên trì đến cùng!</b> Nhưng hãy cùng nhắc lại một số kiến thức em bị nhầm lẫn để lần sau lấy trọn điểm 10 nhé:</div>
                  </div>
                  <ul style={{ color: 'var(--error)', margin: 0, paddingLeft: 20 }}>
                    {conceptMistakes.tong3goc && <li><b>Tổng 3 góc:</b> Luôn nhớ tổng các góc trong một tam giác bằng 180° nhé!</li>}
                    {conceptMistakes.tamgiacvuong && <li><b>Tam giác vuông:</b> Có một góc 90°. Hai góc nhọn còn lại gộp lại cũng bằng 90°.</li>}
                    {conceptMistakes.tamgiaccan && <li><b>Tam giác cân:</b> Hai góc ở đáy của nó luôn có số đo bằng nhau.</li>}
                    {conceptMistakes.tamgiacdeu && <li><b>Tam giác đều:</b> Cả 3 góc đều bằng nhau và bằng chính xác 60°.</li>}
                    {conceptMistakes.gocbet && <li><b>Góc bẹt:</b> Các góc kề bù nằm trên một đường thẳng luôn có tổng bằng 180°.</li>}
                    {conceptMistakes.image_logic && <li><b>Nhận diện hình:</b> Hãy quan sát thật kỹ các vạch kẻ và kí hiệu góc vuông màu đỏ trên hình vẽ nhé.</li>}
                  </ul>
                  <div style={{ marginTop: 10, fontStyle: 'italic', color: '#555', textAlign: 'center', width: '100%' }}>
                    Những lỗi sai hôm nay sẽ giúp em nhớ bài lâu hơn. Đừng nản chí nhé! 💪
                  </div>
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-action" onClick={startGame}>CHƠI LẠI VÒNG MỚI 🔄</button>
                <button className="btn-action" style={{ background: 'var(--secondary)', boxShadow: '0 8px 0 #1a7f9e' }} onClick={() => navigate('/')}>
                  Chọn bài khác 📋
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
