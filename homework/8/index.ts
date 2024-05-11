class Matrix {
  rows: number;
  cols: number;
  buffer: number[];

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
    this.buffer = new Array(rows * cols);
  }

  get(row, col) {
    return this.buffer[this.#getIndex(row, col)];
  }

  set(row, col, value) {
    this.buffer[this.#getIndex(row, col)] = value;
  }

  #getIndex(row, col) {
    return row * this.cols + col;
  }
}
