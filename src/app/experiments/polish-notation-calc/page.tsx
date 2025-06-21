'use client';

import React, { useState } from 'react';

type StackItem = number | string;
type Notation = 'prefix' | 'postfix';

const PolishNotationCalcPage = () => {
  const [stack, setStack] = useState<StackItem[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [notation, setNotation] = useState<Notation>('prefix');

  const displayValue = currentInput || (stack.length > 0 ? String(stack[stack.length - 1]) : '0');

  const isOperator = (token: string): boolean => ['+', '-', '*', '/'].includes(token);

  const applyOperator = (op: string, a: number, b: number): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return notation === 'prefix' ? a - b : b - a;
      case '*': return a * b;
      case '/': 
        if (notation === 'prefix') return b === 0 ? Infinity : a / b;
        return a === 0 ? Infinity : b / a;
      default: throw new Error(`Unknown operator: ${op}`);
    }
  };

  const tryEvaluate = (currentStack: StackItem[]): StackItem[] => {
    const newStack = [...currentStack];
    let didSomething = true;
    while (didSomething) {
      didSomething = false;
      if (notation === 'prefix') {
        for (let i = newStack.length - 3; i >= 0; i--) {
          const op = newStack[i];
          const a = newStack[i + 1];
          const b = newStack[i + 2];
          if (typeof op === 'string' && isOperator(op) && typeof a === 'number' && typeof b === 'number') {
            const result = applyOperator(op, a, b);
            newStack.splice(i, 3, result);
            didSomething = true;
            break;
          }
        }
      } else { // postfix - This evaluation is for when operators are on the stack, which is not the standard RPN flow
        for (let i = newStack.length - 1; i >= 2; i--) {
          const op = newStack[i];
          const b = newStack[i - 1];
          const a = newStack[i - 2];
          if (typeof op === 'string' && isOperator(op) && typeof a === 'number' && typeof b === 'number') {
            const result = applyOperator(op, b, a);
            newStack.splice(i - 2, 3, result);
            didSomething = true;
            break;
          }
        }
      }
    }
    return newStack;
  };

  const handlePress = (token: string) => {
    if (token === 'C') {
      setStack([]);
      setCurrentInput('');
      return;
    }

    if (token === '±') {
      if (currentInput) {
        setCurrentInput(prev => (prev.startsWith('-') ? prev.slice(1) : `-${prev}`));
      }
      return;
    }

    if (token === '.') {
      if (!currentInput.includes('.')) {
        setCurrentInput(prev => (prev === '' ? '0.' : `${prev}.`));
      }
      return;
    }

    if (token === 'Enter') {
      let newStack = [...stack];
      if (currentInput !== '') {
        newStack.push(Number(currentInput));
        setCurrentInput('');
      }

      if (notation === 'prefix') {
        const evaluatedStack = tryEvaluate(newStack);
        setStack(evaluatedStack);
      } else {
        setStack(newStack);
      }
      return;
    }
    
    if (isOperator(token)) {
      if (notation === 'prefix') {
        let newStack = [...stack];
        if (currentInput !== '') {
          newStack.push(Number(currentInput));
          setCurrentInput('');
        }
        newStack.push(token);
        setStack(newStack);
      } else { // RPN/postfix immediate evaluation
        let newStack = [...stack];
        if (currentInput !== '') {
          newStack.push(Number(currentInput));
          setCurrentInput('');
        }
        
        if (newStack.length < 2) {
          // Not enough operands
          return;
        }

        const b = newStack.pop() as number;
        const a = newStack.pop() as number;
        
        const result = applyOperator(token, b, a);
        setStack([...newStack, result]);
      }
      return;
    }

    setCurrentInput(prev => prev + token);
  };

  const renderButton = (label: string, onClick: () => void, className: string = '') => (
    <button
      onClick={onClick}
      className={`bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-4 rounded ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <div className="w-full max-w-xs p-4 bg-gray-900 rounded-lg shadow-lg">
        <div className="mb-4">
          <select 
            value={notation} 
            onChange={e => {
              setNotation(e.target.value as Notation);
              setStack([]);
              setCurrentInput('');
            }}
            className="w-full bg-gray-700 text-white p-2 rounded"
          >
            <option value="prefix">Polish Notation (Prefix)</option>
            <option value="postfix">Reverse Polish Notation (Postfix)</option>
          </select>
        </div>
        <div className="bg-gray-800 text-right p-4 rounded mb-4 h-24 flex flex-col justify-end">
          <div className="text-gray-400 text-sm mb-1 truncate" title={stack.join(' ')}>
            Stack: {stack.join(' ')}
          </div>
          <div className="text-white text-3xl">{displayValue}</div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {renderButton('7', () => handlePress('7'))}
          {renderButton('8', () => handlePress('8'))}
          {renderButton('9', () => handlePress('9'))}
          {renderButton('+', () => handlePress('+'), 'bg-orange-500 hover:bg-orange-400')}
          {renderButton('4', () => handlePress('4'))}
          {renderButton('5', () => handlePress('5'))}
          {renderButton('6', () => handlePress('6'))}
          {renderButton('-', () => handlePress('-'), 'bg-orange-500 hover:bg-orange-400')}
          {renderButton('1', () => handlePress('1'))}
          {renderButton('2', () => handlePress('2'))}
          {renderButton('3', () => handlePress('3'))}
          {renderButton('*', () => handlePress('*'), 'bg-orange-500 hover:bg-orange-400')}
          {renderButton('0', () => handlePress('0'))}
          {renderButton('±', () => handlePress('±'))}
          {renderButton('.', () => handlePress('.'))}
          {renderButton('/', () => handlePress('/'), 'bg-orange-500 hover:bg-orange-400')}
          {renderButton('C', () => handlePress('C'), 'bg-red-500 hover:bg-red-400')}
          {renderButton('Enter', () => handlePress('Enter'), 'col-span-3 bg-blue-500 hover:bg-blue-400')}
        </div>
      </div>
    </div>
  );
};

export default PolishNotationCalcPage;
