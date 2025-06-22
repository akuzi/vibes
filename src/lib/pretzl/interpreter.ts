// This will eventually contain the Prex interpreter.

// Type definitions
// An Atom is a literal value (string or number) or a symbol.
type Atom = { type: 'string'; value: string; line: number } | { type: 'number'; value: number; line: number } | { type: 'symbol'; value: string; line: number };
type Expression = Atom | Expression[];
// A closure captures its parameters, body, and the environment where it was defined.
type Closure = {
  type: 'closure';
  params: Atom[];
  body: Expression;
  env: Environment;
};
type EvaluatedValue = string | number | Closure | number[];
type Environment = { [key: string]: EvaluatedValue };
type InputProvider = () => Promise<string>;
type OutputHandler = (output: string) => void;

const ARITIES: { [key: string]: number } = {
  '+': 2,
  '-': 2,
  '*': 2,
  '/': 2,
  '%': 2,
  '<=': 2,
  '>=': 2,
  '<': 2,
  '>': 2,
  '==': 2,
  'print': 1,
  'set': 2,
  'lambda': 2,
  'if': 3,
  'while': 2,
  'for': 3,
  'begin': -1, // variadic - can take any number of expressions
  'input': 0,
  'concat': -1, // variadic
  'list': -1, // variadic
  'append': 2,
  'sort': 1,
  'length': 1,
  'get': 2,
  'type': 1,
  'inc': 1,
  'dec': 1,
};

function tokenize(code: string): { token: string; line: number }[] {
  // Remove comment lines (lines starting with #)
  const lines = code.split('\n');
  const filteredLines = lines.filter(line => !line.trim().startsWith('#'));
  const filteredCode = filteredLines.join('\n');
  
  // This more robust regex correctly handles strings with spaces, parentheses, square brackets, and other symbols.
  const regex = /"[^"]*"|[()\[\]]|[^\s()\[\]]+/g;
  const tokens: { token: string; line: number }[] = [];
  let match;
  let lineNumber = 1;
  
  while ((match = regex.exec(filteredCode)) !== null) {
    // Count newlines before this match
    const beforeMatch = filteredCode.substring(0, match.index);
    const newlinesBefore = (beforeMatch.match(/\n/g) || []).length;
    lineNumber = newlinesBefore + 1;
    
    tokens.push({ token: match[0], line: lineNumber });
  }
  
  return tokens;
}

function atomize(tokenInfo: { token: string; line: number }): Atom {
  const { token, line } = tokenInfo;
  if (token.startsWith('"') && token.endsWith('"')) {
    return { type: 'string', value: token.slice(1, -1), line };
  }
  const num = Number(token);
  if (!isNaN(num) && isFinite(Number(token))) {
    return { type: 'number', value: num, line };
  }
  return { type: 'symbol', value: token, line };
}

function parse(tokens: Atom[]): Expression[] {
  const expressions: Expression[] = [];
  while (tokens.length > 0) {
    expressions.push(readFromTokens(tokens, false)); // Start in non-list context
  }
  return expressions;
}

function readFromTokens(tokens: Atom[], inList: boolean): Expression {
  if (tokens.length === 0) {
    throw new Error("Unexpected end of input.");
  }
  const token = tokens.shift();
  if (!token) {
    throw new Error("Unexpected end of input.");
  }

  if (token.type === 'symbol' && token.value === '(') {
    const list: Expression[] = [];
    while (tokens[0] && (tokens[0].type !== 'symbol' || tokens[0].value !== ')')) {
      list.push(readFromTokens(tokens, true)); // Now we are in a list context
    }
    if (!tokens[0]) {
      throw new Error(`Unclosed list, missing ')' (line ${token.line})`);
    }
    tokens.shift(); // Consume ')'
    return list;
  }

  if (token.type === 'symbol' && token.value === '[') {
    const list: Expression[] = [];
    while (tokens[0] && (tokens[0].type !== 'symbol' || tokens[0].value !== ']')) {
      list.push(readFromTokens(tokens, true)); // Now we are in a list context
    }
    if (!tokens[0]) {
      throw new Error(`Unclosed list, missing ']' (line ${token.line})`);
    }
    tokens.shift(); // Consume ']'
    // Convert square bracket list to a 'list' function call
    return [{ type: 'symbol', value: 'list', line: token.line }, ...list];
  }

  if (token.type === 'symbol' && (token.value === ')' || token.value === ']')) {
    throw new Error(`Unexpected '${token.value}' (line ${token.line})`);
  }

  // If we are NOT in a list and see a symbol with a known arity,
  // we construct an implicit expression list.
  if (!inList && token.type === 'symbol') {
    const arity = ARITIES[token.value];
    if (arity !== undefined) {
      const args = [];
      for (let i = 0; i < arity; i++) {
        // The arguments of an arity-based expression are themselves top-level
        // expressions, so they are not considered "in a list".
        args.push(readFromTokens(tokens, false));
      }
      return [token, ...args];
    }
  }

  // Otherwise, it's just a literal atom (or a symbol inside a list).
  return token;
}

