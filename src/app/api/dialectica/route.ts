import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are an expert debate assistant. Given a statement, analyze it and return a JSON object with the following fields:\n- statement: the original statement\n- proArguments: an array of arguments in favor, each with title, score (1-10), description, counterArguments (array), and evidence (array of {title, description})\n- conArguments: an array of arguments against, each with the same structure\n- balancedPerspective: a summary paragraph\n\nReturn ONLY valid JSON, no extra commentary.`;

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
        max_tokens: 512,
      }),
    });

    if (!openaiRes.ok) {
      const error = await openaiRes.text();
      return NextResponse.json({ error: 'OpenAI API error', details: error }, { status: 500 });
    }

    const data = await openaiRes.json();
    return NextResponse.json({ result: data });
  } catch (error) {
    return NextResponse.json({ error: 'Server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 