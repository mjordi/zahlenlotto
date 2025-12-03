export const TOTAL_NUMBERS = 90;

export const COLUMN_LABELS = ['1-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-90'];

export type LottoCard = (number | null)[][];

/**
 * Generates a random integer between min and max (inclusive).
 */
export function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a set of unique random numbers.
 */
export function generateUniqueNumbers(count: number, min: number, max: number): number[] {
  const numbers = new Set<number>();
  while (numbers.size < count) {
    numbers.add(getRandomNumber(min, max));
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

/**
 * Generates a standard Lotto card configuration based on the provided Python logic.
 * - 3 rows x 9 columns
 * - 5 numbers per row (4 empty fields)
 * - Numbers 1-90 sorted by columns
 */
export function generateLottoCard(): LottoCard {
  // Initialize 3x9 grid with null
  const card: LottoCard = Array(3).fill(null).map(() => Array(9).fill(null));

  // Define column ranges
  // Col 0: 1-9, Col 1: 10-19, ... Col 8: 80-90
  const columnRanges: number[][] = [
    Array.from({ length: 9 }, (_, i) => i + 1),      // 1-9
    Array.from({ length: 10 }, (_, i) => i + 10),    // 10-19
    Array.from({ length: 10 }, (_, i) => i + 20),    // 20-29
    Array.from({ length: 10 }, (_, i) => i + 30),    // 30-39
    Array.from({ length: 10 }, (_, i) => i + 40),    // 40-49
    Array.from({ length: 10 }, (_, i) => i + 50),    // 50-59
    Array.from({ length: 10 }, (_, i) => i + 60),    // 60-69
    Array.from({ length: 10 }, (_, i) => i + 70),    // 70-79
    Array.from({ length: 11 }, (_, i) => i + 80),    // 80-90
  ];

  // Helper to shuffle array
  const shuffle = <T>(array: T[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // 1. Select 5 columns for each row
  // We need to ensure we don't violate column constraints (max 3 numbers per column across 3 rows)
  // The Python script uses a simple approach: for each row, pick 5 random columns.
  // It checks availability.

  // Let's try to follow the Python script's logic exactly, but it might need a retry mechanism if it gets stuck?
  // The Python script logic:
  // For row in 0..2:
  //   sample 5 cols from 0..8
  //   for col in sampled_cols:
  //     pick available number

  // There is a case where a column is picked 3 times, or no numbers left?
  // The ranges are large enough (min 9 numbers), so running out of numbers is unlikely for 3 rows.
  // The main constraint is we need valid numbers.

  for (let row = 0; row < 3; row++) {
    const columnsIndices = Array.from({ length: 9 }, (_, i) => i);
    const selectedColumns = shuffle(columnsIndices).slice(0, 5);

    for (const col of selectedColumns) {
      // Find available numbers for this column that are not already in the card
      const usedInCol = [card[0][col], card[1][col], card[2][col]].filter(n => n !== null) as number[];
      const available = columnRanges[col].filter(n => !usedInCol.includes(n));

      if (available.length > 0) {
        const num = available[Math.floor(Math.random() * available.length)];
        card[row][col] = num;
      } else {
        // Should not happen with standard ranges and only 3 rows
        console.warn(`No numbers available for col ${col} row ${row}`);
      }
    }
  }

  // 2. Sort columns
  for (let col = 0; col < 9; col++) {
    // Get values and their row indices
    const colValues: { row: number, val: number }[] = [];
    for (let row = 0; row < 3; row++) {
      const val = card[row][col];
      if (val !== null) {
        colValues.push({ row, val });
      }
    }

    // Sort by value
    colValues.sort((a, b) => a.val - b.val);

    // Get the row indices that had values, sorted
    const rowsWithValues = colValues.map(cv => cv.row).sort((a, b) => a - b);

    // Clear column
    for (let row = 0; row < 3; row++) {
      card[row][col] = null;
    }

    // Fill back sorted
    for (let i = 0; i < colValues.length; i++) {
      const targetRow = rowsWithValues[i];
      card[targetRow][col] = colValues[i].val;
    }
  }

  return card;
}

/**
 * Checks if a specific row in a card has all its numbers drawn.
 * A row is complete when all 5 numbers in the row are in the drawnNumbers array.
 */
export function isRowComplete(row: (number | null)[], drawnNumbers: number[]): boolean {
  const rowNumbers = row.filter((num): num is number => num !== null);
  return rowNumbers.length === 5 && rowNumbers.every(num => drawnNumbers.includes(num));
}

/**
 * Returns indices of all completed rows in a card.
 * Returns an array of row indices (0, 1, 2) that are complete.
 */
export function getCompletedRows(card: LottoCard, drawnNumbers: number[]): number[] {
  const completedRows: number[] = [];
  for (let i = 0; i < card.length; i++) {
    if (isRowComplete(card[i], drawnNumbers)) {
      completedRows.push(i);
    }
  }
  return completedRows;
}

/**
 * Checks if any card has a newly completed row.
 * Returns true if the last drawn number completed a row that wasn't complete before.
 */
export function hasNewlyCompletedRow(
  card: LottoCard,
  previousDrawnNumbers: number[],
  currentDrawnNumbers: number[]
): boolean {
  const previousCompletedRows = getCompletedRows(card, previousDrawnNumbers);
  const currentCompletedRows = getCompletedRows(card, currentDrawnNumbers);
  return currentCompletedRows.length > previousCompletedRows.length;
}
