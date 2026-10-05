import 'server-only'
import { presignGet } from '@/lib/b2/presign'
import { env } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase/admin'

const MAX_AUDIO_BYTES = 8 * 1024 * 1024

/**
 * The single AI touchpoint: speech-to-text on a voice note. Any OpenAI-compatible
 * /audio/transcriptions endpoint works. A failure marks the transcript unavailable
 * and never touches the comment itself.
 */
export async function transcribeComment(commentId: string): Promise<'done' | 'failed'> {
  const { data: comment } = await supabaseAdmin.from('comments').select('id,voice_note_key').eq('id', commentId).maybeSingle()
  if (!comment?.voice_note_key) return 'failed'
  await supabaseAdmin.from('comments').update({ transcript_status: 'pending' }).eq('id', commentId)
  try {
    if (!env.TRANSCRIPTION_API_KEY) throw new Error('Transcription is not configured')
    const audio = await fetch(await presignGet(comment.voice_note_key, 120), { cache: 'no-store' })
    if (!audio.ok) throw new Error(`Voice note unavailable (${audio.status})`)
    const bytes = await audio.arrayBuffer()
    if (bytes.byteLength > MAX_AUDIO_BYTES) throw new Error('Voice note is too large')
    const form = new FormData()
    const mp4 = comment.voice_note_key.endsWith('.mp4')
    form.append('file', new Blob([bytes], { type: mp4 ? 'audio/mp4' : 'audio/webm' }), mp4 ? 'voice-note.mp4' : 'voice-note.webm')
    form.append('model', env.TRANSCRIPTION_MODEL)
    form.append('response_format', 'json')
    const response = await fetch(`${env.TRANSCRIPTION_API_URL.replace(/\/$/, '')}/audio/transcriptions`, {
      method: 'POST', headers: { Authorization: `Bearer ${env.TRANSCRIPTION_API_KEY}` }, body: form,
      signal: AbortSignal.timeout(50_000),
    })
    if (!response.ok) throw new Error(`Transcription service returned ${response.status}`)
    const text = ((await response.json()) as { text?: string }).text?.trim()
    if (!text) throw new Error('Transcription returned no text')
    await supabaseAdmin.from('comments').update({ transcript: text, transcript_status: 'done' }).eq('id', commentId)
    return 'done'
  } catch {
    await supabaseAdmin.from('comments').update({ transcript_status: 'failed' }).eq('id', commentId)
    return 'failed'
  }
}
