import { equal, deepEqual } from "node:assert";

// Решение Андрея

export function binary(num: number) {
  const str = new Uint32Array([num])[0].toString(2);
  return "0b" + str.padStart(32, "0").replace(/(.{4})(?!$)/g, "$1_");
}

class BCD {
  /** Кол-во бит на одно BCD число */
  static readonly BCD_SIZE = 4;
  /** В Chrome числа меньше чем 2 ** 31 могут быть представлены не указателями на другую ячейку памяти,
   * а храниться как само число. Числа, которые превышают 31 бит будут уже представлены как указатели. Как следствие, мы
   * можем максимум закодировать одно BCD число 7 байтами (28 бит). Но зато числа будут более эффективно представлены в памяти
   * (не указателями). 3 бита остаются не под число  */
  static readonly SMI_SIZE = 31;
  /** Сколько влазит в одно BCD число исходя из ограничений */
  static readonly BCD_PER_NUMBER = Math.floor(this.SMI_SIZE / this.BCD_SIZE); // 7

  /** Все положительные BCD числа в старшей 4битной группе разрядов будут содержать такое значение */
  static readonly PLUS = 0b1100;
  /** Все отрицательные BCD числа в старшей 4битной группе разрядов будут содержать такое значение  */
  static readonly MINUS = 0b1101;
  /** Маска для извлечения чисел */
  static readonly MASK = 0b1111;

  /** Тот индекс в доступных нам 7 байтах, где будем кодировать знак. Получается 6ая группа
   * 000_[0000 - знак this.PLUS | this.MINUS]_0000_0000_0000_0000_0000_0000 */
  static readonly SIGN_INDEX = this.BCD_PER_NUMBER - 1;
  /** [000 - 3 бита которые не используются]_0000_0000_0000_0000_0000_0000_0000, можно закодировать от 0 до 7 */ e;
  static readonly FREE_INDEX = this.BCD_PER_NUMBER;

  /** Массив доступных BCD чисел */
  static readonly BCD8421 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  /** Массив BCD, чтобы дополнять до 9 (дополнение 0 до 9 это 9, дополнение 1 до 9 это 8 и так далее)  */
  static readonly COMPLEMENT9S = this.BCD8421.slice().reverse();

  readonly buffer: number[] = [0];

  /** Похожая штука с freeSlots, просто достаем знак и смотрим по константе минус это или плюс */
  get isNegative(): boolean {
    return (
      ((this.buffer.at(-1)! >>> this.getShift(BCD.SIGN_INDEX)) & BCD.MASK) ===
      BCD.MINUS
    );
  }

  get freeSlots(): number {
    /** this.buffer.at(-1) получает последний элемент в массиве
     * Далее мы делаем логический сдвиг право от индекса 3 свободных битов на 28 бит
     * Мы знаем что вначале 0, поэтому это вроде как эквивалент обычному >> (знак все равно не будет перенесен)
     * Пример с заполненным числом (максимально заполненным по SMI)
     * 0b0011_0111_1111_1110_1010_1011_1001_0001 >>> 7 * 4 (28) === 0b0000_0000_0000_0000_0000_0000_0000_0011
     * То есть таким образом мы получаем доступ к тем 3ем байтам, которые кодировали сколько свободного места.
     *
     * Ну и далее 0011 & 1111 = 0011 === 2
     * freeSlots === 2
     *
     * Обнуляем все старшие биты маской и получаем нужное число
     * */
    return (this.buffer.at(-1)! >>> this.getShift(BCD.FREE_INDEX)) & BCD.MASK;
  }

  get length() {
    /** Так как информация сколько свободно храниться в последнем элементе массива,
     * значит все пред элемент заполнены полностью, то есть на 7, а значит можно их перемножить и отнять те
     * самые свободные слоты
     *
     * Можно было бы и при инициализации класса, при обходе по разрядам сохранить длину, но в такой реализации
     * условно при передаче на сервер, там тоже смогут декодировать, так как знают что 3 старших бита отвечают за свободные слоты
     * */
    return this.buffer.length * BCD.BCD_PER_NUMBER - this.freeSlots;
  }

