import type { AiChatMessage, AiSettings } from '@chill-bar/shared'

interface AvalAiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AvalAiResponse {
  choices?: { message?: { content?: string } }[]
  error?: { message?: string }
}

export async function callAvalAiChat(
  settings: AiSettings,
  messages: AvalAiMessage[],
): Promise<string> {
  const base = settings.baseUrl.replace(/\/$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
      response_format: { type: 'json_object' },
    }),
  })

  const data = (await res.json()) as AvalAiResponse
  if (!res.ok) {
    throw new Error(data.error?.message ?? `AvalAI error ${res.status}`)
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('پاسخی از AvalAI دریافت نشد')
  return content
}

export function trimHistory(history: AiChatMessage[], max: number): AiChatMessage[] {
  return history.slice(-max)
}

export async function testAvalAiConnection(settings: AiSettings): Promise<string> {
  const reply = await callAvalAiChat(settings, [
    {
      role: 'system',
      content: 'You are a test bot. Reply with JSON: {"reply":"ok","inScope":true,"itemIds":[]}',
    },
    { role: 'user', content: 'ping' },
  ])
  return reply.slice(0, 120)
}
