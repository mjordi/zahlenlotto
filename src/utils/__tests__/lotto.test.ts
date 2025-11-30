import { generateLottoCard, generateUniqueNumbers, getRandomNumber, TOTAL_NUMBERS } from '../lotto';

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
});
