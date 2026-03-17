import { render, screen } from '@testing-library/react';
import HopTracker from '../HopTracker';
import { useGameStore } from '../../stores/gameStore';

describe('HopTracker', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('returns null when hops is empty', () => {
    useGameStore.setState({ hops: [] });
    const { container } = render(<HopTracker />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all hop articles', () => {
    useGameStore.setState({ hops: ['Cat', 'Dog', 'Fish'] });
    render(<HopTracker />);
    expect(screen.getByText('Cat')).toBeInTheDocument();
    expect(screen.getByText('Dog')).toBeInTheDocument();
    expect(screen.getByText('Fish')).toBeInTheDocument();
  });

  it('the last hop has distinct styling with blue border', () => {
    useGameStore.setState({ hops: ['Cat', 'Dog', 'Fish'] });
    render(<HopTracker />);
    const fishElement = screen.getByText('Fish');
    expect(fishElement.className).toContain('border-blue-700');
    expect(fishElement.className).toContain('bg-blue-900/50');
  });

  it('earlier hops do not have blue border styling', () => {
    useGameStore.setState({ hops: ['Cat', 'Dog', 'Fish'] });
    render(<HopTracker />);
    const catElement = screen.getByText('Cat');
    expect(catElement.className).not.toContain('border-blue-700');
    expect(catElement.className).toContain('bg-gray-800');
  });

  it('shows arrow separators between hops', () => {
    useGameStore.setState({ hops: ['Cat', 'Dog', 'Fish'] });
    const { container } = render(<HopTracker />);
    // The arrow character is \u2192 (right arrow, &rarr;)
    const arrows = container.querySelectorAll('.text-gray-600');
    expect(arrows).toHaveLength(2);
  });

  it('renders single hop without arrows', () => {
    useGameStore.setState({ hops: ['Cat'] });
    const { container } = render(<HopTracker />);
    expect(screen.getByText('Cat')).toBeInTheDocument();
    const arrows = container.querySelectorAll('.text-gray-600');
    expect(arrows).toHaveLength(0);
  });
});
