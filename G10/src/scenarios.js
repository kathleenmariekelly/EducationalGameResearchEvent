// scenarios.js
//
// Content pool for Type Racer (PYTHON edition). Each entry is shown to
// the player while driving; they must drive over the boost pad matching
// the `answer` type before the value scrolls past.
//
// answer must be one of LANE_TYPES.
//   "var"  -> a variable assignment; answer is the variable's type
//   "func" -> an expression / function call; answer is the type it
//             PRODUCES / evaluates to
//
// Python types kept beginner-friendly: int, float, str, bool, list.

export const LANE_TYPES = ["int", "float", "str", "bool", "list"];

export const LANE_STYLE = {
  int:   { label: "int",   color: 0x4f9dff },
  float: { label: "float", color: 0xffb14f },
  str:   { label: "str",   color: 0x8bd44f },
  bool:  { label: "bool",  color: 0xd44fd4 },
  list:  { label: "list",  color: 0xff6f91 },
};

export const SCENARIOS = [
  // ---- int ----
  { prompt: "x = 42",              answer: "int",   kind: "var",  why: "A whole number with no decimal is an int." },
  { prompt: "lives = 3",           answer: "int",   kind: "var",  why: "Whole number = int." },
  { prompt: "5 + 7",               answer: "int",   kind: "func", why: "int + int = int." },
  { prompt: "len('hello')",        answer: "int",   kind: "func", why: "len() counts items and returns a whole number." },
  { prompt: "count = 0",           answer: "int",   kind: "var",  why: "Whole number = int." },
  { prompt: "abs(-9)",             answer: "int",   kind: "func", why: "abs() of a whole number is an int." },
  { prompt: "3 * 4",               answer: "int",   kind: "func", why: "Two whole numbers multiplied stay an int." },
  { prompt: "len([1, 2, 3])",      answer: "int",   kind: "func", why: "len() returns a whole-number count." },
  { prompt: "age = 20",            answer: "int",   kind: "var",  why: "Whole number = int." },
  { prompt: "sum([1, 2, 3])",      answer: "int",   kind: "func", why: "Adding whole numbers gives an int." },
  { prompt: "max(4, 9)",           answer: "int",   kind: "func", why: "max() of whole numbers returns an int." },
  { prompt: "min(4, 9)",           answer: "int",   kind: "func", why: "min() of whole numbers returns an int." },
  { prompt: "max([3, 7, 1])",      answer: "int",   kind: "func", why: "max() of an int list returns an int." },
  { prompt: "min([3, 7, 1])",      answer: "int",   kind: "func", why: "min() of an int list returns an int." },
  { prompt: "int('25')",           answer: "int",   kind: "func", why: "int() converts text to a whole number." },
  { prompt: "round(4.7)",          answer: "int",   kind: "func", why: "round() with no digits returns an int." },
  { prompt: "7 - 2",               answer: "int",   kind: "func", why: "int minus int is an int." },
  { prompt: "total = 100",         answer: "int",   kind: "var",  why: "Whole number = int." },

  // ---- float ----
  { prompt: "pi = 3.14",           answer: "float", kind: "var",  why: "A number with a decimal is a float." },
  { prompt: "gpa = 3.9",           answer: "float", kind: "var",  why: "Decimal number = float." },
  { prompt: "7.5 + 2.0",           answer: "float", kind: "func", why: "Adding decimals gives a decimal (float)." },
  { prompt: "10 / 4",              answer: "float", kind: "func", why: "In Python, / always gives a decimal." },
  { prompt: "float('2.5')",        answer: "float", kind: "func", why: "float() makes a decimal number." },
  { prompt: "price = 9.99",        answer: "float", kind: "var",  why: "Decimal number = float." },
  { prompt: "temp = 98.6",         answer: "float", kind: "var",  why: "Decimal number = float." },
  { prompt: "height = 5.5",        answer: "float", kind: "var",  why: "Decimal number = float." },
  { prompt: "max(2.5, 1.0)",       answer: "float", kind: "func", why: "max() of decimals returns a float." },
  { prompt: "min(2.5, 1.0)",       answer: "float", kind: "func", why: "min() of decimals returns a float." },
  { prompt: "6.0 / 2",             answer: "float", kind: "func", why: "Division gives a decimal (float)." },
  { prompt: "3.0 * 2",             answer: "float", kind: "func", why: "A decimal times a number is a float." },
  { prompt: "rate = 0.05",         answer: "float", kind: "var",  why: "Decimal number = float." },

  // ---- str ----
  { prompt: "name = 'Ada'",        answer: "str",   kind: "var",  why: "Text in quotes is a str." },
  { prompt: 'city = "Paris"',      answer: "str",   kind: "var",  why: "Text in quotes is a str." },
  { prompt: "'foo' + 'bar'",       answer: "str",   kind: "func", why: "Joining text gives a str." },
  { prompt: "str(42)",             answer: "str",   kind: "func", why: "str() turns a number into text." },
  { prompt: "'hi'.upper()",        answer: "str",   kind: "func", why: "upper() returns text (a str)." },
  { prompt: "word = 'cat'",        answer: "str",   kind: "var",  why: "Text in quotes is a str." },
  { prompt: "greeting = 'hello'",  answer: "str",   kind: "var",  why: "Text in quotes is a str." },
  { prompt: "input('name? ')",     answer: "str",   kind: "func", why: "input() ALWAYS returns a str." },
  { prompt: "input()",             answer: "str",   kind: "func", why: "input() always returns text (a str)." },
  { prompt: "'cat'.lower()",       answer: "str",   kind: "func", why: "lower() returns text (a str)." },
  { prompt: "'a' * 3",             answer: "str",   kind: "func", why: "Repeating text gives a str." },
  { prompt: "first = 'Sam'",       answer: "str",   kind: "var",  why: "Text in quotes is a str." },
  { prompt: "'-'.join(['a','b'])", answer: "str",   kind: "func", why: "join() combines items into one str." },

  // ---- bool ----
  { prompt: "is_ready = True",     answer: "bool",  kind: "var",  why: "True / False are bool values." },
  { prompt: "done = False",        answer: "bool",  kind: "var",  why: "True / False are bool values." },
  { prompt: "5 > 3",               answer: "bool",  kind: "func", why: "A comparison is either True or False." },
  { prompt: "10 == 10",            answer: "bool",  kind: "func", why: "An equality check is True or False." },
  { prompt: "7 < 2",               answer: "bool",  kind: "func", why: "A comparison is True or False." },
  { prompt: "passed = True",       answer: "bool",  kind: "var",  why: "True / False are bool values." },
  { prompt: "active = False",      answer: "bool",  kind: "var",  why: "True / False are bool values." },
  { prompt: "3 in [1, 2, 3]",      answer: "bool",  kind: "func", why: "'in' checks membership: True or False." },
  { prompt: "4 != 5",              answer: "bool",  kind: "func", why: "!= (not equal) is True or False." },
  { prompt: "'a' == 'b'",          answer: "bool",  kind: "func", why: "Comparing text gives True or False." },
  { prompt: "8 >= 8",              answer: "bool",  kind: "func", why: ">= comparison is True or False." },

  // ---- list ----
  { prompt: "nums = [1, 2, 3]",    answer: "list",  kind: "var",  why: "Square brackets make a list." },
  { prompt: "names = ['a', 'b']",  answer: "list",  kind: "var",  why: "Square brackets make a list." },
  { prompt: "colors = ['red']",    answer: "list",  kind: "var",  why: "Square brackets make a list." },
  { prompt: "scores = [90, 85]",   answer: "list",  kind: "var",  why: "Square brackets make a list." },
  { prompt: "list('abc')",         answer: "list",  kind: "func", why: "list() builds a list." },
  { prompt: "[1, 2] + [3, 4]",     answer: "list",  kind: "func", why: "Adding lists makes one longer list." },
  { prompt: "'a,b,c'.split(',')",  answer: "list",  kind: "func", why: "split() breaks text into a list." },
  { prompt: "sorted([3, 1, 2])",   answer: "list",  kind: "func", why: "sorted() returns a new list." },
  { prompt: "list(range(4))",      answer: "list",  kind: "func", why: "list(range(...)) returns a list." },
  { prompt: "items = []",          answer: "list",  kind: "var",  why: "Empty square brackets make a list." },
  { prompt: "[0] * 4",             answer: "list",  kind: "func", why: "Repeating a list gives a list." },

  // ---- print() returns None-ish trickiness kept OUT on purpose; instead
  //      print appears as a str-producing arg example is avoided. We use
  //      print only where it clearly wraps a value:
  { prompt: "print('hi')",         answer: "str",   kind: "func", hint: "type being printed", why: "The value inside print here is 'hi', a str." },
  { prompt: "print(3.0)",          answer: "float", kind: "func", hint: "type being printed", why: "The value inside print is 3.0, a float." },
  { prompt: "print(len('ab'))",    answer: "int",   kind: "func", hint: "type being printed", why: "len('ab') is 2, an int, printed out." },
  { prompt: "print([1, 2])",       answer: "list",  kind: "func", hint: "type being printed", why: "The value inside print is a list." },
];

export function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
