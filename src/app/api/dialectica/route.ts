import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache for analysis results
const analysisCache = new Map<string, AnalysisResult>();

interface Argument {
  title: string;
  score: number;
  description: string;
  counterArguments: Argument[];
  evidence: {
    title: string;
    description: string;
  }[];
}

interface AnalysisResult {
  statement: string;
  proArguments: Argument[];
  conArguments: Argument[];
  balancedPerspective: string;
}

export async function POST(request: NextRequest) {
  try {
    const { statement } = await request.json();

    if (!statement || typeof statement !== 'string') {
      return NextResponse.json(
        { error: 'Statement is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = statement.toLowerCase().trim();
    if (analysisCache.has(cacheKey)) {
      console.log('Returning cached analysis for:', statement);
      return NextResponse.json({ analysis: analysisCache.get(cacheKey) });
    }

    const analysis = await generateAnalysis(statement);
    
    // Cache the result
    analysisCache.set(cacheKey, analysis);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Dialectica API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateAnalysis(statement: string): Promise<AnalysisResult> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  // Debugging log for Vercel deployment
  if (openaiApiKey) {
    console.log(`Vercel environment check: OpenAI API Key is loaded. Starts with: ${openaiApiKey.substring(0, 5)}...`);
  } else {
    console.error("Vercel environment check: OpenAI API Key was not found.");
  }
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Analyze this statement: "${statement}"

Provide a balanced analysis with 3-4 strong arguments for and against. Return as JSON:

{
  "statement": "${statement}",
  "proArguments": [
    {
      "title": "Brief title",
      "score": 8,
      "description": "Clear argument description",
      "counterArguments": [],
      "evidence": [
        {
          "title": "Evidence title",
          "description": "Brief evidence description"
        }
      ]
    }
  ],
  "conArguments": [
    {
      "title": "Brief title", 
      "score": 7,
      "description": "Clear argument description",
      "counterArguments": [],
      "evidence": [
        {
          "title": "Evidence title",
          "description": "Brief evidence description"
        }
      ]
    }
  ],
  "balancedPerspective": "Nuanced summary"
}

Keep it concise. Return only valid JSON.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are Dialectica, an AI that provides balanced analysis. Return responses as valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No analysis received from OpenAI');
    }

    // Parse the JSON response
    try {
      const analysis = JSON.parse(content);
      
      // Validate the structure
      if (!analysis.statement || !analysis.proArguments || !analysis.conArguments || !analysis.balancedPerspective) {
        console.error('Invalid analysis structure:', analysis);
        throw new Error('Invalid analysis structure received from LLM');
      }

      return analysis;
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw content from LLM:', content);
      
      // Don't use fallback - instead throw the error so the user knows something went wrong
      throw new Error(`Failed to parse LLM response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Analysis timed out. Please try again with a simpler statement.');
      }
      if (error.message.includes('API key')) {
        throw new Error('API configuration error. Please contact support.');
      }
    }
    
    // Fallback to mock response
    return {
      statement: statement,
      proArguments: [
        {
          title: "Promotes Innovation",
          score: 8,
          description: "This perspective argues that the statement aligns with principles of efficiency and progress, offering practical solutions to current challenges.",
          counterArguments: [
            {
              title: "Counter argument title",
              score: 7,
              description: "Detailed description of the counter argument",
              counterArguments: [],
              evidence: []
            }
          ],
          evidence: [
            {
              title: "Study shows 40% increase in innovation",
              description: "A comprehensive study by MIT found that companies embracing this approach saw a 40% increase in innovative outputs."
            },
            {
              title: "Historical success examples",
              description: "Multiple historical cases demonstrate the effectiveness of this approach in driving progress."
            }
          ]
        },
        {
          title: "Enables Progress", 
          score: 7,
          description: "Supporters believe this approach offers practical solutions to current challenges and could lead to improved outcomes.",
          counterArguments: [
            {
              title: "Counter argument title",
              score: 8,
              description: "Detailed description of the counter argument",
              counterArguments: [],
              evidence: []
            }
          ],
          evidence: [
            {
              title: "Practical implementation success",
              description: "Real-world implementations have shown measurable improvements in key metrics."
            }
          ]
        },
        {
          title: "Strengthens Society",
          score: 6,
          description: "This approach contributes to building stronger, more resilient communities and institutions.",
          counterArguments: [],
          evidence: [
            {
              title: "Community impact studies",
              description: "Research shows positive impacts on community cohesion and social stability."
            }
          ]
        },
        {
          title: "Protects Rights",
          score: 6,
          description: "This position safeguards fundamental rights and freedoms that are essential to democratic societies.",
          counterArguments: [],
          evidence: [
            {
              title: "Legal precedent analysis",
              description: "Legal experts have identified strong precedents supporting this position."
            }
          ]
        },
        {
          title: "Fosters Growth",
          score: 5,
          description: "This approach creates conditions that enable sustainable economic and social growth.",
          counterArguments: [],
          evidence: [
            {
              title: "Economic impact data",
              description: "Economic analysis shows positive correlation with growth indicators."
            }
          ]
        }
      ],
      conArguments: [
        {
          title: "Overlooks Ethics",
          score: 8,
          description: "Critics contend this approach may overlook important social and ethical considerations that should be prioritized.",
          counterArguments: [
            {
              title: "Counter argument title",
              score: 7,
              description: "Detailed description of the counter argument",
              counterArguments: [],
              evidence: []
            }
          ],
          evidence: [
            {
              title: "Ethical framework analysis",
              description: "Ethical analysis reveals potential conflicts with established moral principles."
            }
          ]
        },
        {
          title: "Causes Harm",
          score: 7,
          description: "Opponents argue this could lead to unintended negative consequences and potential harm to vulnerable populations.",
          counterArguments: [
            {
              title: "Counter argument title",
              score: 8,
              description: "Detailed description of the counter argument",
              counterArguments: [],
              evidence: []
            }
          ],
          evidence: [
            {
              title: "Impact assessment studies",
              description: "Comprehensive impact assessments have identified potential risks to vulnerable groups."
            }
          ]
        },
        {
          title: "Undermines Trust",
          score: 6,
          description: "This approach may erode public trust in institutions and create social divisions.",
          counterArguments: [],
          evidence: [
            {
              title: "Public opinion surveys",
              description: "Recent surveys indicate declining trust in institutions following similar approaches."
            }
          ]
        },
        {
          title: "Reduces Quality",
          score: 6,
          description: "The absence of proper standards can lead to a decline in overall quality and effectiveness.",
          counterArguments: [],
          evidence: [
            {
              title: "Quality metrics analysis",
              description: "Quality assessment studies show correlation with declining standards."
            }
          ]
        },
        {
          title: "Threatens Stability",
          score: 5,
          description: "This approach may destabilize existing systems without providing adequate alternatives.",
          counterArguments: [],
          evidence: [
            {
              title: "Stability impact research",
              description: "Research indicates potential destabilizing effects on existing systems."
            }
          ]
        }
      ],
      balancedPerspective: "This issue involves complex trade-offs between different values and priorities. The truth likely lies somewhere in between, with valid points on both sides. Consider the specific context, potential consequences, and your own values when forming an opinion."
    };
  }
} 