  constructor(number: bigint | number[]) {
    if (Array.isArray(number)) {
      this.buffer = number;
      return;
    }

    const that = this,
      isNegative = number < 0n;

    if (isNegative) {
      /** Если число отрицательное, нормализуем его до положительного.
       *  И уже исходя из константы isNegative будем кодировать знак */
      number *= -1n;
    }

    /** Далее необходимо обойти число по разрядам 123 => 3, потом 2, потом 1 и так далее */
    let i = number,
      j = 0;

    do {
      /** Второй элемент в кортеже мог бы быть флаг переполнения, но именно в конструкторе этого никогда не произойдет,
       * так как у нас на вход bigint который мы обходим ПО РАЗРЯДНО, а значит все числа от 0 до 9.
       *  */
      const [digit] = this.resolveDigit(Number(i % 10n), isNegative);
      addToBuffer(digit);

      /** Если вылезли за SMI, добавляем след число в массив, в которе будем кодировать BCD */
      if (j >= BCD.BCD_PER_NUMBER) {
        j = 0;
        this.buffer.push(0);
      }

      // Можно тут не делать Math.floor так как это bigint и результат не может быть дробное число.
      i /= 10n;
    } while (i > 0);

    /** Записываем знак, причем этот знак всегда будет в последнем элементе массива */
    addToBuffer(
      isNegative ? BCD.MINUS : BCD.PLUS,
      this.getShift(BCD.SIGN_INDEX),
    );

    /** Записываем сколько число имеет вакантных мест.
     *  Записываем это в свободные 3 бита которые остались от ограничения в SMI.
     *  Как пример, у нас буффер это [2344234234б, 444], вот в 444 влезет еще какое-то кол-во цифр
     *  и именно эту информацию мы записываем.
     *  65536n === 0b[0010 - 2йка, то есть влазит еще 2 числа]_1100_[0000 - вот это]_0110_0101_0101_0011_0110
     *
     *  Причем кодируем мы их всегда в последний элемент массива, условно
     *  [12234556, 4553454534, 345345 - вот тут это будет закодировано]
     *  */
    addToBuffer(BCD.BCD_PER_NUMBER - j + 1, this.getShift(BCD.FREE_INDEX));

    /** Сохраняем в буфер со сдвигом 4 через ИЛИ, чтобы сформировать BCD число */
    function addToBuffer(value: number, shift = j * BCD.BCD_SIZE) {
      that.buffer[that.buffer.length - 1] |= value << shift;
      j++;
    }
  }

  /** итератор поверх итератора, который просто добавляет еще и индекс */
  *entries(
    params?: Parameters<this["values"]>[0],
  ): IterableIterator<[number, number]> {
    let i = 0;

    for (const num of this.values(params)) {
      yield [i, num];
      i++;
    }
  }

  *values({
    /** должен ли быть знак */
    sign = false,
    /** до куда итерироваться, необходимо для 123 + 2 стало 123 + 002 */
    fitTo = this.length,
  } = {}): IterableIterator<number> {
    let counter = 0;

    iter: for (const [numI, num] of this.buffer.entries()) {
      const isLastNum = numI === this.buffer.length - 1;

      for (let i = 0; i < BCD.BCD_PER_NUMBER; i++) {
        if (isLastNum) {
          if (i === BCD.BCD_PER_NUMBER - this.freeSlots) {
            break iter;
          }
        }

        counter++;
        yield (num >>> this.getShift(i)) & BCD.MASK;
      }
    }

    for (; counter < fitTo; counter++) {
      yield (this.isNegative ? BCD.COMPLEMENT9S : BCD.BCD8421)[0];
    }

    if (sign) {
      yield (this.buffer.at(-1)! >>> this.getShift(BCD.SIGN_INDEX)) & BCD.MASK;
    }
  }