async function apply(func: EvaluatedValue, args: (EvaluatedValue | null)[], inputProvider: InputProvider, outputHandler: OutputHandler, line?: number): Promise<EvaluatedValue | null> {
  if (typeof func === 'object' && func && 'type' in func && func.type === 'closure') {
    const closure = func as Closure;
    const newEnv: Environment = Object.create(closure.env);

    if (args.length !== closure.params.length) {
      const lineInfo = line ? ` (line ${line})` : '';
      throw new Error(`Function expects ${closure.params.length} arguments, but got ${args.length}.${lineInfo}`);
    }

    for (let i = 0; i < closure.params.length; i++) {
      const paramName = closure.params[i].value as string;
      newEnv[paramName] = args[i] as EvaluatedValue;
    }

    return await evaluate(closure.body, newEnv, inputProvider, outputHandler);
  }

  // Handle built-in primitives
  const op = typeof func === 'string' ? func : null;

  if (op === 'concat') {
    // Join all arguments as strings
    return args.map(a => {
      if (a === null) return '';
      if (Array.isArray(a)) {
        return '[' + a.join(' ') + ']';
      }
      return String(a);
    }).join('');
  }

  if (op === 'list') {
    // Create a list from the arguments
    return args.map(a => {
      if (a === null) throw new Error("Cannot create list with null values.");
      if (typeof a !== 'number') throw new Error("List can only contain numbers.");
      return a;
    });
  }

  if (op === 'append') {
    // Append a number to a list
    const list = args[0];
    const value = args[1];
    if (!Array.isArray(list)) throw new Error("First argument to append must be a list.");
    if (value === null) throw new Error("Cannot append null to list.");
    
    let numValue: number;
    if (typeof value === 'number') {
      numValue = value;
    } else if (typeof value === 'string') {
      const parsed = Number(value);
      if (isNaN(parsed)) {
        const lineInfo = line ? ` (line ${line})` : '';
        throw new Error(`Cannot convert string "${value}" to number.${lineInfo}`);
      }
      numValue = parsed;
    } else {
      const lineInfo = line ? ` (line ${line})` : '';
      throw new Error(`Can only append numbers to list.${lineInfo}`);
    }
    
    return [...list, numValue];
  }

  if (op === 'sort') {
    // Sort a list
    const list = args[0];
    if (!Array.isArray(list)) throw new Error("Argument to sort must be a list.");
    return [...list].sort((a, b) => a - b);
  }

  if (op === 'length') {
    // Get length of a list
    const list = args[0];
    if (!Array.isArray(list)) throw new Error("Argument to length must be a list.");
    return list.length;
  }

  if (op === 'get') {
    // Get element at index from list
    const list = args[0];
    const index = args[1];
    if (!Array.isArray(list)) throw new Error("First argument to get must be a list.");
    if (index === null) throw new Error("Index cannot be null.");
    if (typeof index !== 'number') throw new Error("Index must be a number.");
    if (index < 0 || index >= list.length) throw new Error("Index out of bounds.");
    return list[index];
  }

  if (op === 'type') {
    // Get the type of a value
    const value = args[0];
    if (value === null) return "null";
    if (typeof value === 'string') return "string";
    if (typeof value === 'number') return "number";
    if (Array.isArray(value)) return "list";
    if (typeof value === 'object' && 'type' in value && value.type === 'closure') return "closure";
    return "unknown";
  }

  // Handle arithmetic operators (these need number arguments)
  const arithmeticOps = ['+', '-', '*', '/', '%', '<=', '>=', '<', '>', '=='];
  if (op && arithmeticOps.includes(op)) {
    const numArgs = args.map(a => {
      if (a === null) {
        const lineInfo = line ? ` (line ${line})` : '';
        throw new Error(`Cannot perform operation on null value.${lineInfo}`);
      }
      if (typeof a !== 'number') {
        const lineInfo = line ? ` (line ${line})` : '';
        throw new Error(`Invalid argument type for operator ${op}, expected number.${lineInfo}`);
      }
      return a;
    });

    switch (op) {
      case '+': return numArgs[0] + numArgs[1];
      case '-': return numArgs[0] - numArgs[1];
      case '*': return numArgs[0] * numArgs[1];
      case '/': 
        if (numArgs[1] === 0) throw new Error("Division by zero.");
        return numArgs[0] / numArgs[1];
      case '%': 
        if (numArgs[1] === 0) throw new Error("Modulus by zero.");
        return numArgs[0] % numArgs[1];
      case '<=': return numArgs[0] <= numArgs[1] ? 1 : 0; // Use 1 for true, 0 for false
      case '>=': return numArgs[0] >= numArgs[1] ? 1 : 0;
      case '<': return numArgs[0] < numArgs[1] ? 1 : 0;
      case '>': return numArgs[0] > numArgs[1] ? 1 : 0;
      case '==': return numArgs[0] === numArgs[1] ? 1 : 0;
    }
  }

  // If we get here, it's an unknown function
  const lineInfo = line ? ` (line ${line})` : '';
  throw new Error(`Not a function: ${func}${lineInfo}`);
}

