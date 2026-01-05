import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { htmlContent } = await request.json();

    if (!htmlContent) {
      return NextResponse.json({ error: 'Missing HTML content' }, { status: 400 });
    }

    if (!htmlContent.toLowerCase().includes('realestate.com.au')) {
      return NextResponse.json({ error: 'Content must be from realestate.com.au' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 });
    }

    // Use OpenAI to analyze the property listing
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a real estate expert analyzing property listings. Extract key information and provide an objective analysis of pros and cons.

Return your response as a valid JSON object with this exact structure:
{
  "summary": "A 2-3 sentence overview of the property",
  "keyDetails": {
    "price": "price if available",
    "bedrooms": "number of bedrooms",
    "bathrooms": "number of bathrooms",
    "parking": "parking spaces",
    "propertyType": "house/apartment/etc"
  },
  "pros": ["pro 1", "pro 2", "pro 3", ...],
  "cons": ["con 1", "con 2", "con 3", ...]
}

Include at least 3-5 pros and 3-5 cons. Be specific and practical. Focus on location, features, value, condition, and potential issues.`
          },
          {
            role: 'user',
            content: `Analyze this property listing and provide structured feedback:\n\n${htmlContent.slice(0, 15000)}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
        response_format: { type: "json_object" }
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

    // Parse the JSON response from OpenAI
    let analysis;
    try {
      analysis = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      return NextResponse.json({
        error: 'Failed to parse AI response',
        details: parseError instanceof Error ? parseError.message : String(parseError)
      }, { status: 500 });
    }

    // Validate the response structure
    if (!analysis.summary || !analysis.pros || !analysis.cons) {
      return NextResponse.json({
        error: 'Invalid analysis structure from AI'
      }, { status: 500 });
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Property Sage error:', error);
    return NextResponse.json({
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
