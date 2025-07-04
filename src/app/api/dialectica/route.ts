import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are an expert debate assistant. Given a statement, analyze it and return a JSON object with the following fields:\n- statement: the original statement\n- proArguments: an array of arguments in favor, each with:\n    - title (string)\n    - score (number, 1-10)\n    - description (string)\n    - counterArguments (array of at least one object, each with title, score, description; if none are obvious, invent a plausible one)\n    - evidence (array of objects, each with title, description)\n- conArguments: an array of arguments against, each with the same structure\n- balancedPerspective: a summary paragraph\n\nReturn ONLY valid JSON, no extra commentary. If you cannot provide evidence, use an empty array for that field. Always provide at least one counterArgument for each argument, even if you must invent a plausible one.`;

function extractFirstJsonObject(text: string) {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonString = text.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 });
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4096,
      }),
    });

    if (!openaiRes.ok) {
      const error = await openaiRes.text();
      return NextResponse.json({ error: 'OpenAI API error', details: error }, { status: 500 });
    }

    const data = await openaiRes.json();
    // Log the raw OpenAI response content for debugging
    let parsed = null;
    if (data.choices && data.choices[0]?.message?.content) {
      console.log('OpenAI raw response:', data.choices[0].message.content);
      parsed = extractFirstJsonObject(data.choices[0].message.content);
    } else {
      console.log('OpenAI response missing content:', data);
    }
    return NextResponse.json({ result: data, parsed });
  } catch (error) {
    return NextResponse.json({ error: 'Server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 