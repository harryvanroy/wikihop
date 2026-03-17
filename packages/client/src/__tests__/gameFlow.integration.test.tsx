import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { useGameStore } from '../stores/gameStore';
import { fetchArticle } from '../services/wikipedia';
import type { PlayerState } from '@wikihop/shared';

vi.mock('../services/socket', () => ({
  getSocket: () => ({
    emit: vi.fn(),
    connect: vi.fn(),
    connected: true,
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

vi.mock('../services/wikipedia', () => ({
  fetchArticle: vi.fn(),
}));

vi.mock('../utils/sanitize', () => ({
  sanitizeWikiHtml: (html: string) => html,
}));

function renderApp(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>,
  );
}

function makePlayer(id: string, nickname: string, overrides?: Partial<PlayerState>): PlayerState {
  return {
    id,
    nickname,
    currentArticle: 'Cat',
    hops: ['Cat'],
    hopCount: 0,
    finished: false,
    connected: true,
    ready: false,
    ...overrides,
  };
}

const lobbyState = {
  playerId: 'p1',
  roomCode: 'ABCD',
  hostId: 'p1',
  phase: 'WAITING' as const,
  players: {
    p1: makePlayer('p1', 'Alice', { ready: true }),
    p2: makePlayer('p2', 'Bob', { ready: true }),
  },
};

/** Home page splits "Wiki" and "Hop" into separate elements */
function expectHomePage() {
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('WikiHop');
}

function expectNotHomePage() {
  // Home has Create Game / Join Game buttons
  expect(screen.queryByText('Create Game')).not.toBeInTheDocument();
}

beforeEach(() => {
  useGameStore.getState().reset();
  vi.mocked(fetchArticle).mockResolvedValue({ html: '<p>Article content</p>' });
});

describe('Game flow navigation', () => {
  it('transitions from lobby to countdown when game-starting fires', () => {
    useGameStore.setState(lobbyState);
    renderApp('/lobby/ABCD');

    expect(screen.getByText('Game Lobby')).toBeInTheDocument();

    act(() => {
      useGameStore.setState({
        phase: 'COUNTDOWN',
        startArticle: 'Cat',
        targetArticle: 'Dog',
        currentArticle: 'Cat',
        hops: ['Cat'],
      });
    });

    expect(screen.queryByText('Game Lobby')).not.toBeInTheDocument();
    expect(screen.getByText(/Cat/)).toBeInTheDocument();
    expect(screen.getByText(/Dog/)).toBeInTheDocument();
  });

  it('transitions from lobby to game screen when phase becomes PLAYING', () => {
    useGameStore.setState({
      ...lobbyState,
      startArticle: 'Cat',
      targetArticle: 'Dog',
      currentArticle: 'Cat',
      hops: ['Cat'],
    });
    renderApp('/lobby/ABCD');

    expect(screen.getByText('Game Lobby')).toBeInTheDocument();

    act(() => {
      useGameStore.setState({ phase: 'PLAYING' });
    });

    // Should navigate to /game/ABCD — NOT back to home
    expect(screen.queryByText('Game Lobby')).not.toBeInTheDocument();
    expectNotHomePage();
    // Game screen shows current article title as heading
    expect(screen.getByRole('heading', { name: 'Cat' })).toBeInTheDocument();
  });

  it('transitions from game to results when phase becomes FINISHED', () => {
    useGameStore.setState({
      ...lobbyState,
      phase: 'PLAYING',
      startArticle: 'Cat',
      targetArticle: 'Dog',
      currentArticle: 'Fish',
      hops: ['Cat', 'Fish'],
      hopCount: 1,
    });
    renderApp('/game/ABCD');

    act(() => {
      useGameStore.setState({
        phase: 'FINISHED',
        rankings: [
          makePlayer('p1', 'Alice', { finished: true, finishTime: 5000, hopCount: 3 }),
          makePlayer('p2', 'Bob', { finished: false, hopCount: 1 }),
        ],
      });
    });

    expect(screen.getByText('Game Over!')).toBeInTheDocument();
    expect(screen.getByText('Alice (you)')).toBeInTheDocument();
  });

  it('results Play Again button navigates back to home', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      ...lobbyState,
      phase: 'FINISHED',
      startArticle: 'Cat',
      targetArticle: 'Dog',
      rankings: [
        makePlayer('p1', 'Alice', { finished: true, finishTime: 5000, hopCount: 3 }),
      ],
    });
    renderApp('/results/ABCD');

    expect(screen.getByText('Game Over!')).toBeInTheDocument();

    await user.click(screen.getByText('Play Again'));

    expectHomePage();
    expect(screen.queryByText('Game Over!')).not.toBeInTheDocument();
  });
});

describe('Route guards', () => {
  it('redirects /lobby/:code to home when not in a room', () => {
    renderApp('/lobby/ABCD');
    expectHomePage();
  });

  it('redirects /game/:code to home when not in a room', () => {
    renderApp('/game/ABCD');
    expectHomePage();
  });

  it('redirects /results/:code to home when not in a room', () => {
    renderApp('/results/ABCD');
    expectHomePage();
  });

  it('redirects /game/:code to home when phase is not PLAYING', () => {
    useGameStore.setState({ ...lobbyState, phase: 'WAITING' });
    renderApp('/game/ABCD');
    expectHomePage();
  });

  it('redirects /results/:code to home when phase is not FINISHED', () => {
    useGameStore.setState({ ...lobbyState, phase: 'PLAYING' });
    renderApp('/results/ABCD');
    expectHomePage();
  });

  it('redirects /lobby/:code to game when phase is PLAYING', () => {
    useGameStore.setState({
      ...lobbyState,
      phase: 'PLAYING',
      startArticle: 'Cat',
      targetArticle: 'Dog',
      currentArticle: 'Cat',
      hops: ['Cat'],
    });
    renderApp('/lobby/ABCD');

    expect(screen.queryByText('Game Lobby')).not.toBeInTheDocument();
    expectNotHomePage();
    expect(screen.getByRole('heading', { name: 'Cat' })).toBeInTheDocument();
  });

  it('redirects /lobby/:code to results when phase is FINISHED', () => {
    useGameStore.setState({
      ...lobbyState,
      phase: 'FINISHED',
      startArticle: 'Cat',
      targetArticle: 'Dog',
      rankings: [
        makePlayer('p1', 'Alice', { finished: true, finishTime: 5000, hopCount: 3 }),
      ],
    });
    renderApp('/lobby/ABCD');

    expect(screen.getByText('Game Over!')).toBeInTheDocument();
  });

  it('redirects /lobby/:code to home when room code does not match', () => {
    useGameStore.setState(lobbyState);
    renderApp('/lobby/ZZZZ');
    expectHomePage();
  });
});

describe('Connection status', () => {
  it('shows disconnection banner when connection is lost', () => {
    renderApp('/');

    act(() => {
      useGameStore.setState({ connectionStatus: 'disconnected' });
    });

    expect(screen.getByText(/Connection lost/)).toBeInTheDocument();
  });

  it('hides disconnection banner when reconnected', () => {
    renderApp('/');

    act(() => {
      useGameStore.setState({ connectionStatus: 'disconnected' });
    });
    expect(screen.getByText(/Connection lost/)).toBeInTheDocument();

    act(() => {
      useGameStore.setState({ connectionStatus: 'connected' });
    });
    expect(screen.queryByText(/Connection lost/)).not.toBeInTheDocument();
  });
});

describe('Error display', () => {
  it('shows server error on home screen', () => {
    useGameStore.setState({ error: 'Room not found' });
    renderApp('/');
    expect(screen.getByText('Room not found')).toBeInTheDocument();
  });

  it('clears error when state is cleared', () => {
    useGameStore.setState({ error: 'Room not found' });
    renderApp('/');
    expect(screen.getByText('Room not found')).toBeInTheDocument();

    act(() => {
      useGameStore.setState({ error: null });
    });
    expect(screen.queryByText('Room not found')).not.toBeInTheDocument();
  });
});
