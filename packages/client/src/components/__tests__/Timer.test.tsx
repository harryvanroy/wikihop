import { render, screen } from '@testing-library/react';
import Timer from '../Timer';
import { useGameStore } from '../../stores/gameStore';

describe('Timer', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders 00:00 when elapsed is 0', () => {
    useGameStore.setState({ elapsed: 0 });
    render(<Timer />);
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('renders 01:30 when elapsed is 90', () => {
    useGameStore.setState({ elapsed: 90 });
    render(<Timer />);
    expect(screen.getByText('01:30')).toBeInTheDocument();
  });

  it('renders 05:00 when elapsed is 300', () => {
    useGameStore.setState({ elapsed: 300 });
    render(<Timer />);
    expect(screen.getByText('05:00')).toBeInTheDocument();
  });

  it('renders 10:05 when elapsed is 605', () => {
    useGameStore.setState({ elapsed: 605 });
    render(<Timer />);
    expect(screen.getByText('10:05')).toBeInTheDocument();
  });

  it('renders 00:09 when elapsed is 9', () => {
    useGameStore.setState({ elapsed: 9 });
    render(<Timer />);
    expect(screen.getByText('00:09')).toBeInTheDocument();
  });
});
