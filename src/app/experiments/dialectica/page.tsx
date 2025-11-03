'use client';

import React, { useState } from 'react';
import Link from 'next/link';

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

// Type for raw argument data from API (may have incomplete fields)
type RawArgument = Partial<Argument> & {
  title?: string;
  score?: number;
  description?: string;
  counterArguments?: RawArgument[];
  evidence?: Argument['evidence'];
};

const DialecticaPage = () => {
  const [statement, setStatement] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedArgs, setExpandedArgs] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const toggleArgument = (section: string, index: number, subIndex?: number | string) => {
    const key = subIndex !== undefined ? `${section}-${index}-${subIndex}` : `${section}-${index}`;
    const newExpanded = new Set(expandedArgs);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedArgs(newExpanded);
  };

  const handleAnalyze = async () => {
    if (!statement.trim()) return;
    
    setIsLoading(true);
    setAnalysis(null);
    setExpandedArgs(new Set());
    setError(null);
    
    try {
      const response = await fetch('/api/dialectica', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: statement.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Prefer parsed field from backend if available
      if (data.parsed) {
        setAnalysis({
          statement: data.parsed.statement || statement.trim(),
          proArguments: Array.isArray(data.parsed.proArguments) ? data.parsed.proArguments.map((arg: RawArgument) => ({
            ...arg,
            counterArguments: Array.isArray(arg.counterArguments) ? arg.counterArguments : [],
            evidence: Array.isArray(arg.evidence) ? arg.evidence : [],
          })) : [],
          conArguments: Array.isArray(data.parsed.conArguments) ? data.parsed.conArguments.map((arg: RawArgument) => ({
            ...arg,
            counterArguments: Array.isArray(arg.counterArguments) ? arg.counterArguments : [],
            evidence: Array.isArray(arg.evidence) ? arg.evidence : [],
          })) : [],
          balancedPerspective: data.parsed.balancedPerspective || '',
        });
      } else if (data.result && data.result.choices && data.result.choices[0]?.message?.content) {
        try {
          const analysis = JSON.parse(data.result.choices[0].message.content);
          setAnalysis({
            statement: analysis.statement || statement.trim(),
            proArguments: Array.isArray(analysis.proArguments) ? analysis.proArguments.map((arg: RawArgument) => ({
              ...arg,
              counterArguments: Array.isArray(arg.counterArguments) ? arg.counterArguments : [],
              evidence: Array.isArray(arg.evidence) ? arg.evidence : [],
            })) : [],
            conArguments: Array.isArray(analysis.conArguments) ? analysis.conArguments.map((arg: RawArgument) => ({
              ...arg,
              counterArguments: Array.isArray(arg.counterArguments) ? arg.counterArguments : [],
              evidence: Array.isArray(arg.evidence) ? arg.evidence : [],
            })) : [],
            balancedPerspective: analysis.balancedPerspective || '',
          });
        } catch {
          setAnalysis({
            statement: statement.trim(),
            proArguments: [],
            conArguments: [],
            balancedPerspective: data.result.choices[0].message.content,
          });
        }
      } else if (data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setAnalysis(null);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  };

  const renderArgument = (argument: Argument, section: string, index: number, isMain: boolean = true) => {
    const key = isMain ? `${section}-${index}` : `${section}-${index}-${index}`;
    const isExpanded = expandedArgs.has(key);
    const hasCounterArgs = argument.counterArguments && argument.counterArguments.length > 0;
    const hasEvidence = argument.evidence && argument.evidence.length > 0;
    
    return (
      <div key={index} className="mb-2">
        <div 
          className="flex items-start cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors"
          onClick={() => toggleArgument(section, index)}
        >
          <span className={`mr-2 mt-1 ${section === 'pro' ? 'text-green-400' : 'text-red-400'}`}>
            {isExpanded ? '└─' : '├─'}
          </span>
          <div className="flex-1">
            <div className="text-white font-medium flex items-center justify-between">
              <span>{argument.title}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                argument.score >= 8 ? 'bg-green-600 text-white' :
                argument.score >= 6 ? 'bg-yellow-600 text-white' :
                'bg-red-600 text-white'
              }`}>
                {argument.score}/10
              </span>
            </div>
            {isExpanded && (
              <div className="text-gray-300 mt-2 pl-4 border-l-2 border-gray-600">
                {argument.description}
                
                {/* Supporting Evidence */}
                {hasEvidence && (
                  <div className="mt-4">
                    <div className="text-sm font-semibold text-blue-400 mb-2">Supporting Evidence:</div>
                    {argument.evidence.map((evidence, evidenceIndex) => (
                      <div key={evidenceIndex} className="ml-4 mb-2">
                        <div 
                          className="flex items-start cursor-pointer hover:bg-gray-700 p-2 rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleArgument(section, index, `evidence-${evidenceIndex}`);
                          }}
                        >
                          <span className="text-blue-500 mr-2 mt-1">
                            {expandedArgs.has(`${section}-${index}-evidence-${evidenceIndex}`) ? '└─' : '├─'}
                          </span>
                          <div className="flex-1">
                            <div className="text-blue-300 font-medium">
                              {evidence.title}
                            </div>
                            {expandedArgs.has(`${section}-${index}-evidence-${evidenceIndex}`) && (
                              <div className="text-gray-400 mt-2 pl-4 border-l-2 border-blue-500">
                                {evidence.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Counter Arguments */}
                {hasCounterArgs && (
                  <div className="mt-4">
                    <div className="text-sm font-semibold text-gray-400 mb-2">Counter Arguments:</div>
                    {argument.counterArguments.map((counterArg, counterIndex) => (
                      <div key={counterIndex} className="ml-4 mb-2">
                        <div 
                          className="flex items-start cursor-pointer hover:bg-gray-700 p-2 rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleArgument(section, index, counterIndex);
                          }}
                        >
                          <span className="text-gray-500 mr-2 mt-1">
                            {expandedArgs.has(`${section}-${index}-${counterIndex}`) ? '└─' : '├─'}
                          </span>
                          <div className="flex-1">
                            <div className="text-gray-300 font-medium flex items-center justify-between">
                              <span>{counterArg.title}</span>
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                counterArg.score >= 8 ? 'bg-green-600 text-white' :
                                counterArg.score >= 6 ? 'bg-yellow-600 text-white' :
                                'bg-red-600 text-white'
                              }`}>
                                {counterArg.score}/10
                              </span>
                            </div>
                            {expandedArgs.has(`${section}-${index}-${counterIndex}`) && (
                              <div className="text-gray-400 mt-2 pl-4 border-l-2 border-gray-500">
                                {counterArg.description}
                                
                                {/* Counter Argument Evidence */}
                                {counterArg.evidence && counterArg.evidence.length > 0 && (
                                  <div className="mt-4">
                                    <div className="text-sm font-semibold text-blue-400 mb-2">Supporting Evidence:</div>
                                    {counterArg.evidence.map((evidence, evidenceIndex) => (
                                      <div key={evidenceIndex} className="ml-4 mb-2">
                                        <div 
                                          className="flex items-start cursor-pointer hover:bg-gray-700 p-2 rounded transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleArgument(section, index, `counter-${counterIndex}-evidence-${evidenceIndex}`);
                                          }}
                                        >
                                          <span className="text-blue-500 mr-2 mt-1">
                                            {expandedArgs.has(`${section}-${index}-counter-${counterIndex}-evidence-${evidenceIndex}`) ? '└─' : '├─'}
                                          </span>
                                          <div className="flex-1">
                                            <div className="text-blue-300 font-medium">
                                              {evidence.title}
                                            </div>
                                            {expandedArgs.has(`${section}-${index}-counter-${counterIndex}-evidence-${evidenceIndex}`) && (
                                              <div className="text-gray-400 mt-2 pl-4 border-l-2 border-blue-500">
                                                {evidence.description}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-mono">
      <header className="bg-gray-800 p-4 flex justify-between items-center shadow-md flex-shrink-0">
        <Link href="/" className="text-white hover:text-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold">Dialectica</h1>
        <div className="w-6" />
      </header>
      
      <div className="flex-grow p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Input Section */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="e.g., 'Social media is harmful to society' or 'Universal basic income should be implemented'"
              className="w-full h-32 bg-gray-700 text-white p-4 rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
            />
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !statement.trim()}
              className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded transition-colors"
            >
              {isLoading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <div className="text-blue-400">
                  <p className="font-semibold">Analyzing your statement...</p>
                  <p className="text-sm text-gray-400 mt-1">This usually takes 3-8 seconds</p>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Section */}
          {analysis && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-lg font-bold mb-4 text-green-300">Analysis Results</h2>
              
              {/* Pro/Con Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Pro Arguments Panel */}
                <div className="bg-gray-900 p-4 rounded border border-green-600">
                  <h3 className="text-green-300 font-bold text-lg mb-3 flex items-center">
                    🤔 PRO ARGUMENTS
                  </h3>
                  <div className="pro-arguments text-sm leading-relaxed">
                    {analysis.proArguments
                      .sort((a, b) => b.score - a.score)
                      .map((argument, index) => renderArgument(argument, 'pro', index))}
                  </div>
                </div>

                {/* Con Arguments Panel */}
                <div className="bg-gray-900 p-4 rounded border border-red-600">
                  <h3 className="text-red-300 font-bold text-lg mb-3 flex items-center">
                    🤔 CON ARGUMENTS
                  </h3>
                  <div className="con-arguments text-sm leading-relaxed">
                    {analysis.conArguments
                      .sort((a, b) => b.score - a.score)
                      .map((argument, index) => renderArgument(argument, 'con', index))}
                  </div>
                </div>
              </div>

              {/* Balanced Perspective */}
              <div className="bg-gray-900 p-4 rounded border border-yellow-600">
                <h3 className="text-yellow-300 font-bold text-lg mb-3 flex items-center">
                  💭 BALANCED PERSPECTIVE
                </h3>
                <div className="balanced-perspective text-sm leading-relaxed">
                  {analysis.balancedPerspective}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-900 p-6 rounded-lg border border-red-600">
              <h2 className="text-lg font-bold mb-4 text-red-300">Analysis Error</h2>
              <p className="text-red-200 mb-4">{error}</p>
              <p className="text-gray-300 text-sm">
                This might be due to an issue with the AI service or the complexity of your statement. 
                Try simplifying your statement or try again in a moment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DialecticaPage; 