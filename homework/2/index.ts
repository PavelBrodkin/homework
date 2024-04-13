const instructions = {
  "SET A": 0,
  "PRINT A": 1,
  "IFN A": 2,
  "IF A": 3,
  RET: 4,
  "DEC A": 5,
  "INC A": 6,
  JMP: 7,
};

// Увеличивает с 10 до 20, потом уменьшает до 5 и выходит из программы
const program = [
  instructions["SET A"],
  10,
  instructions["PRINT A"],
  instructions["IF A"],
  20,
  instructions.JMP,
  10,
  instructions["INC A"],
  instructions.JMP,
  2,
  instructions["PRINT A"],
  instructions["IF A"],
  5,
  instructions["RET"],
  instructions["DEC A"],
  instructions.JMP,
  10,
];

function execute(program: number[]) {
  const stack: number[] = [];
  let state;
  let cursor = 0;
  let value;

  while (true) {
    const input = program[cursor];
    state = stack.pop();
    cursor++;

    if (state === instructions["SET A"] && input) {
      value = input;
      continue;
    }

    if (state === instructions.JMP && input) {
      cursor = input;
      continue;
    }

    if (state === instructions["IF A"] && input) {
      if (value !== input) {
        cursor++;
      }
      continue;
    }

    if (input === instructions["SET A"]) {
      stack.push(input);
      continue;
    }

    if (input === instructions["PRINT A"]) {
      console.log(value);
      continue;
    }

    if (input === instructions["DEC A"] && value !== undefined) {
      value--;
      continue;
    }

    if (input === instructions["INC A"] && value !== undefined) {
      value++;
      continue;
    }

    if (input === instructions["IF A"]) {
      stack.push(input);
      continue;
    }

    if (input === instructions["IFN A"]) {
      if (value) {
        cursor++;
      }

      continue;
    }

    if (input === instructions.JMP) {
      stack.push(input);
      continue;
    }

    if (input === instructions.RET) {
      return value;
    }
  }
}

console.log("result", execute(program));