  get(index: number) {
    if (index < 0) {
      index += this.length;
    }

    if (index < 0 || index > this.length) {
      throw new RangeError(
        "The requested index exceeds the length of the number",
      );
    }

    /**
     * index = 3
     * 65536
     * 0010[свободные]_1100[знак]_0000_0110_0101_0101_0011_0110
     *
     * bufI = 0, нужен первый элемент buffer
     * shiftI = 3 % 7 = 3
     *
     * 0b0010_1100_0000_0110_0101_0101_0011_0110  >>> 3 * 4 (12) === 0b0000_0000_0000_0010_1100_0000_0110_0101
     * 0b0000_0000_0000_0010_1100_0000_0110_0101 & b0000_0000_0000_0000_0000_0000_0000_1111 = 0101 = 5
     * */

    // получаем куда именно смотреть в буффер, в какой элемент массива
    const bufI = Math.floor(index / BCD.BCD_PER_NUMBER),
      shiftI = index % BCD.BCD_PER_NUMBER;

    // получаем число из массива и сдвигаем до нужного
    return (this.buffer[bufI] >>> this.getShift(shiftI)) & BCD.MASK;
  }

  add(a: bigint | BCD): BCD {
    const that = this;

    let res = [0];

    const aBCD = typeof a === "bigint" ? new BCD(a) : a,
      aIter = aBCD.values({ fitTo: this.length });

    // возможные варианты сложения

    // 6 + 3
    // - 6 - 3 = - (6 + 3)
    // 6 - 3   = 3
    // 6 - 7   = -1

    const allNumbersAreNegative = this.isNegative && aBCD.isNegative,
      allNumbersAreNonNegative = !this.isNegative && !aBCD.isNegative,
      needComplement9 = allNumbersAreNegative;

    let addition = 0,
      j = 0;

    for (let num1 of this.values({ fitTo: aBCD.length })) {
      num1 = resolveComplement9(num1);
      const num2 = resolveComplement9(aIter.next().value!);

      const [sum, overflow] = this.resolveDigit(
        this.binaryAdd(this.binaryAdd(num1, num2), addition),
      );

      addition = overflow;
      addToResult(resolveComplement9(sum));

      if (j >= BCD.BCD_PER_NUMBER) {
        j = 0;
        res.push(0);
      }
    }

    if (allNumbersAreNegative || allNumbersAreNonNegative) {
      if (addition) {
        addToResult(resolveComplement9(1));
      }

      addHeader(allNumbersAreNegative);
    } else if (addition) {
      addHeader(false);
      return new BCD(res).add(1n);
    } else {
      if (res.some(isNonZero)) {
        addHeader(true);
      } else {
        res = res.map(() => 0);
        addHeader(false);
      }
    }

    return new BCD(res);

    function addHeader(isNegative: boolean) {
      if (j >= BCD.BCD_PER_NUMBER) {
        j = 0;
        res.push(0);
      }

      addToResult(
        isNegative ? BCD.MINUS : BCD.PLUS,
        that.getShift(BCD.SIGN_INDEX),
      );
      addToResult(BCD.BCD_PER_NUMBER - j + 1, that.getShift(BCD.FREE_INDEX));
    }

    function resolveComplement9(num: number) {
      return needComplement9 ? BCD.COMPLEMENT9S[num] : num;
    }

    function addToResult(value: number, shift = j * BCD.BCD_SIZE) {
      res[res.length - 1] |= value << shift;
      j++;
    }

    function isNonZero(num: number, i: number) {
      const halfZero = num === BCD.COMPLEMENT9S[0],
        fullZero = num === (BCD.COMPLEMENT9S[0] | (BCD.COMPLEMENT9S[0] << 4));

      if (i === res.length - 1) {
        return num != 0 && !halfZero && !fullZero;
      }

      return !fullZero;
    }
  }

