export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { messages, context } = (await req.json()) as {
    messages: { role: 'user' | 'assistant'; content: string }[]
    context: string
  }

  const system = `You are Zeery AI — a smart, friendly personal finance assistant built into the Zeery app.
You help users understand their spending, find patterns, and plan for the future.
Always reply in the same language the user writes in. If they write Thai, reply in Thai. If English, reply in English.
Be concise, warm, and specific. Use the user's actual numbers. Never invent data.

${context}`

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system,
      stream: true,
      messages,
    }),
  })

  if (!anthropicRes.ok || !anthropicRes.body) {
    const errText = await anthropicRes.text()
    return new Response(errText, { status: anthropicRes.status })
  }

  return new Response(anthropicRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
