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
    code: `set factorial
  lambda n
    if (<= n 1)
      1
      (* n (factorial (- n 1)))

print (factorial 5)`
  },
  {
    name: 'Function Composition',
    code: `set inc lambda x (+ x 1)
set square lambda x (* x x)

set squared_inc lambda x (square (inc x))

print (squared_inc 3)`
  },
  {
    name: 'Circle Area Calculator',
    code: `print "Enter the radius of a circle: "
set radius (input)
set pi 3.14159
print (concat "The area is: " (* pi (* radius radius)))`
  },
  {
    name: 'Number Sorter',
    code: `print "Enter the number of values to sort: "
set count (input)
set numbers []
set i 0

while (< i count)
  (begin
    (print "Enter a number: ")
    (set num (input))
    (set numbers (append numbers num))
    (set i (+ i 1)))

print (concat "Original numbers: " numbers)
print (concat "Sorted numbers: " (sort numbers))`
  },
  {
    name: 'For Loop Example',
    code: `print "Counting from 1 to 5:"
set i 1

for (set i 1) (<= i 5) (set i (+ i 1))
  (print i)`
  },
  {
    name: 'List Literals',
    code: `set numbers [1 2 3 4 5]
set empty []
set mixed [10 20 30]

print "Numbers:"
print numbers
print "Empty list:"
print empty
print "Mixed list:"
print mixed
print "First element:"
print (get numbers 0)
print "Length:"
print (length numbers)`
  },
]; 