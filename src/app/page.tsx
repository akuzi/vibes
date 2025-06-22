'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [hoveredExperiment, setHoveredExperiment] = useState<string | null>(null);

  const experimentDescriptions = {
    cells: "Generate music using cellular automata. Watch cellular automata evolve while creating melodies based on cell patterns and positions.",
    pncalc: "A calculator that accepts the operator before the operands. Explore different ways to write mathematical expressions.",
    pretzl: "A twist on a prefix language - a mix of Python and Lisp. Write and run code with features like functions, loops, lists, and interactive input/output."
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-green-400 font-mono p-8">
        <div className="w-full max-w-md">
            <div className="border border-green-700 rounded-lg p-4">
                <p className="text-yellow-400 mb-4">&gt; Select experiment</p>
                <div className="flex flex-col space-y-2">
                    <Link 
                        href="/experiments/cells" 
                        className="hover:bg-green-900 p-2 rounded"
                        onMouseEnter={() => setHoveredExperiment('cells')}
                        onMouseLeave={() => setHoveredExperiment(null)}
                    >
                        <p>
                            <span className="text-blue-400">[01]</span>
                            <span className="text-white ml-4">Musical Cells</span>
                        </p>
                    </Link>
                    <Link 
                        href="/experiments/pncalc" 
                        className="hover:bg-green-900 p-2 rounded"
                        onMouseEnter={() => setHoveredExperiment('pncalc')}
                        onMouseLeave={() => setHoveredExperiment(null)}
                    >
                        <p>
                            <span className="text-blue-400">[02]</span>
                            <span className="text-white ml-4">Polish Notation Calculator</span>
                        </p>
                    </Link>
                    <Link 
                        href="/experiments/pretzl" 
                        className="hover:bg-green-900 p-2 rounded"
                        onMouseEnter={() => setHoveredExperiment('pretzl')}
                        onMouseLeave={() => setHoveredExperiment(null)}
                    >
                        <p>
                            <span className="text-blue-400">[03]</span>
                            <span className="text-white ml-4">Pretzl</span>
                        </p>
                    </Link>
                </div>
            </div>
        </div>
        
        {/* Description Panel */}
        {hoveredExperiment && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-green-700 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-green-400">
                <span className="text-yellow-400">&gt;</span> {experimentDescriptions[hoveredExperiment as keyof typeof experimentDescriptions]}
              </div>
            </div>
          </div>
        )}
    </main>
  );
}
