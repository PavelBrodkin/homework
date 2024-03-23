function binary(num: number) {
  const str = new Uint32Array([num])[0].toString(2);
  return "0b" + str.padStart(32, "0").replace(/(.{4})(?!$)/g, "$1_");
}

class BCD {
  private bcd: number = 0;

  constructor(num: number) {
    this.bcd = this.getBCDRepresentation(num);
  }

  private getBCDRepresentation(num: number): number {
    let res = 0;

    const str = num.toString();

    for (const el of str) {
      res = (res << 4) | Number(el);
    }

    return res;
  }

  private addBinary(a: number, b: number) {
    let sumWithoutTransfer = a ^ b;
    let transferBits = a & b;

    if (transferBits === 0) {
      return sumWithoutTransfer;
    }

    while (transferBits !== 0) {
      const pervSum = sumWithoutTransfer;

      transferBits = transferBits << 1;
      sumWithoutTransfer = sumWithoutTransfer ^ transferBits;
      transferBits = pervSum & transferBits;
    }

    return sumWithoutTransfer;
  }

  add(num: number) {
    const bcdNum = this.getBCDRepresentation(num);

    let res = 0;
    let needTransfer = false;

    // Записываем всегда в младшие разряды
    function addToRes(i, sum) {
      if (i === 0) {
        res = res | sum;
      } else {
        const offsetSum = sum << (i * 4);
        res = res | offsetSum;
      }
    }

    // максимальное число в 7 группах
    for (let i = 0; i < 7; i++) {
      const offset = i * 4;
      // 15 это (0000) 1111
      const mask = 15 << offset;

      // получаем каждое число отдельно
      const left = (this.bcd & mask) >> offset;
      const right = (bcdNum & mask) >> offset;

      let sum = this.addBinary(left, right);

      if (needTransfer) {
        sum = this.addBinary(sum, 1);
        needTransfer = false;
      }

      if (sum > 9) {
        sum = this.addBinary(sum, 6);
        needTransfer = true;
        // записываем бит без переноса, так как сначала надо сложить в след итерации
        addToRes(i, sum & 15);
      } else {
        addToRes(i, sum);
      }
    }

    this.bcd = res;
    return res;
  }

  valueOf(): number {
    return this.bcd;
  }

  get(position: number) {
    const length = this.bcd.toString().length;
    const offset = position >= 0 ? position : length - Math.abs(position);

    // 15 это (0000) 1111
    const mask = 15 << (offset * 4);
    return (mask & this.bcd) >> (offset * 4);
  }
}

const n = new BCD(889);
