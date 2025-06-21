// This will eventually contain the Prex interpreter.

// Type definitions
// An Atom is a literal value (string or number) or a symbol.
type Atom = { type: 'string'; value: string } | { type: 'number'; value: number } | { type: 'symbol'; value: string };
type Expression = Atom | Expression[];
// A closure captures its parameters, body, and the environment where it was defined.
type Closure = {
  type: 'closure';
  params: Atom[];
  body: Expression;
  env: Environment;
};
type EvaluatedValue = string | number | Closure;
type Environment = { [key: string]: EvaluatedValue };
type InputProvider = () => Promise<string>;
type OutputHandler = (output: string) => void;

const ARITIES: { [key: string]: number } = {
  '+': 2,
  '-': 2,
  '*': 2,
  '/': 2,
  '<=': 2,
  '>=': 2,
  '<': 2,
  '>': 2,
  '==': 2,
  'print': 1,
  'define': 2,
  'lambda': 2,
  'if': 3,
  'input': 0,
};

function tokenize(code: string): string[] {
  // This more robust regex correctly handles strings with spaces, parentheses, and other symbols.
  const regex = /"[^"]*"|[()]|[^\s()]+/g;
  return code.match(regex) || [];
}

function atomize(token: string): Atom {
  if (token.startsWith('"') && token.endsWith('"')) {
    return { type: 'string', value: token.slice(1, -1) };
  }
  const num = Number(token);
  if (!isNaN(num) && isFinite(Number(token))) {
    return { type: 'number', value: num };
  }
  return { type: 'symbol', value: token };
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
      throw new Error("Unclosed list, missing ')'");
    }
    tokens.shift(); // Consume ')'
    return list;
  }

  if (token.type === 'symbol' && token.value === ')') {
    throw new Error("Unexpected ')'");
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

async function apply(func: EvaluatedValue, args: (EvaluatedValue | null)[], inputProvider: InputProvider, outputHandler: OutputHandler): Promise<EvaluatedValue | null> {
  if (typeof func === 'object' && func?.type === 'closure') {
    const closure = func as Closure;
    const newEnv: Environment = Object.create(closure.env);

    if (args.length !== closure.params.length) {
      throw new Error(`Function expects ${closure.params.length} arguments, but got ${args.length}.`);
    }

    for (let i = 0; i < closure.params.length; i++) {
      const paramName = closure.params[i].value as string;
      newEnv[paramName] = args[i] as EvaluatedValue;
    }

    return await evaluate(closure.body, newEnv, inputProvider, outputHandler);
  }

  // Handle built-in primitives
  const op = typeof func === 'string' ? func : null;
  const numArgs = args.map(a => {
    if (a === null) throw new Error("Cannot perform operation on null value.");
    if (typeof a !== 'number') throw new Error(`Invalid argument type for operator ${op}, expected number.`);
    return a;
  });

  switch (op) {
    case '+': return numArgs[0] + numArgs[1];
    case '-': return numArgs[0] - numArgs[1];
    case '*': return numArgs[0] * numArgs[1];
    case '/': 
      if (numArgs[1] === 0) throw new Error("Division by zero.");
      return numArgs[0] / numArgs[1];
    case '<=': return numArgs[0] <= numArgs[1] ? 1 : 0; // Use 1 for true, 0 for false
    case '>=': return numArgs[0] >= numArgs[1] ? 1 : 0;
    case '<': return numArgs[0] < numArgs[1] ? 1 : 0;
    case '>': return numArgs[0] > numArgs[1] ? 1 : 0;
    case '==': return numArgs[0] === numArgs[1] ? 1 : 0;
    default:
      throw new Error(`Not a function: ${func}`);
  }
}

async function evaluate(expr: Expression, env: Environment, inputProvider: InputProvider, outputHandler: OutputHandler): Promise<EvaluatedValue | null> {
  if (!Array.isArray(expr)) { // It's an Atom
    if (expr.type === 'symbol') {
      if (expr.value in env) return env[expr.value];
      // Check for built-in functions that are not special forms
      if (Object.keys(ARITIES).includes(expr.value) && !['define', 'lambda', 'if'].includes(expr.value)) {
        return expr.value;
      }
      throw new Error(`Undefined variable: ${expr.value}`);
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
      case 'define': {
        const varNameNode = args[0] as Atom;
        if (!varNameNode || varNameNode.type !== 'symbol') throw new Error("Variable name for define must be a symbol.");
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
            if (!('type' in p) || p.type !== 'symbol') throw new Error("Lambda parameters in a list must be symbols.");
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
      case 'print': {
        const value = await evaluate(args[0], env, inputProvider, outputHandler);
        if (value !== null) outputHandler(String(value));
        return null;
      }
      case 'input': {
        if (args.length > 0) throw new Error("The 'input' keyword takes no arguments.");
        const input = await inputProvider();
        const num = Number(input);
        return isNaN(num) ? input : num;
      }
    }
  }
  
  // It's a function application
  const func = await evaluate(operatorNode, env, inputProvider, outputHandler);
  const evaluatedArgs = await Promise.all(args.map(arg => evaluate(arg, env, inputProvider, outputHandler)));
  
  if (func === null) {
      throw new Error("Cannot call null as a function.");
  }
  return await apply(func, evaluatedArgs, inputProvider, outputHandler);
}

export async function runPretzl(code: string, inputProvider: InputProvider, outputHandler: OutputHandler): Promise<void> {
  if (!code.trim()) {
    return;
  }
  const tokens = tokenize(code).map(atomize);
  const expressions = parse(tokens);
  
  const globalEnv: Environment = {};
  for (const expr of expressions) {
    await evaluate(expr, globalEnv, inputProvider, outputHandler);
  }
} 