  subtract(a: bigint | BCD) {
    if (typeof a === "bigint") {
      a *= -1n;
    } else {
      a = a.changeSign(!a.isNegative);
    }

    return this.add(a);
  }

  multiply(a: bigint | BCD) {
    const aBCD = typeof a === "bigint" ? new BCD(a) : a,
      initial = this.abs();

    if (this.isEqual(0n) || aBCD.isEqual(0n)) {
      return aBCD;
    }

    if (aBCD.isEqual(1n)) {
      return this;
    }

    if (this.isEqual(1n)) {
      return aBCD;
    }

    let res = initial;

    for (let i = aBCD.abs(); !i.isEqual(1n); i = i.add(-1n)) {
      res = res.add(initial);
    }

    if (
      (this.isNegative && !aBCD.isNegative) ||
      (!this.isNegative && aBCD.isNegative)
    ) {
      res = res.changeSign(true);
    }

    return res;
  }

  divide(a: bigint | BCD) {
    const aBCD = typeof a === "bigint" ? new BCD(a) : a,
      initial = this.abs();

    if (aBCD.isEqual(0n)) {
      throw new RangeError("BCD division by zero");
    }

    let q = new BCD(0n);

    let r = initial,
      d = aBCD.abs();

    const needChangeSign =
      (this.isNegative && !aBCD.isNegative) ||
      (!this.isNegative && aBCD.isNegative);

    if (d.isEqual(r)) {
      return new BCD(1n).changeSign(needChangeSign);
    }

    if (d.isGreaterOrEqual(r)) {
      return q;
    }

    while (r.isGreaterOrEqual(d)) {
      r = r.subtract(d);
      q = q.add(1n);
    }

    return q.changeSign(needChangeSign);
  }

  isEqual(a: bigint | BCD) {
    const aBCD = typeof a === "bigint" ? new BCD(a) : a;

    if (
      (this.isNegative && !aBCD.isNegative) ||
      (!this.isNegative && aBCD.isNegative)
    ) {
      return false;
    }

    const aIter = aBCD.values({ fitTo: this.length });

    for (const num1 of this.values({ fitTo: aBCD.length })) {
      if (num1 !== aIter.next().value) {
        return false;
      }
    }

    return true;
  }

  isGreaterOrEqual(a: bigint | BCD) {
    const aBCD = typeof a === "bigint" ? new BCD(a) : a;

    if (this.isNegative && !aBCD.isNegative) {
      return false;
    }

    if (!this.isNegative && aBCD.isNegative) {
      return true;
    }

    const thisNums = Array.from(this.values({ fitTo: aBCD.length })).reverse(),
      aNums = Array.from(aBCD.values({ fitTo: this.length })).reverse();

    for (const [i, num1] of thisNums.entries()) {
      const subtract = new BCD(BigInt(num1)).subtract(BigInt(aNums[i]));

      if (subtract.isEqual(0n)) {
        continue;
      }

      return !subtract.isNegative;
    }

    return true;
  }

  abs() {
    return this.changeSign(false);
  }

  valueOf() {
    let res = 0n;

    for (const [i, num] of this.entries({ sign: true })) {
      res |= BigInt(num) << BigInt(i * BCD.BCD_SIZE);
    }

    return res;
  }

  toString() {
    let res = "";

    if (this.isNegative) {
      res += "-";
    }

    const values = Array.from(this.values())
      .map((num) => (this.isNegative ? BCD.COMPLEMENT9S[num] : num))
      .reverse();

    let skip = true,
      addZero = false;

    for (const num of values) {
      if (num === 0 && skip) {
        addZero = true;
        continue;
      }

      skip = false;
      addZero = false;
      res += String(num);
    }

    if (addZero) {
      res += "0";
    }

    return res;
  }

