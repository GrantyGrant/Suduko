// Sudoku: fill every row, column and 3x3 box with the numbers 1 to 9.
//
// The board is stored as a list of 81 numbers, read left to right,
// top to bottom. 0 means "empty".
//   index = row * 9 + col

// How many squares to empty out. More holes = harder puzzle.
const HOLES = 40;

let solution = [];   // the finished board
let puzzle = [];     // what the player sees (0 = empty)
let selected = null; // index of the chosen square, or null
let given = [];      // true for squares filled in at the start (can't change)

const boardEl = document.getElementById("board");
const numbersEl = document.getElementById("numbers");
const messageEl = document.getElementById("message");

// ---------- Rules ----------

// Can we put `num` at square `index` without breaking the rules?
function canPlace(board, index, num) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = row - (row % 3);
  const boxCol = col - (col % 3);

  for (let i = 0; i < 9; i++) {
    if (board[row * 9 + i] === num) return false; // same row
    if (board[i * 9 + col] === num) return false; // same column
    const r = boxRow + Math.floor(i / 3);
    const c = boxCol + (i % 3);
    if (board[r * 9 + c] === num) return false;   // same box
  }
  return true;
}

// ---------- Making a puzzle ----------

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Fill the board by trying numbers in random order. If we get stuck,
// go back a step and try something else ("backtracking").
function fillBoard(board) {
  const empty = board.indexOf(0);
  if (empty === -1) return true; // no empty squares left: done!

  for (const num of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (canPlace(board, empty, num)) {
      board[empty] = num;
      if (fillBoard(board)) return true;
      board[empty] = 0; // that didn't work, undo it
    }
  }
  return false;
}

function newGame() {
  solution = new Array(81).fill(0);
  fillBoard(solution);

  puzzle = solution.slice();
  const order = shuffle([...Array(81).keys()]);
  for (let i = 0; i < HOLES; i++) puzzle[order[i]] = 0;

  given = puzzle.map((n) => n !== 0);
  selected = null;
  messageEl.textContent = "";
  draw();
}

// ---------- Playing ----------

function enterNumber(num) {
  if (selected === null || given[selected]) return;
  puzzle[selected] = num;
  draw();
  checkWin();
}

function checkWin() {
  const won = puzzle.every((n, i) => n === solution[i]);
  messageEl.textContent = won ? "You solved it! 🎉" : "";
}

// ---------- Drawing ----------

function buildBoard() {
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement("div");
    const row = Math.floor(i / 9);
    const col = i % 9;
    cell.className = "cell";
    if (col === 2 || col === 5) cell.classList.add("box-right");
    if (row === 2 || row === 5) cell.classList.add("box-bottom");
    if (col === 8) cell.classList.add("last-col");
    if (row === 8) cell.classList.add("last-row");
    cell.addEventListener("click", () => {
      selected = i;
      draw();
    });
    boardEl.appendChild(cell);
  }

  for (const label of [1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫"]) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.addEventListener("click", () => enterNumber(label === "⌫" ? 0 : label));
    numbersEl.appendChild(btn);
  }
}

function draw() {
  const cells = boardEl.children;
  const selRow = selected === null ? -1 : Math.floor(selected / 9);
  const selCol = selected === null ? -1 : selected % 9;
  const selNum = selected === null ? 0 : puzzle[selected];

  for (let i = 0; i < 81; i++) {
    const cell = cells[i];
    const num = puzzle[i];
    const row = Math.floor(i / 9);
    const col = i % 9;

    cell.textContent = num === 0 ? "" : num;
    cell.classList.toggle("given", given[i]);
    cell.classList.toggle("typed", !given[i] && num !== 0);
    cell.classList.toggle("selected", i === selected);
    cell.classList.toggle("same-row-col", row === selRow || col === selCol);
    cell.classList.toggle("same-number", num !== 0 && num === selNum);
    cell.classList.toggle("mistake", !given[i] && num !== 0 && num !== solution[i]);
  }
}

// ---------- Keyboard ----------

document.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "9") enterNumber(Number(e.key));
  if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") enterNumber(0);

  // Arrow keys move the yellow square around
  const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
  if (e.key in moves) {
    e.preventDefault();
    const next = (selected ?? 0) + moves[e.key];
    if (next >= 0 && next < 81) {
      selected = next;
      draw();
    }
  }
});

document.getElementById("new-game").addEventListener("click", newGame);

buildBoard();
newGame();
