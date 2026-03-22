// ===== GỢI Ý CHUẨN SƯ PHẠM =====
export const stdHints = {
  tong3goc: [
    'Em hãy nhớ lại kiến thức tổng số đo các góc trong tam giác nhé.',
    'Nhắc em nè: Tổng số đo các góc trong tam giác luôn là 180 độ nhé.',
  ],
  tamgiacvuong: [
    'Em hãy nhớ lại kiến thức về tổng hai góc nhọn trong tam giác vuông nhé.',
    'Nhắc em nè: Trong tam giác vuông, hai góc nhọn cộng lại luôn bằng 90 độ nhé.',
  ],
  tamgiaccan: [
    'Em hãy nhớ lại đặc điểm các góc ở đáy của tam giác cân nhé.',
    'Nhắc em nè: Trong tam giác cân, hai góc ở đáy luôn có số đo bằng nhau nhé.',
  ],
  tamgiacdeu: [
    'Em hãy nhớ lại số đo các góc trong tam giác đều nhé.',
    'Nhắc em nè: Tam giác đều có 3 góc bằng nhau và mỗi góc luôn bằng 60 độ nhé.',
  ],
  gocbet: [
    'Em hãy nhớ lại tổng số đo của hai góc kề bù (trên đường thẳng) nhé.',
    'Nhắc em nè: Hai góc nằm trên cùng một đường thẳng luôn có tổng là 180 độ nhé.',
  ],
  image: [
    'Em hãy quan sát kỹ các hình ảnh nhé.',
    'Nhắc em nè: Chú ý các đặc điểm hình học của loại tam giác đề bài yêu cầu.',
  ],
}

// ===== VẼ TAM GIÁC SVG =====
export function generateTriangleSVG(type, w = 200, h = 150) {
  let pathD = ''
  let labels = ''
  switch (type) {
    case 'vuong':
      pathD = 'M 40,120 L 160,120 L 40,20 Z'
      labels = `<path d="M 40,105 L 55,105 L 55,120" stroke="#d00000" fill="none" stroke-width="2"/>`
      break
    case 'can':
      pathD = 'M 100,20 L 40,120 L 160,120 Z'
      labels = `<path d="M 60,70 L 70,80 M 140,70 L 130,80" stroke="#023047" stroke-width="3"/>`
      break
    case 'deu':
      pathD = 'M 100,20 L 40,120 L 160,120 Z'
      labels = `<path d="M 60,70 L 70,80 M 140,70 L 130,80 M 90,120 L 100,110 M 110,120 L 100,110" stroke="#023047" stroke-width="2"/>`
      break
    case 'vuongcan':
      pathD = 'M 80,120 L 160,120 L 80,40 Z'
      labels = `<path d="M 80,105 L 95,105 L 95,120" stroke="#d00000" fill="none" stroke-width="2"/><path d="M 120,80 L 110,70 M 120,120 L 110,110" stroke="#023047" stroke-width="2"/>`
      break
    case 'tu':
      pathD = 'M 20,120 L 180,120 L 140,40 Z'
      break
    default:
      pathD = 'M 80,30 L 20,120 L 170,120 Z'
      break
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 200 150"><path d="${pathD}" fill="#8ecae6" stroke="#219ebc" stroke-width="4" stroke-linejoin="round"/>${labels}</svg>`
}

// ===== FORMAT THỜI GIAN =====
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s)
}

// ===== XÁC NHẬN ĐÁP ÁN =====
export function evaluateAnswer(question, userAnswer, userExplanation) {
  if (question.type === 'image') {
    return {
      isCorrect: userAnswer === question.answer,
      expCorrect: true,
    }
  } else {
    const uAns = parseInt(userAnswer)
    return {
      isCorrect: uAns === parseInt(question.answer),
      expCorrect: userExplanation === question.explanation_key,
    }
  }
}

// ===== TRỘN CÂU HỎI (tối đa 20, ~17 nhập / 3 hình) =====
export function buildSessionQuestions(questions) {
  const imgQs = questions.filter((q) => q.type === 'image').sort(() => 0.5 - Math.random())
  const inpQs = questions.filter((q) => q.type === 'input').sort(() => 0.5 - Math.random())

  let pool = []
  let imgCount = 0

  while (imgCount < 3 && imgQs.length > 0 && pool.length < 20) {
    pool.push(imgQs.pop())
    imgCount++
  }
  while (pool.length < 20) {
    if (inpQs.length > 0) pool.push(inpQs.pop())
    else if (imgQs.length > 0) pool.push(imgQs.pop())
    else break
  }

  return pool.slice(0, 20).sort(() => 0.5 - Math.random())
}

// ===== NÉN ẢNH UPLOAD =====
export function processImageFile(file) {
  return new Promise((resolve) => {
    if (!file) { resolve(null); return }
    const reader = new FileReader()
    reader.onload = function (e) {
      const img = new Image()
      img.onload = function () {
        const canvas = document.createElement('canvas')
        const MAX = 150
        let w = img.width, h = img.height
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX } }
        else { if (h > MAX) { w *= MAX / h; h = MAX } }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.6))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}
