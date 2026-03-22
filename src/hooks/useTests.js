import { supabase } from '../lib/supabase'

// ===== GRADES =====
export async function getGrades() {
  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .order('level', { ascending: true })
  if (error) throw error
  return data
}

// ===== SUBJECTS =====
export async function getSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('*, grades(id, name, level)')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createSubject(name, icon = '📚', gradeId = null) {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ name, icon, grade_id: gradeId })
    .select('*, grades(id, name, level)')
    .single()
  if (error) throw error
  return data
}

export async function updateSubject(id, fields) {
  const { data, error } = await supabase
    .from('subjects')
    .update(fields)
    .eq('id', id)
    .select('*, grades(id, name, level)')
    .single()
  if (error) throw error
  return data
}

export async function deleteSubject(id) {
  const { error } = await supabase.from('subjects').delete().eq('id', id)
  if (error) throw error
}

// ===== TESTS =====
export async function getTests(publishedOnly = false) {
  let query = supabase
    .from('tests')
    .select('*, subjects(name, grade_id, grades(name))')
    .order('created_at', { ascending: false })
  if (publishedOnly) query = query.eq('is_published', true)
  const { data, error } = await query
  if (error) throw error
  // Flatten subject/grade info for convenience
  return data.map(t => ({
    ...t,
    subject_name: t.subjects?.name || '',
    grade_name: t.subjects?.grades?.name || '',
  }))
}

export async function getTestsBySubject(subjectId, publishedOnly = false) {
  let query = supabase
    .from('tests')
    .select('*, subjects(name, grade_id, grades(name))')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })
  if (publishedOnly) query = query.eq('is_published', true)
  const { data, error } = await query
  if (error) throw error
  return data.map(t => ({
    ...t,
    subject_name: t.subjects?.name || '',
    grade_name: t.subjects?.grades?.name || '',
  }))
}

export async function createTest(title, description = '', subjectId = null) {
  const { data, error } = await supabase
    .from('tests')
    .insert({ title, description, subject_id: subjectId, is_published: false })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTest(id, fields) {
  const { data, error } = await supabase
    .from('tests')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTest(id) {
  const { error } = await supabase.from('tests').delete().eq('id', id)
  if (error) throw error
}

export async function togglePublish(id, currentValue) {
  return updateTest(id, { is_published: !currentValue })
}

// ===== QUESTIONS =====
export async function getQuestions(testId) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('test_id', testId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function saveQuestion(question) {
  if (question.id) {
    const { id, test_id, ...fields } = question
    const { data, error } = await supabase
      .from('questions')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('questions')
      .insert(question)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function deleteQuestion(id) {
  const { error } = await supabase.from('questions').delete().eq('id', id)
  if (error) throw error
}

// ===== AI MESSAGES =====
export async function getAiMessages(testId) {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('test_id', testId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function saveAiMessage(testId, role, content) {
  const { data, error } = await supabase
    .from('ai_messages')
    .insert({ test_id: testId, role, content })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function clearAiMessages(testId) {
  const { error } = await supabase
    .from('ai_messages')
    .delete()
    .eq('test_id', testId)
  if (error) throw error
}