async function evaluate(expr: Expression, env: Environment, inputProvider: InputProvider, outputHandler: OutputHandler): Promise<EvaluatedValue | null> {
  if (!Array.isArray(expr)) { // It's an Atom
    if (expr.type === 'symbol') {
      if (expr.value in env) return env[expr.value];
      // Check for built-in functions that are not special forms
      if (Object.keys(ARITIES).includes(expr.value) && !['set', 'lambda', 'if', 'inc', 'dec'].includes(expr.value)) {
        return expr.value;
      }
      throw new Error(`Undefined variable: ${expr.value} (line ${expr.line})`);
    }
    return expr.value; // string or number literal
  }

  if (expr.length === 0) {
    throw new Error("Cannot evaluate empty list.");
  }
  
  const [operatorNode, ...args] = expr;

  if ('type' in operatorNode && operatorNode.type === 'symbol') {
    const op = operatorNode.value;
    
    // Special Forms
    switch(op) {
      case 'set': {
        const varNameNode = args[0] as Atom;
        if (!varNameNode || varNameNode.type !== 'symbol') throw new Error(`Variable name for set must be a symbol (line ${varNameNode?.line || 'unknown'})`);
        const value = await evaluate(args[1], env, inputProvider, outputHandler);
        if (value !== null) env[varNameNode.value] = value;
        return null;
      }
      case 'lambda': {
        const paramsExpr = args[0];
        const body = args[1];
        let paramSymbols: Atom[];

        if (Array.isArray(paramsExpr)) { // e.g., lambda (x y) ...
          paramSymbols = paramsExpr.map(p => {
            if (!('type' in p) || p.type !== 'symbol') {
              const line = 'line' in p ? p.line : 'unknown';
              throw new Error(`Lambda parameters in a list must be symbols (line ${line})`);
            }
            return p;
          });
        } else if ('type' in paramsExpr && paramsExpr.type === 'symbol') { // e.g., lambda x ...
          paramSymbols = [paramsExpr];
        } else {
          throw new Error("Lambda parameters must be a symbol or a list of symbols.");
        }
        
        return { type: 'closure', params: paramSymbols, body, env };
      }
      case 'if': {
        const condition = await evaluate(args[0], env, inputProvider, outputHandler);
        // Use a truthy check (non-zero number is true)
        return condition ? await evaluate(args[1], env, inputProvider, outputHandler) : await evaluate(args[2], env, inputProvider, outputHandler);
      }
      case 'while': {
        const condition = args[0];
        const body = args[1];
        let result = null;
        
        while (await evaluate(condition, env, inputProvider, outputHandler)) {
          result = await evaluate(body, env, inputProvider, outputHandler);
        }
        
        return result;
      }
      case 'for': {
        const init = args[0];
        const condition = args[1];
        const body = args[2];
        let result = null;
        
        // Execute initialization
        if (init) {
          await evaluate(init, env, inputProvider, outputHandler);
        }
        
        // Execute loop
        while (await evaluate(condition, env, inputProvider, outputHandler)) {
          result = await evaluate(body, env, inputProvider, outputHandler);
        }
        
        return result;
      }
      case 'begin': {
        let result = null;
        for (const expr of args) {
          result = await evaluate(expr, env, inputProvider, outputHandler);
        }
        return result;
      }
      case 'print': {
        const value = await evaluate(args[0], env, inputProvider, outputHandler);
        if (value !== null) {
          if (typeof value === 'string') {
            outputHandler(value.replace(/\\n/g, '\n'));
          } else if (Array.isArray(value)) {
            outputHandler('[' + value.join(' ') + ']');
          } else {
            outputHandler(String(value).replace(/\\n/g, '\n'));
          }
        }
        return null;
      }
      case 'input': {
        if (args.length > 0) throw new Error("The 'input' keyword takes no arguments.");
        const input = await inputProvider();
        const num = Number(input);
        return isNaN(num) ? input : num;
      }
      case 'inc': {
        const varNameNode = args[0] as Atom;
        if (!varNameNode || varNameNode.type !== 'symbol') throw new Error(`Variable name for inc must be a symbol (line ${varNameNode?.line || 'unknown'})`);
        if (!(varNameNode.value in env)) throw new Error(`Undefined variable: ${varNameNode.value} (line ${varNameNode.line})`);
        const currentValue = env[varNameNode.value];
        if (typeof currentValue !== 'number') throw new Error(`Cannot increment non-numeric variable: ${varNameNode.value} (line ${varNameNode.line})`);
        env[varNameNode.value] = currentValue + 1;
        return env[varNameNode.value];
      }
      case 'dec': {
        const varNameNode = args[0] as Atom;
        if (!varNameNode || varNameNode.type !== 'symbol') throw new Error(`Variable name for dec must be a symbol (line ${varNameNode?.line || 'unknown'})`);
        if (!(varNameNode.value in env)) throw new Error(`Undefined variable: ${varNameNode.value} (line ${varNameNode.line})`);
        const currentValue = env[varNameNode.value];
        if (typeof currentValue !== 'number') throw new Error(`Cannot decrement non-numeric variable: ${varNameNode.value} (line ${varNameNode.line})`);
        env[varNameNode.value] = currentValue - 1;
        return env[varNameNode.value];
      }
    }
  }
  
  // It's a function application
  const func = await evaluate(operatorNode, env, inputProvider, outputHandler);
  const evaluatedArgs = await Promise.all(args.map(arg => evaluate(arg, env, inputProvider, outputHandler)));
  
  if (func === null) {
      throw new Error("Cannot call null as a function.");
  }
  const line = 'type' in operatorNode && 'line' in operatorNode ? operatorNode.line : undefined;
  return await apply(func, evaluatedArgs, inputProvider, outputHandler, line);
}

export async function runPretzl(code: string, inputProvider: InputProvider, outputHandler: OutputHandler): Promise<void> {
  if (!code.trim()) {
    return;
  }
  const tokenInfos = tokenize(code);
  const tokens = tokenInfos.map(atomize);
  const expressions = parse(tokens);
  
  const globalEnv: Environment = {};
  for (const expr of expressions) {
    await evaluate(expr, globalEnv, inputProvider, outputHandler);
  }
} 