import { render, screen } from '@testing-library/react';
import LottoCard from '../LottoCard';
import { LanguageProvider } from '@/contexts/LanguageContext';

const mockCard = [
  [1, null, 23, null, 45, null, 67, null, 89],
  [null, 12, null, 34, null, 56, null, 78, null],
  [5, null, 28, null, 48, null, 71, null, 90],
];

describe('LottoCard', () => {
  const renderWithProvider = (ui: React.ReactElement) => {
    return render(
      <LanguageProvider>
        {ui}
      </LanguageProvider>
    );
  };

  it('should render the card number', () => {
    renderWithProvider(<LottoCard cardNumber={1} grid={mockCard} />);

    expect(screen.getByText(/Karte 1/i)).toBeInTheDocument();
  });

  it('should render a 3x9 grid', () => {
    const { container } = renderWithProvider(<LottoCard cardNumber={1} grid={mockCard} />);

    const rows = container.querySelectorAll('.grid.grid-cols-9');
    expect(rows).toHaveLength(3);

    rows.forEach(row => {
      expect(row.children).toHaveLength(9);
    });
  });

  it('should display numbers in correct positions', () => {
    renderWithProvider(<LottoCard cardNumber={1} grid={mockCard} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('67')).toBeInTheDocument();
    expect(screen.getByText('89')).toBeInTheDocument();
  });

  it('should apply compact styles when compact prop is true', () => {
    const { container } = renderWithProvider(
      <LottoCard cardNumber={1} grid={mockCard} compact />
    );

    const cardElement = container.querySelector('.text-\\[10px\\]');
    expect(cardElement).toBeInTheDocument();
  });

  it('should not apply compact styles when compact prop is false', () => {
    const { container } = renderWithProvider(
      <LottoCard cardNumber={1} grid={mockCard} compact={false} />
    );

    const cardElement = container.querySelector('.text-\\[10px\\]');
    expect(cardElement).not.toBeInTheDocument();
  });

  it('should render empty cells correctly', () => {
    const { container } = renderWithProvider(<LottoCard cardNumber={1} grid={mockCard} />);

    const cells = container.querySelectorAll('.grid.grid-cols-9 > div');
    let emptyCellCount = 0;

    cells.forEach(cell => {
      if (cell.textContent === '') {
        emptyCellCount++;
      }
    });

    expect(emptyCellCount).toBe(13); // 27 total cells - 14 numbers = 13 empty (one cell has "Karte 1")
  });
});
