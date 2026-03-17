import { render, screen } from '@testing-library/react';
import PlayerList from '../PlayerList';
import { useGameStore } from '../../stores/gameStore';

const alice = {
  id: 'p1',
  nickname: 'Alice',
  currentArticle: '',
  hops: [],
  hopCount: 0,
  finished: false,
  connected: true,
  ready: true,
};

const bob = {
  id: 'p2',
  nickname: 'Bob',
  currentArticle: '',
  hops: [],
  hopCount: 0,
  finished: false,
  connected: true,
  ready: false,
};

describe('PlayerList', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders all player nicknames', () => {
    useGameStore.setState({
      playerId: 'p1',
      phase: 'WAITING',
      players: { p1: alice, p2: bob },
    });
    render(<PlayerList />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  it('shows "(you)" next to the current player', () => {
    useGameStore.setState({
      playerId: 'p1',
      phase: 'WAITING',
      players: { p1: alice, p2: bob },
    });
    render(<PlayerList />);
    expect(screen.getByText(/Alice \(you\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Bob \(you\)/)).not.toBeInTheDocument();
  });

  it('shows "Ready" and "Not ready" during WAITING phase', () => {
    useGameStore.setState({
      playerId: 'p1',
      phase: 'WAITING',
      players: { p1: alice, p2: bob },
    });
    render(<PlayerList />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Not ready')).toBeInTheDocument();
  });

  it('shows hop count during PLAYING phase', () => {
    useGameStore.setState({
      playerId: 'p1',
      phase: 'PLAYING',
      players: {
        p1: { ...alice, hopCount: 3 },
        p2: { ...bob, hopCount: 7 },
      },
    });
    render(<PlayerList />);
    expect(screen.getByText('3 hops')).toBeInTheDocument();
    expect(screen.getByText('7 hops')).toBeInTheDocument();
  });

  it('shows "Finished!" for finished players during PLAYING phase', () => {
    useGameStore.setState({
      playerId: 'p1',
      phase: 'PLAYING',
      players: {
        p1: { ...alice, hopCount: 3, finished: true },
        p2: { ...bob, hopCount: 5, finished: false },
      },
    });
    render(<PlayerList />);
    const finishedLabels = screen.getAllByText('Finished!');
    expect(finishedLabels).toHaveLength(1);
  });

  it('shows hop count and "Finished!" during FINISHED phase', () => {
    useGameStore.setState({
      playerId: 'p1',
      phase: 'FINISHED',
      players: {
        p1: { ...alice, hopCount: 3, finished: true },
        p2: { ...bob, hopCount: 5, finished: true },
      },
    });
    render(<PlayerList />);
    expect(screen.getByText('3 hops')).toBeInTheDocument();
    expect(screen.getByText('5 hops')).toBeInTheDocument();
    const finishedLabels = screen.getAllByText('Finished!');
    expect(finishedLabels).toHaveLength(2);
  });

  it('does not show Ready/Not ready during PLAYING phase', () => {
    useGameStore.setState({
      playerId: 'p1',
      phase: 'PLAYING',
      players: { p1: alice, p2: bob },
    });
    render(<PlayerList />);
    expect(screen.queryByText('Ready')).not.toBeInTheDocument();
    expect(screen.queryByText('Not ready')).not.toBeInTheDocument();
  });
});
