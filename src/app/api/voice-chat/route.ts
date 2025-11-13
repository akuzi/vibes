import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 });
    }

    // Build conversation history
    const messages = [
      { 
        role: 'system', 
        content: 'You are a helpful and friendly AI assistant. Respond naturally and conversationally, as if you are having a voice conversation. Keep responses concise and clear for voice playback.' 
      },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const error = await openaiRes.text();
      return NextResponse.json({ error: 'OpenAI API error', details: error }, { status: 500 });
    }

    const data = await openaiRes.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      return NextResponse.json({ error: 'Invalid response from OpenAI' }, { status: 500 });
    }

    const responseText = data.choices[0].message.content;

    return NextResponse.json({ 
      response: responseText,
      conversationHistory: [
        ...messages.slice(1), // Remove system message
        { role: 'assistant', content: responseText }
      ]
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

