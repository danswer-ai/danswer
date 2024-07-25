interface GridShape {
  encodedGrid: number;
  filledSquares: number;
}

export function generateRandomShape(): GridShape {
  const grid: boolean[][] = Array(4)
    .fill(null)
    .map(() => Array(4).fill(false));

  // Fill the center four squares (at least 3)
  const centerSquares = [
    [1, 1],
    [1, 2],
    [2, 1],
    [2, 2],
  ];
  shuffleArray(centerSquares);
  const centerFillCount = Math.floor(Math.random() * 2) + 3; // 3 or 4
  for (let i = 0; i < centerFillCount; i++) {
    const [row, col] = centerSquares[i];
    grid[row][col] = true;
  }

  // Randomly fill remaining squares up to 10 total
  const remainingSquares = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (!grid[row][col]) {
        remainingSquares.push([row, col]);
      }
    }
  }
  shuffleArray(remainingSquares);

  let filledSquares = centerFillCount;
  for (const [row, col] of remainingSquares) {
    if (filledSquares >= 10) break;
    grid[row][col] = true;
    filledSquares++;
  }

  let path = "";
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid[row][col]) {
        const x = col * 12;
        const y = row * 12;
        path += `M ${x} ${y} L ${x + 12} ${y} L ${x + 12} ${y + 12} L ${x} ${y + 12} Z `;
      }
    }
  }
  const encodedGrid = encodeGrid(grid);
  return { encodedGrid, filledSquares };
}

function encodeGrid(grid: boolean[][]): number {
  let encoded = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid[row][col]) {
        encoded |= 1 << (row * 4 + col);
      }
    }
  }
  return encoded;
}

function decodeGrid(encoded: number): boolean[][] {
  const grid: boolean[][] = Array(4)
    .fill(null)
    .map(() => Array(4).fill(false));
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (encoded & (1 << (row * 4 + col))) {
        grid[row][col] = true;
      }
    }
  }
  return grid;
}

export function createSVG(shape: GridShape, color: string = "#FF6FBF") {
  const grid = decodeGrid(shape.encodedGrid);
  let path = "";
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid[row][col]) {
        const x = col * 12;
        const y = row * 12;
        path += `M ${x} ${y} L ${x + 12} ${y} L ${x + 12} ${y + 12} L ${x} ${y + 12} Z `;
      }
    }
  }

  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <path d={path} fill={color}></path>
    </svg>
  );
}
function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
