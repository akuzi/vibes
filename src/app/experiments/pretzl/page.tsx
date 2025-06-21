'use client';

import React, { useState, useRef, useEffect } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-lisp';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { runPretzl } from '@/lib/pretzl/interpreter';
import { PRETZL_SAMPLES } from '@/lib/pretzl/samples';

// Extend Prism's Lisp grammar for Pretzl keywords
const pretzlKeywords = ['define', 'lambda', 'if', 'print', 'input'];
Prism.languages.lisp['keyword'] = new RegExp(`(?<=\\()(${pretzlKeywords.join('|')})\\b`);

const LineNumbers = ({ code }: { code: string }) => {
  const lines = code.split('\n').length;
  return (
    <div className="text-right text-gray-500 pr-4 select-none" style={{ flex: '0 0 auto' }}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i}>{i + 1}</div>
      ))}
    </div>
  );
};

const PretzlPage = () => {
  const [code, setCode] = useState(PRETZL_SAMPLES[0].code);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [isAwaitingInput, setIsAwaitingInput] = useState(false);
  const [consoleInputValue, setConsoleInputValue] = useState('');
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // This will be used to resolve the promise when input is submitted.
  const inputResolver = useRef<((value: string) => void) | null>(null);

  const handleRun = async () => {
    setConsoleLines([]);
    
    const inputProvider = (): Promise<string> => {
      setIsAwaitingInput(true);
      return new Promise((resolve) => {
        inputResolver.current = resolve;
      });
    };

    try {
      await runPretzl(code, inputProvider, (line) => {
        setConsoleLines(prev => [...prev, line]);
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
      setConsoleLines(prev => [...prev, value]);
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

  const highlight = (code: string) => {
    return Prism.highlight(code, Prism.languages.lisp, 'lisp');
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-mono">
      <header className="bg-gray-800 p-4 flex justify-between items-center shadow-md flex-shrink-0">
        <h1 className="text-xl font-bold">Pretzl: A twist on prefix languages.</h1>
        <div className="flex items-center">
          <select
            className="bg-gray-700 text-white p-2 rounded mr-4"
            onChange={(e) => {
              const selectedSample = PRETZL_SAMPLES.find((s: any) => s.name === e.target.value);
              if (selectedSample) {
                setCode(selectedSample.code);
              }
            }}
          >
            <option value="" disabled>Select a sample...</option>
            {PRETZL_SAMPLES.map((sample: any) => (
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
              <div className="flex h-full">
                <LineNumbers code={code} />
                <Editor
                  value={code}
                  onValueChange={setCode}
                  highlight={highlight}
                  padding={10}
                  style={{
                    fontFamily: '"Fira code", "Fira Mono", monospace',
                    fontSize: 14,
                    lineHeight: '1.5em',
                    flex: 1,
                    backgroundImage: 'linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                    backgroundSize: '2em 1.5em',
                    backgroundPosition: '10px 0',
                    outline: 'none',
                    border: 'none',
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
                    <pre key={index}>{line}</pre>
                  ))}
                  {isAwaitingInput && (
                    <div className="flex items-center">
                      <input
                        ref={inputRef}
                        type="text"
                        value={consoleInputValue}
                        onChange={(e) => setConsoleInputValue(e.target.value)}
                        onKeyDown={handleConsoleSubmit}
                        className="w-full bg-transparent text-white outline-none"
                        autoFocus
                      />
                    </div>
                  )}
                  <div ref={consoleEndRef} />
                </div>
              </div>
            </Panel>
            <PanelResizeHandle className="h-2 bg-gray-700 hover:bg-blue-600 transition-colors" />
            <Panel defaultSize={34}>
              <div className="flex flex-col h-full">
                <h2 className="text-lg bg-gray-700 p-2 flex-shrink-0">Keyword Examples</h2>
                <div className="flex-grow p-2 overflow-hidden bg-gray-800 text-sm">
                  <div className="grid grid-cols-3 gap-2 h-full">
                    <div>
                      <p className="font-bold">define</p>
                      <pre className="bg-gray-900 p-1 rounded mt-1">define x 10</pre>
                    </div>
                    <div>
                      <p className="font-bold">lambda</p>
                      <pre className="bg-gray-900 p-1 rounded mt-1">lambda n (* n n)</pre>
                    </div>
                    <div>
                      <p className="font-bold">if</p>
                      <pre className="bg-gray-900 p-1 rounded mt-1">if (&gt; x 5) "big" "small"</pre>
                    </div>
                    <div>
                      <p className="font-bold">list</p>
                      <pre className="bg-gray-900 p-1 rounded mt-1">list 1 2 3</pre>
                    </div>
                    <div>
                      <p className="font-bold">print</p>
                      <pre className="bg-gray-900 p-1 rounded mt-1">print "hello"</pre>
                    </div>
                     <div>
                      <p className="font-bold">input</p>
                      <pre className="bg-gray-900 p-1 rounded mt-1">input</pre>
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