import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Home from '../Home';
import { useGameStore } from '../../stores/gameStore';

const mockEmit = vi.fn();

vi.mock('../../services/socket', () => ({
  getSocket: () => ({
    emit: mockEmit,
    connect: vi.fn(),
    connected: true,
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe('Home', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    mockEmit.mockClear();
  });

  it('renders title "WikiHop"', () => {
    renderHome();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('WikiHop');
  });

  it('shows Create Game and Join Game buttons initially', () => {
    renderHome();
    expect(screen.getByText('Create Game')).toBeInTheDocument();
    expect(screen.getByText('Join Game')).toBeInTheDocument();
  });

  it('shows nickname input when Create Game is clicked', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByText('Create Game'));
    expect(screen.getByPlaceholderText('Your nickname')).toBeInTheDocument();
    expect(screen.getByText('Create Room')).toBeInTheDocument();
  });

  it('shows both nickname and room code inputs when Join Game is clicked', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByText('Join Game'));
    expect(screen.getByPlaceholderText('Your nickname')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Room code/)).toBeInTheDocument();
    expect(screen.getByText('Join Room')).toBeInTheDocument();
  });

  it('Create Room button is disabled when nickname is empty', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByText('Create Game'));
    const createButton = screen.getByText('Create Room');
    expect(createButton).toBeDisabled();
  });

  it('Create Room button is enabled when nickname has content', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByText('Create Game'));
    await user.type(screen.getByPlaceholderText('Your nickname'), 'Alice');
    const createButton = screen.getByText('Create Room');
    expect(createButton).not.toBeDisabled();
  });

  it('emits create-room socket event with nickname on submit', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByText('Create Game'));
    await user.type(screen.getByPlaceholderText('Your nickname'), 'Alice');
    await user.click(screen.getByText('Create Room'));
    expect(mockEmit).toHaveBeenCalledWith('create-room', { nickname: 'Alice' });
  });

  it('emits join-room socket event with room code and nickname', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByText('Join Game'));
    await user.type(screen.getByPlaceholderText('Your nickname'), 'Bob');
    await user.type(screen.getByPlaceholderText(/Room code/), 'AXKM');
    await user.click(screen.getByText('Join Room'));
    expect(mockEmit).toHaveBeenCalledWith('join-room', { roomCode: 'AXKM', nickname: 'Bob' });
  });

  it('Back button returns to menu from create mode', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByText('Create Game'));
    expect(screen.queryByText('Create Game')).not.toBeInTheDocument();
    await user.click(screen.getByText('Back'));
    expect(screen.getByText('Create Game')).toBeInTheDocument();
    expect(screen.getByText('Join Game')).toBeInTheDocument();
  });

  it('Back button returns to menu from join mode', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByText('Join Game'));
    expect(screen.queryByText('Join Game')).not.toBeInTheDocument();
    await user.click(screen.getByText('Back'));
    expect(screen.getByText('Create Game')).toBeInTheDocument();
    expect(screen.getByText('Join Game')).toBeInTheDocument();
  });

  it('does not emit create-room when nickname is empty', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByText('Create Game'));
    await user.click(screen.getByText('Create Room'));
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('Join Room button is disabled when room code is incomplete', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByText('Join Game'));
    await user.type(screen.getByPlaceholderText('Your nickname'), 'Bob');
    await user.type(screen.getByPlaceholderText(/Room code/), 'AB');
    const joinButton = screen.getByText('Join Room');
    expect(joinButton).toBeDisabled();
  });
});
