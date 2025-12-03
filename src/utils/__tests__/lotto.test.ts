import {
  generateLottoCard,
  generateUniqueNumbers,
  getRandomNumber,
  TOTAL_NUMBERS,
  isRowComplete,
  getCompletedRows,
  hasNewlyCompletedRow,
  getNewlyCompletedRows
} from '../lotto';

describe('lotto utilities', () => {
  describe('getRandomNumber', () => {
    it('should generate a number within the specified range', () => {
      const min = 1;
      const max = 10;
      const result = getRandomNumber(min, max);

      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);
    });

    it('should work with min and max being the same', () => {
      const result = getRandomNumber(5, 5);
      expect(result).toBe(5);
    });
  });

  describe('generateUniqueNumbers', () => {
    it('should generate the correct count of unique numbers', () => {
      const numbers = generateUniqueNumbers(5, 1, 10);

      expect(numbers).toHaveLength(5);
      expect(new Set(numbers).size).toBe(5);
    });

    it('should generate numbers within the specified range', () => {
      const min = 10;
      const max = 20;
      const numbers = generateUniqueNumbers(5, min, max);

      numbers.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(min);
        expect(num).toBeLessThanOrEqual(max);
      });
    });

    it('should return sorted numbers', () => {
      const numbers = generateUniqueNumbers(10, 1, 100);
      const sorted = [...numbers].sort((a, b) => a - b);

      expect(numbers).toEqual(sorted);
    });
  });

  describe('generateLottoCard', () => {
    it('should generate a 3x9 grid', () => {
      const card = generateLottoCard();

      expect(card).toHaveLength(3);
      card.forEach(row => {
        expect(row).toHaveLength(9);
      });
    });

    it('should have exactly 5 numbers per row', () => {
      const card = generateLottoCard();

      card.forEach(row => {
        const numbersInRow = row.filter(cell => cell !== null);
        expect(numbersInRow).toHaveLength(5);
      });
    });

    it('should have exactly 15 total numbers', () => {
      const card = generateLottoCard();

      const allNumbers = card.flat().filter(cell => cell !== null);
      expect(allNumbers).toHaveLength(15);
    });

    it('should have all unique numbers', () => {
      const card = generateLottoCard();

      const allNumbers = card.flat().filter(cell => cell !== null) as number[];
      const uniqueNumbers = new Set(allNumbers);

      expect(uniqueNumbers.size).toBe(allNumbers.length);
    });

    it('should have numbers between 1 and 90', () => {
      const card = generateLottoCard();

      const allNumbers = card.flat().filter(cell => cell !== null) as number[];

      allNumbers.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(TOTAL_NUMBERS);
      });
    });

    it('should have numbers in correct column ranges', () => {
      const card = generateLottoCard();

      const columnRanges = [
        [1, 9],    // Col 0
        [10, 19],  // Col 1
        [20, 29],  // Col 2
        [30, 39],  // Col 3
        [40, 49],  // Col 4
        [50, 59],  // Col 5
        [60, 69],  // Col 6
        [70, 79],  // Col 7
        [80, 90],  // Col 8
      ];

      for (let col = 0; col < 9; col++) {
        const [min, max] = columnRanges[col];

        for (let row = 0; row < 3; row++) {
          const num = card[row][col];
          if (num !== null) {
            expect(num).toBeGreaterThanOrEqual(min);
            expect(num).toBeLessThanOrEqual(max);
          }
        }
      }
    });

    it('should have sorted numbers within each column', () => {
      const card = generateLottoCard();

      for (let col = 0; col < 9; col++) {
        const colNumbers = card.map(row => row[col]).filter(n => n !== null) as number[];
        const sorted = [...colNumbers].sort((a, b) => a - b);

        expect(colNumbers).toEqual(sorted);
      }
    });

    it('should not have more than 3 numbers in any column', () => {
      const card = generateLottoCard();

      for (let col = 0; col < 9; col++) {
        const colNumbers = card.map(row => row[col]).filter(n => n !== null);
        expect(colNumbers.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('isRowComplete', () => {
    it('should return true when all 5 numbers in a row are drawn', () => {
      const row = [1, null, 23, null, 45, null, 67, null, 89];
      const drawnNumbers = [1, 23, 45, 67, 89];

      expect(isRowComplete(row, drawnNumbers)).toBe(true);
    });

    it('should return false when not all numbers in a row are drawn', () => {
      const row = [1, null, 23, null, 45, null, 67, null, 89];
      const drawnNumbers = [1, 23, 45, 67]; // Missing 89

      expect(isRowComplete(row, drawnNumbers)).toBe(false);
    });

    it('should return false when no numbers in a row are drawn', () => {
      const row = [1, null, 23, null, 45, null, 67, null, 89];
      const drawnNumbers = [2, 24, 46, 68, 90];

      expect(isRowComplete(row, drawnNumbers)).toBe(false);
    });

    it('should return false for an empty row', () => {
      const row = [null, null, null, null, null, null, null, null, null];
      const drawnNumbers = [1, 2, 3, 4, 5];

      expect(isRowComplete(row, drawnNumbers)).toBe(false);
    });

    it('should handle rows with numbers in different positions', () => {
      const row = [null, 12, null, 34, null, 56, null, 78, null];
      const drawnNumbers = [12, 34, 56, 78, 90];

      expect(isRowComplete(row, drawnNumbers)).toBe(false); // Only 4 numbers in row
    });
  });

  describe('getCompletedRows', () => {
    it('should return empty array when no rows are complete', () => {
      const card = [
        [1, null, 23, null, 45, null, 67, null, 89],
        [null, 12, null, 34, null, 56, null, 78, null],
        [5, null, 28, null, 48, null, 71, null, 90],
      ];
      const drawnNumbers = [1, 12, 23];

      expect(getCompletedRows(card, drawnNumbers)).toEqual([]);
    });

    it('should return indices of completed rows', () => {
      const card = [
        [1, null, 23, null, 45, null, 67, null, 89],
        [null, 12, null, 34, null, 56, null, 78, null],
        [5, null, 28, null, 48, null, 71, null, 90],
      ];
      const drawnNumbers = [1, 23, 45, 67, 89]; // First row complete

      expect(getCompletedRows(card, drawnNumbers)).toEqual([0]);
    });

    it('should return multiple row indices when multiple rows are complete', () => {
      const card = [
        [1, null, 23, null, 45, null, 67, null, 89],
        [null, 12, null, 34, null, 56, 68, 78, null],
        [5, null, 28, null, 48, null, 71, null, 90],
      ];
      const drawnNumbers = [1, 23, 45, 67, 89, 12, 34, 56, 68, 78, 5, 28, 48, 71, 90];

      const completedRows = getCompletedRows(card, drawnNumbers);
      expect(completedRows).toHaveLength(3);
      expect(completedRows).toContain(0);
      expect(completedRows).toContain(1);
      expect(completedRows).toContain(2);
    });

    it('should handle cards with no complete rows', () => {
      const card = generateLottoCard();
      const drawnNumbers: number[] = [];

      expect(getCompletedRows(card, drawnNumbers)).toEqual([]);
    });
  });

  describe('hasNewlyCompletedRow', () => {
    const card = [
      [1, null, 23, null, 45, null, 67, null, 89],
      [null, 12, null, 34, null, 56, 68, 78, null],
      [5, null, 28, null, 48, null, 71, null, 90],
    ];

    it('should return true when a new row is completed', () => {
      const previousDrawn = [1, 23, 45, 67];
      const currentDrawn = [1, 23, 45, 67, 89]; // Row 0 just completed

      expect(hasNewlyCompletedRow(card, previousDrawn, currentDrawn)).toBe(true);
    });

    it('should return false when no new row is completed', () => {
      const previousDrawn = [1, 23, 45];
      const currentDrawn = [1, 23, 45, 67]; // Still not complete

      expect(hasNewlyCompletedRow(card, previousDrawn, currentDrawn)).toBe(false);
    });

    it('should return false when row was already complete', () => {
      const previousDrawn = [1, 23, 45, 67, 89]; // Already complete
      const currentDrawn = [1, 23, 45, 67, 89, 12]; // Still complete, but no new completion

      expect(hasNewlyCompletedRow(card, previousDrawn, currentDrawn)).toBe(false);
    });

    it('should return true when second row is completed after first', () => {
      const previousDrawn = [1, 23, 45, 67, 89]; // Row 0 complete
      const currentDrawn = [1, 23, 45, 67, 89, 12, 34, 56, 68, 78]; // Row 1 now complete

      expect(hasNewlyCompletedRow(card, previousDrawn, currentDrawn)).toBe(true);
    });

    it('should return false when no numbers are drawn', () => {
      const previousDrawn: number[] = [];
      const currentDrawn: number[] = [];

      expect(hasNewlyCompletedRow(card, previousDrawn, currentDrawn)).toBe(false);
    });
  });

  describe('getNewlyCompletedRows', () => {
    const card = [
      [1, null, 23, null, 45, null, 67, null, 89],
      [null, 12, null, 34, null, 56, 68, 78, null],
      [5, null, 28, null, 48, null, 71, null, 90],
    ];

    it('should return newly completed row indices', () => {
      const previousDrawn = [1, 23, 45, 67];
      const currentDrawn = [1, 23, 45, 67, 89]; // Row 0 just completed

      expect(getNewlyCompletedRows(card, previousDrawn, currentDrawn)).toEqual([0]);
    });

    it('should return empty array when no new rows are completed', () => {
      const previousDrawn = [1, 23, 45];
      const currentDrawn = [1, 23, 45, 67]; // Still not complete

      expect(getNewlyCompletedRows(card, previousDrawn, currentDrawn)).toEqual([]);
    });

    it('should return empty array when row was already complete', () => {
      const previousDrawn = [1, 23, 45, 67, 89]; // Row 0 already complete
      const currentDrawn = [1, 23, 45, 67, 89, 12]; // Still complete, but no new completion

      expect(getNewlyCompletedRows(card, previousDrawn, currentDrawn)).toEqual([]);
    });

    it('should return only the newly completed row when second row is completed', () => {
      const previousDrawn = [1, 23, 45, 67, 89]; // Row 0 complete
      const currentDrawn = [1, 23, 45, 67, 89, 12, 34, 56, 68, 78]; // Row 1 now complete

      expect(getNewlyCompletedRows(card, previousDrawn, currentDrawn)).toEqual([1]);
    });

    it('should return multiple rows when multiple rows complete simultaneously', () => {
      const previousDrawn = [1, 23, 45, 67];
      const currentDrawn = [1, 23, 45, 67, 89, 12, 34, 56, 68, 78]; // Rows 0 and 1 complete

      const result = getNewlyCompletedRows(card, previousDrawn, currentDrawn);
      expect(result).toHaveLength(2);
      expect(result).toContain(0);
      expect(result).toContain(1);
    });

    it('should return empty array when no numbers are drawn', () => {
      const previousDrawn: number[] = [];
      const currentDrawn: number[] = [];

      expect(getNewlyCompletedRows(card, previousDrawn, currentDrawn)).toEqual([]);
    });

    it('should return all three rows when all complete from empty state', () => {
      const previousDrawn: number[] = [];
      const currentDrawn = [1, 23, 45, 67, 89, 12, 34, 56, 68, 78, 5, 28, 48, 71, 90]; // All rows complete

      const result = getNewlyCompletedRows(card, previousDrawn, currentDrawn);
      expect(result).toHaveLength(3);
      expect(result).toContain(0);
      expect(result).toContain(1);
      expect(result).toContain(2);
    });
  });
});
