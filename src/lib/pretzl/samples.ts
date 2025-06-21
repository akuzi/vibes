export interface SampleProgram {
  name: string;
  code: string;
}

export const PRETZL_SAMPLES: SampleProgram[] = [
  {
    name: 'Simple Arithmetic',
    code: 'print + 1 2'
  },
  {
    name: 'Nested Expression',
    code: 'print * (+ 1 2) 3'
  },
  {
    name: 'Factorial',
    code: `define factorial
  lambda n
    if (<= n 1)
      1
      (* n (factorial (- n 1)))

print (factorial 5)`
  },
  {
    name: 'Function Composition',
    code: `define inc lambda x (+ x 1)
define square lambda x (* x x)

define squared_inc lambda x (square (inc x))

print (squared_inc 3)`
  },
  {
    name: 'Circle Area Calculator',
    code: `print "Enter the radius of a circle:"
define radius (input)
define pi 3.14159
print "The area is:"
print (* pi (* radius radius))`
  },
]; 