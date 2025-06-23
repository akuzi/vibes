'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { runPretzl } from '@/lib/pretzl/interpreter';
import { PRETZL_SAMPLES, SampleProgram } from '@/lib/pretzl/samples';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const PretzlPage = () => {
  const [code, setCode] = useState(PRETZL_SAMPLES[0].code);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [isAwaitingInput, setIsAwaitingInput] = useState(false);
  const [consoleInputValue, setConsoleInputValue] = useState('');
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const consoleBuffer = useRef('');

  // This will be used to resolve the promise when input is submitted.
  const inputResolver = useRef<((value: string) => void) | null>(null);

  const handleRun = async () => {
    setConsoleLines([]);
    consoleBuffer.current = '';
    
    const inputProvider = (): Promise<string> => {
      setIsAwaitingInput(true);
      return new Promise((resolve) => {
        inputResolver.current = resolve;
      });
    };

    try {
      await runPretzl(code, inputProvider, (output) => {
        console.log('Output received:', output);
        // Always add output as a new line for simplicity
          setConsoleLines(prev => [...prev, output]);
      });
    } catch (e) {
      if (e instanceof Error) {
        setConsoleLines(prev => [...prev, `Error: ${e.message}`]);
      }
    } finally {
      setIsAwaitingInput(false);
    }
  };
  
  const handleConsoleSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isAwaitingInput) {
      const value = consoleInputValue;
      console.log('Input submitted:', value);
      setConsoleLines(prev => {
        const newLines = [...prev];
        if (newLines.length > 0) {
          // Append the input value to the last line (the prompt)
          newLines[newLines.length - 1] = newLines[newLines.length - 1] + value;
        } else {
          // Fallback: add as new line if no previous line
          newLines.push(value);
        }
        return newLines;
      });
      if (inputResolver.current) {
        inputResolver.current(value);
        inputResolver.current = null;
      }
      setIsAwaitingInput(false);
      setConsoleInputValue('');
    }
  };

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLines]);

  useEffect(() => {
    if (isAwaitingInput) {
      inputRef.current?.focus();
    }
  }, [isAwaitingInput]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-mono">
      <header className="bg-gray-800 p-4 flex justify-between items-center shadow-md flex-shrink-0">
        <div className="flex items-center">
          <Link href="/" className="text-white hover:text-gray-300 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        <h1 className="text-xl font-bold">Pretzl</h1>
        </div>
        <div className="flex items-center">
          <select
            className="bg-gray-700 text-white p-2 rounded mr-4"
            onChange={(e) => {
              const selectedSample = PRETZL_SAMPLES.find((s: SampleProgram) => s.name === e.target.value);
              if (selectedSample) {
                setCode(selectedSample.code);
              }
            }}
          >
            <option value="" disabled>Select a sample...</option>
            {PRETZL_SAMPLES.map((sample: SampleProgram) => (
              <option key={sample.name} value={sample.name}>
                {sample.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleRun}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Run
          </button>
        </div>
      </header>
      <PanelGroup direction="horizontal" className="flex-grow">
        <Panel defaultSize={50}>
          <div className="flex flex-col h-full">
            <h2 className="text-lg bg-gray-700 p-2 flex-shrink-0">Editor</h2>
            <div className="flex flex-grow overflow-auto" style={{ backgroundColor: '#2d2d2d' }}>
              <div className="flex flex-grow h-full">
                <MonacoEditor
                  height="100%"
                  width="100%"
                  language="scheme"
                  theme="vs-dark"
                  value={code}
                  onChange={value => setCode(value || '')}
                  options={{
                    fontFamily: 'Fira Mono, monospace',
                    fontSize: 14,
                    lineNumbers: 'on',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    guides: { indentation: true },
                    automaticLayout: true,
                    tabSize: 2,
                  }}
                />
              </div>
            </div>
          </div>
        </Panel>
        <PanelResizeHandle className="w-2 bg-gray-700 hover:bg-blue-600 transition-colors" />
        <Panel defaultSize={50}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={66}>
              <div className="flex flex-col h-full bg-gray-800">
                <h2 className="text-lg bg-gray-700 p-2 flex-shrink-0">Console</h2>
                <div className="flex-grow p-4 overflow-auto" onClick={() => inputRef.current?.focus()}>
                  {consoleLines.map((line, index) => (
                    <div key={index} style={{ margin: 0, fontFamily: 'monospace' }}>
                      {line}
                      {isAwaitingInput && index === consoleLines.length - 1 && (
                        <span className="inline-flex items-center">
                          <input
                            ref={inputRef}
                            type="text"
                            value={consoleInputValue}
                            onChange={(e) => setConsoleInputValue(e.target.value)}
                            onKeyDown={handleConsoleSubmit}
                            className="bg-transparent text-white outline-none border-none"
                            style={{ fontFamily: 'inherit', fontSize: 'inherit' }}
                            autoFocus
                          />
                        </span>
                      )}
                    </div>
                  ))}
                  {isAwaitingInput && consoleLines.length === 0 && (
                    <span className="inline-flex items-center">
                      <input
                        ref={inputRef}
                        type="text"
                        value={consoleInputValue}
                        onChange={(e) => setConsoleInputValue(e.target.value)}
                        onKeyDown={handleConsoleSubmit}
                        className="bg-transparent text-white outline-none border-none"
                        style={{ fontFamily: 'inherit', fontSize: 'inherit' }}
                        autoFocus
                      />
                    </span>
                  )}
                  <div ref={consoleEndRef} />
                </div>
              </div>
            </Panel>
            <PanelResizeHandle className="h-2 bg-gray-700 hover:bg-blue-600 transition-colors" />
            <Panel defaultSize={34}>
              <div className="flex flex-col h-full">
                <h2 className="text-lg bg-gray-700 p-2 flex-shrink-0">Cheatsheet</h2>
                <div className="flex-grow p-3 overflow-auto bg-gray-800 text-xs">
                  <div className="space-y-4">
                    
                    {/* Basic Values */}
                    <div>
                      <h3 className="font-bold text-blue-300 mb-2">Basic Values</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="font-semibold">Numbers</p>
                          <pre className="bg-gray-900 p-1 rounded">42, -3.14, 0</pre>
                        </div>
                        <div>
                          <p className="font-semibold">Strings</p>
                          <pre className="bg-gray-900 p-1 rounded">&quot;hello world&quot;</pre>
                        </div>
                      </div>
                    </div>

                    {/* Arithmetic Operators */}
                    <div>
                      <h3 className="font-bold text-green-300 mb-2">Arithmetic</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="font-semibold">+ - * / %</p>
                          <pre className="bg-gray-900 p-1 rounded">+ 1 2    → 3</pre>
                          <pre className="bg-gray-900 p-1 rounded">* (+ 1 2) 3    → 9</pre>
                          <pre className="bg-gray-900 p-1 rounded">% 7 3    → 1</pre>
                        </div>
                        <div>
                          <p className="font-semibold">Comparisons</p>
                          <pre className="bg-gray-900 p-1 rounded">&lt; &gt; &lt;= &gt;= ==</pre>
                          <pre className="bg-gray-900 p-1 rounded">(&lt; 5 10)    → 1 (true)</pre>
                        </div>
                      </div>
                    </div>

                    {/* Variables & Functions */}
                    <div>
                      <h3 className="font-bold text-yellow-300 mb-2">Variables & Functions</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="font-semibold">set</p>
                          <pre className="bg-gray-900 p-1 rounded">set x 10</pre>
                          <pre className="bg-gray-900 p-1 rounded">set pi 3.14159</pre>
                        </div>
                        <div>
                          <p className="font-semibold">lambda</p>
                          <pre className="bg-gray-900 p-1 rounded">lambda x (* x x)</pre>
                          <pre className="bg-gray-900 p-1 rounded">lambda (x y) (+ x y)</pre>
                        </div>
                      </div>
                    </div>

                    {/* Control Flow */}
                    <div>
                      <h3 className="font-bold text-purple-300 mb-2">Control Flow</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="font-semibold">if</p>
                          <pre className="bg-gray-900 p-1 rounded">if (&gt; x 5) &quot;big&quot; &quot;small&quot;</pre>
                        </div>
                        <div>
                          <p className="font-semibold">while</p>
                          <pre className="bg-gray-900 p-1 rounded">while (&lt; i 10) (inc i)</pre>
                        </div>
                        <div>
                          <p className="font-semibold">for</p>
                          <pre className="bg-gray-900 p-1 rounded">for (set i 0) (&lt; i 5) (inc i) (print i)</pre>
                        </div>
                        <div>
                          <p className="font-semibold">begin</p>
                          <pre className="bg-gray-900 p-1 rounded">begin (print &quot;a&quot;) (print &quot;b&quot;) (print &quot;c&quot;)</pre>
                        </div>
                        <div>
                          <p className="font-semibold">inc</p>
                          <pre className="bg-gray-900 p-1 rounded">inc i</pre>
                        </div>
                        <div>
                          <p className="font-semibold">dec</p>
                          <pre className="bg-gray-900 p-1 rounded">dec j</pre>
                        </div>
                      </div>
                    </div>

                    {/* I/O */}
                    <div>
                      <h3 className="font-bold text-cyan-300 mb-2">Input/Output</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="font-semibold">print</p>
                          <pre className="bg-gray-900 p-1 rounded">print &quot;hello&quot;</pre>
                          <pre className="bg-gray-900 p-1 rounded">print (+ 1 2)</pre>
                        </div>
                        <div>
                          <p className="font-semibold">input</p>
                          <pre className="bg-gray-900 p-1 rounded">set name (input)</pre>
                          <pre className="bg-gray-900 p-1 rounded">set age (input)</pre>
                        </div>
                      </div>
                    </div>

                    {/* Lists */}
                    <div>
                      <h3 className="font-bold text-orange-300 mb-2">Lists</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="font-semibold">list</p>
                          <pre className="bg-gray-900 p-1 rounded">list 1 2 3 4 5</pre>
                          <pre className="bg-gray-900 p-1 rounded">set nums (list)</pre>
                          <pre className="bg-gray-900 p-1 rounded">set nums [1 2 3]</pre>
                          <pre className="bg-gray-900 p-1 rounded">set empty []</pre>
                        </div>
                        <div>
                          <p className="font-semibold">append</p>
                          <pre className="bg-gray-900 p-1 rounded">append nums 42</pre>
                        </div>
                        <div>
                          <p className="font-semibold">sort</p>
                          <pre className="bg-gray-900 p-1 rounded">sort nums</pre>
                        </div>
                        <div>
                          <p className="font-semibold">length</p>
                          <pre className="bg-gray-900 p-1 rounded">length nums</pre>
                        </div>
                        <div>
                          <p className="font-semibold">get</p>
                          <pre className="bg-gray-900 p-1 rounded">get nums 0</pre>
                        </div>
                      </div>
                    </div>

                    {/* Strings */}
                    <div>
                      <h3 className="font-bold text-pink-300 mb-2">Strings</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="font-semibold">concat</p>
                          <pre className="bg-gray-900 p-1 rounded">concat &quot;hello&quot; &quot; &quot; &quot;world&quot;</pre>
                        </div>
                        <div>
                          <p className="font-semibold">type</p>
                          <pre className="bg-gray-900 p-1 rounded">type &quot;hello&quot;    → &quot;string&quot;</pre>
                        </div>
                      </div>
                    </div>

                    {/* Function Calls */}
                    <div>
                      <h3 className="font-bold text-red-300 mb-2">Function Calls</h3>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <p className="font-semibold">Syntax</p>
                          <pre className="bg-gray-900 p-1 rounded">(function arg1 arg2 ...)</pre>
                          <pre className="bg-gray-900 p-1 rounded">(factorial 5)</pre>
                          <pre className="bg-gray-900 p-1 rounded">(lambda x (* x x) 4)</pre>
                        </div>
                      </div>
                    </div>

                    {/* Truth Values */}
                    <div>
                      <h3 className="font-bold text-gray-300 mb-2">Truth Values</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="font-semibold">True</p>
                          <pre className="bg-gray-900 p-1 rounded">1, any non-zero number</pre>
                    </div>
                     <div>
                          <p className="font-semibold">False</p>
                          <pre className="bg-gray-900 p-1 rounded">0</pre>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default PretzlPage; 