  changeSign(toNegative: boolean) {
    if ((this.isNegative && toNegative) || (!this.isNegative && !toNegative)) {
      return this;
    }

    const resBuffer = [0];

    let j = 0;

    for (const num of this.values()) {
      addToBuffer(BCD.COMPLEMENT9S[num]);

      if (j >= BCD.BCD_PER_NUMBER) {
        j = 0;
        resBuffer.push(0);
      }
    }

    addToBuffer(
      toNegative ? BCD.MINUS : BCD.PLUS,
      this.getShift(BCD.SIGN_INDEX),
    );
    addToBuffer(BCD.BCD_PER_NUMBER - j + 1, this.getShift(BCD.FREE_INDEX));

    return new BCD(resBuffer);

    function addToBuffer(value: number, shift = j * BCD.BCD_SIZE) {
      resBuffer[resBuffer.length - 1] |= value << shift;
      j++;
    }
  }

  protected getShift(i: number) {
    if (i > BCD.BCD_PER_NUMBER) {
      throw new RangeError(
        `The index cannot be greater than ${BCD.BCD_PER_NUMBER}`,
      );
    }

    return i * BCD.BCD_SIZE;
  }

  /** Этот метод сразу дополняет до 9 число если оно отрицательное, нормализует число в случае если было переполнение
   * (пришло число больше 9) и возвращает информацию было ли это переполнение, для того чтобы на след итерации прибавить
   * единичку (один в уме при сложении столбиком) */
  protected resolveDigit(digit: number, isNegative = false): [number, 0 | 1] {
    let overflow = 0;

    if (isNegative) {
      digit = BCD.COMPLEMENT9S[digit];
    }

    /** Если число больше 9 (не имеет представление в BCD) */
    if (BCD.BCD8421[digit] == null) {
      /** Добавляем 0b0110. Как пример, пришло число 11, которое 0b1011.
       * Мы прибавляем к нему 0b0110 => 0b10001. Это 17.
       * Далее мы отсекаем у него это старший, переполненный разряд 10001 & 01111 (наша маска) = 00001
       * и получаем число 1.
       *
       * И ставим флаг переполнения, чтобы потом знать было ли оно (если оно было, надо будет просто добавить единичку
       * в след разряд)
       *
       * 10001 (normalized) & 00000 (инверсия маски) => 10001
       * */
      const normalized = this.binaryAdd(digit, 6);
      digit = normalized & BCD.MASK;
      overflow = normalized & ~BCD.MASK;
    }

    return [digit, overflow !== 0 ? 1 : 0];
  }

  protected binaryAdd(x: number, y: number): number {
    /** В самом простом варианте без переносов (когда нет 1 + 1), операцию сложения можно представить
     * схемой исключающее ИЛИ (XOR)
     *
     * Как пример сложим 2 + 4s
     *  0010
     * ^0100
     *  0110
     *
     *  0110 === 6. Также комбинация 0010 & 0100 === 0000, что будет означать отсутствие переносов.
     *  В случае если операция & не равна 0, то переносы есть. Значит надо сдвигать их влево (1 в уме при сложении столбиком)
     *  и повторять операцию XOR, пока не будет переносов.
     * */
    while (y) {
      let carry = x & y; // перенос бита
      x = x ^ y; // сложение
      y = carry << 1;
    }

    return x;
  }
}

{
  equal(new BCD(11n).abs().toString(), "11");
  equal(new BCD(-11n).abs().toString(), "11");
}

{
  equal(new BCD(0n).add(-0n).toString(), "0");
  equal(new BCD(10n).add(0n).toString(), "10");
  equal(new BCD(1n).add(-10n).toString(), "-9");
  equal(new BCD(-99n).add(-789n).toString(), "-888");
  equal(new BCD(97n).add(-85n).toString(), "12");
  equal(new BCD(9999999n).add(9999999n).toString(), "19999998");
}

