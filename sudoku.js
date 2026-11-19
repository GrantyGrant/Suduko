// Sudoku: fill every row, column and 3x3 box with the numbers 1 to 9.
//
// The board is stored as a list of 81 numbers, read left to right,
// top to bottom. 0 means "empty".
//   index = row * 9 + col

// How many squares to empty out for each level. More holes = harder.
const LEVELS = {
  easy: 32,
  medium: 42,
  hard: 52,
};

let level = "medium";
let solution = [];   // the finished board
let puzzle = [];     // what the player sees (0 = empty)
let given = [];      // true for squares filled in at the start (can't change)
let notes = [];      // pencil marks: a Set of small numbers for each square
let selected = null; // index of the chosen square, or null
let notesMode = false;
let mistakes = 0;
let startTime = 0;
let timerId = null;
let finished = false;

const boardEl = document.getElementById("board");
const numbersEl = document.getElementById("numbers");
const messageEl = document.getElementById("message");
const timerEl = document.getElementById("timer");
const mistakesEl = document.getElementById("mistakes");
const notesBtn = document.getElementById("notes");

// ---------- Rules ----------

// The 20 other squares that share a row, column or box with `index`.
function neighbours(index) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = row - (row % 3);
  const boxCol = col - (col % 3);
  const result = new Set();
  for (let i = 0; i < 9; i++) {
    result.add(row * 9 + i);                                          // same row
    result.add(i * 9 + col);                                          // same column
    result.add((boxRow + Math.floor(i / 3)) * 9 + boxCol + (i % 3));  // same box
  }
  result.delete(index);
  return result;
}

// Can we put `num` at square `index` without breaking the rules?
function canPlace(board, index, num) {
  for (const other of neighbours(index)) {
    if (board[other] === num) return false;
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

// Count how many ways the board can be finished, but stop at 2.
// A fair puzzle has exactly 1 answer.
//
// To be quick, it works on the empty square with the FEWEST possible
// numbers first, just like a person would.
function countSolutions(board) {
  let best = -1;
  let bestOptions = null;
  for (let i = 0; i < 81; i++) {
    if (board[i] !== 0) continue;
    const options = [];
    for (let num = 1; num <= 9; num++) {
      if (canPlace(board, i, num)) options.push(num);
    }
    if (options.length === 0) return 0; // dead end: no answer this way
    if (bestOptions === null || options.length < bestOptions.length) {
      best = i;
      bestOptions = options;
    }
  }
  if (best === -1) return 1; // no empty squares: found an answer

  let count = 0;
  for (const num of bestOptions) {
    board[best] = num;
    count += countSolutions(board);
    board[best] = 0;
    if (count >= 2) break;
  }
  return count;
}

// Take numbers away one at a time. If taking one away would let the
// puzzle have two different answers, put it back and try another.
function makePuzzle(full, holes) {
  const board = full.slice();
  let removed = 0;
  for (const index of shuffle([...Array(81).keys()])) {
    if (removed === holes) break;
    const keep = board[index];
    board[index] = 0;
    if (countSolutions(board.slice()) === 1) {
      removed++;
    } else {
      board[index] = keep;
    }
  }
  return board;
}

function newGame() {
  solution = new Array(81).fill(0);
  fillBoard(solution);
  puzzle = makePuzzle(solution, LEVELS[level]);

  given = puzzle.map((n) => n !== 0);
  notes = puzzle.map(() => new Set());
  selected = null;
  mistakes = 0;
  finished = false;
  messageEl.textContent = "";
  startTimer();
  draw();
}

// ---------- Timer ----------

function startTimer() {
  clearInterval(timerId);
  startTime = Date.now();
  showTime();
  timerId = setInterval(showTime, 1000);
}

function showTime() {
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  timerEl.textContent = `${mins}:${secs}`;
}

// ---------- Playing ----------

function enterNumber(num) {
  if (finished || selected === null || given[selected]) return;

  if (notesMode && num !== 0) {
    // Pencil marks only go in empty squares
    if (puzzle[selected] !== 0) return;
    const marks = notes[selected];
    if (marks.has(num)) marks.delete(num);
    else marks.add(num);
  } else if (num === 0) {
    // Clear the number, or the notes if there is no number
    if (puzzle[selected] !== 0) puzzle[selected] = 0;
    else notes[selected].clear();
  } else {
    if (puzzle[selected] === num) return; // already there, nothing to do
    puzzle[selected] = num;
    notes[selected].clear();

    if (num !== solution[selected]) {
      mistakes++;
    } else {
      // A right answer rubs out that pencil mark from its row, column and box
      for (const other of neighbours(selected)) notes[other].delete(num);
    }
  }

  draw();
  checkWin();
}

function checkWin() {
  if (!puzzle.every((n, i) => n === solution[i])) return;
  finished = true;
  clearInterval(timerId);
  const extra = mistakes === 0 ? " with no mistakes!" : "";
  messageEl.textContent = `You solved it in ${timerEl.textContent}${extra} 🎉`;
}

function toggleNotes() {
  notesMode = !notesMode;
  draw();
}

function setLevel(newLevel) {
  level = newLevel;
  newGame();
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

// Draw the little pencil-mark grid for one square
function drawNotes(cell, marks) {
  const grid = document.createElement("div");
  grid.className = "notes";
  for (let n = 1; n <= 9; n++) {
    const span = document.createElement("span");
    span.textContent = marks.has(n) ? n : "";
    grid.appendChild(span);
  }
  cell.appendChild(grid);
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
    if (num === 0 && notes[i].size > 0) drawNotes(cell, notes[i]);

    cell.classList.toggle("given", given[i]);
    cell.classList.toggle("typed", !given[i] && num !== 0);
    cell.classList.toggle("selected", i === selected);
    cell.classList.toggle("same-row-col", row === selRow || col === selCol);
    cell.classList.toggle("same-number", num !== 0 && num === selNum);
    cell.classList.toggle("mistake", !given[i] && num !== 0 && num !== solution[i]);
  }

  mistakesEl.textContent = mistakes;
  notesBtn.textContent = notesMode ? "✏️ Notes: on" : "✏️ Notes: off";
  notesBtn.classList.toggle("on", notesMode);
  for (const btn of document.querySelectorAll("#difficulty button")) {
    btn.classList.toggle("on", btn.dataset.level === level);
  }
}

// ---------- Keyboard ----------

document.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "9") enterNumber(Number(e.key));
  if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") enterNumber(0);
  if (e.key === "n" || e.key === "N") toggleNotes();

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

// ---------- Buttons ----------

document.getElementById("new-game").addEventListener("click", newGame);
notesBtn.addEventListener("click", toggleNotes);
for (const btn of document.querySelectorAll("#difficulty button")) {
  btn.addEventListener("click", () => setLevel(btn.dataset.level));
}

buildBoard();
newGame();
