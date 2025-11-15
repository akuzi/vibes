import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'nova' } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        fallback: true 
      }, { status: 500 });
    }

    // Generate high-quality TTS audio using OpenAI TTS API
    try {
      const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'tts-1-hd', // High quality voice model
          voice: voice, // Options: alloy, echo, fable, onyx, nova, shimmer
          input: text,
        }),
      });

      if (ttsRes.ok) {
        const audioBuffer = await ttsRes.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');
        
        return NextResponse.json({ 
          success: true,
          audioBase64: audioBase64, // Base64 encoded MP3 audio
          format: 'mp3'
        });
      } else {
        const errorText = await ttsRes.text();
        console.error('TTS API error:', errorText);
        return NextResponse.json({ 
          error: 'TTS API error',
          details: errorText,
          fallback: true
        }, { status: 500 });
      }
    } catch (ttsError) {
      console.error('TTS generation error:', ttsError);
      return NextResponse.json({ 
        error: 'TTS generation failed',
        details: ttsError instanceof Error ? ttsError.message : String(ttsError),
        fallback: true
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : String(error),
      fallback: true
    }, { status: 500 });
  }
}

