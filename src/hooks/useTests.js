import { supabase } from '../lib/supabase'

// ===== TESTS =====
export async function getTests(publishedOnly = false) {
  let query = supabase.from('tests').select('*').order('created_at', { ascending: false })
  if (publishedOnly) query = query.eq('is_published', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createTest(title, description = '') {
  const { data, error } = await supabase
    .from('tests')
    .insert({ title, description, is_published: false })
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