{
  equal(new BCD(10n).subtract(5n).toString(), "5");
  equal(new BCD(10n).subtract(17n).toString(), "-7");
  equal(new BCD(10n).subtract(-17n).toString(), "27");
  equal(new BCD(-10n).subtract(7n).toString(), "-17");
}

{
  equal(new BCD(10n).multiply(5n).toString(), "50");
  equal(new BCD(-7n).multiply(19n).toString(), "-133");
  equal(new BCD(-627n).multiply(-3017n).toString(), "1891659");
}

{
  equal(new BCD(10n).divide(2n).toString(), "5");
  equal(new BCD(11n).divide(2n).toString(), "5");
  equal(new BCD(12n).divide(2n).toString(), "6");
  equal(new BCD(12n).divide(-3n).toString(), "-4");
  equal(new BCD(-21n).divide(-3n).toString(), "7");
  equal(new BCD(1895n).divide(37n).toString(), "51");
}

{
  equal(new BCD(10n).isEqual(10n), true);
  equal(new BCD(10n).isEqual(-10n), false);
  equal(new BCD(0n).isEqual(-0n), true);

  equal(new BCD(0n).isGreaterOrEqual(-0n), true);
  equal(new BCD(10n).isGreaterOrEqual(-3n), true);
  equal(new BCD(10n).isGreaterOrEqual(7n), true);
  equal(new BCD(10n).isGreaterOrEqual(10n), true);
  equal(new BCD(10n).isGreaterOrEqual(11n), false);
  const bcd = new BCD(123456789n);

  deepEqual(bcd.buffer, [
    9 | (8 << 4) | (7 << 8) | (6 << 12) | (5 << 16) | (4 << 20) | (3 << 24),
    2 | (1 << 4) | (BCD.PLUS << 24) | (5 << 28),
  ]);

  equal(
    bcd.valueOf(),

    BigInt(9) |
      (BigInt(8) << BigInt(4)) |
      (BigInt(7) << BigInt(8)) |
      (BigInt(6) << BigInt(12)) |
      (BigInt(5) << BigInt(16)) |
      (BigInt(4) << BigInt(20)) |
      (BigInt(3) << BigInt(24)) |
      (BigInt(2) << BigInt(28)) |
      (BigInt(1) << BigInt(32)) |
      (BigInt(BCD.PLUS) << BigInt(36)),
  );

  equal(bcd.length, 9);
  equal(bcd.freeSlots, 5);
  equal(bcd.isNegative, false);

  equal(bcd.get(0), 9);
  equal(bcd.get(3), 6);
  equal(bcd.get(7), 2);
  equal(bcd.get(8), 1);

  equal(bcd.get(-1), 1);
  equal(bcd.get(-2), 2);
  equal(bcd.get(-3), 3);
  equal(bcd.get(-8), 8);
  equal(bcd.get(-9), 9);

  deepEqual(Array.from(bcd.values()), [9, 8, 7, 6, 5, 4, 3, 2, 1]);
  deepEqual(Array.from(bcd.values({ sign: true })), [
    9,
    8,
    7,
    6,
    5,
    4,
    3,
    2,
    1,
    BCD.PLUS,
  ]);
  deepEqual(
    Array.from(bcd.values({ fitTo: 10 })),
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
  );
}

{
  const bcd = new BCD(-123456789n);

  deepEqual(bcd.buffer, [
    0 | (1 << 4) | (2 << 8) | (3 << 12) | (4 << 16) | (5 << 20) | (6 << 24),
    7 | (8 << 4) | (BCD.MINUS << 24) | (5 << 28),
  ]);

  equal(bcd.length, 9);
  equal(bcd.freeSlots, 5);
  equal(bcd.isNegative, true);

  deepEqual(Array.from(bcd.values()), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  deepEqual(Array.from(bcd.values({ sign: true })), [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    BCD.MINUS,
  ]);
  deepEqual(
    Array.from(bcd.values({ fitTo: 10 })),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
}
