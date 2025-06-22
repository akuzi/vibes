export interface SampleProgram {
  name: string;
  code: string;
}

export const PRETZL_SAMPLES: SampleProgram[] = [
  {
    name: 'Factorial',
    code: `set factorial
  lambda n
    if (<= n 1)
      1
      (* n (factorial (- n 1)))

print "Enter a number to calculate factorial: "
set num (input)
print (concat "Factorial of " num " is: " (factorial num))`
  },
  {
    name: 'Various Expressions',
    code: `print "=== Various Expression Types ==="

# Arithmetic expressions
print "Arithmetic:"
print (+ 1 2)
print (* (+ 1 2) 3)
print (/ (* (+ 1 2) 3) 2)

# Comparison expressions
print "Comparisons:"
print (< 5 10)
print (== (+ 2 3) 5)
print (> 10 5)

# String expressions
print "Strings:"
print "Hello World"
print (concat "Hello" " " "World")
print (concat "The answer is: " (+ 2 3))

# List expressions
print "Lists:"
print [1 2 3 4 5]
print (append [1 2 3] 4)
print (length [10 20 30 40])

# Mixed expressions
print "Mixed:"
print (concat "Sum of " (+ 1 2) " and " (+ 3 4) " is " (+ (+ 1 2) (+ 3 4)))
print (if (> 5 3) "Five is greater than three" "This won't print")
print (if (< 1 0) "This won't print" "One is not less than zero")`
  },
  {
    name: 'Function Composition',
    code: `set inc lambda x (+ x 1)
set square lambda x (* x x)

set squared_inc lambda x (square (inc x))

print (squared_inc 3)`
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
    name: 'Loop Examples',
    code: `print "=== Various Loop Examples ==="

# While loop - count up
print "While loop counting up:"
set i 1
while (< i 6)
  (begin
    (print i)
    (inc i))

# While loop - count down
print "While loop counting down:"
set j 5
while (> j 0)
  (begin
    (print j)
    (dec j))

# For loop
print "For loop:"
for (set k 0) (< k 5) (inc k)
  (print k)

# While loop with condition
print "While loop with condition:"
set num 1
while (< num 10)
  (begin
    (if (== (% num 2) 0)
      (print (concat num " is even"))
      (print (concat num " is odd")))
    (inc num))

# Loop with break-like behavior (using condition)
print "Loop with early exit:"
set counter 1
while (< counter 10)
  (begin
    (print counter)
    (if (== counter 5)
      (set counter 10)
      (inc counter)))`
  },
]; 