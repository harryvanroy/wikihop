import { describe, it, expect } from 'vitest';
import { CreateRoomPayload, JoinRoomPayload, HopPayload } from '../types/events';

describe('CreateRoomPayload', () => {
  it('accepts valid payload with nickname only', () => {
    const result = CreateRoomPayload.safeParse({ nickname: 'Alice' });
    expect(result.success).toBe(true);
  });

  it('accepts valid payload with config', () => {
    const result = CreateRoomPayload.safeParse({
      nickname: 'Alice',
      config: { maxPlayers: 4, timeLimit: 120 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty nickname', () => {
    const result = CreateRoomPayload.safeParse({ nickname: '' });
    expect(result.success).toBe(false);
  });

  it('rejects nickname longer than 20 characters', () => {
    const result = CreateRoomPayload.safeParse({ nickname: 'A'.repeat(21) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid config values', () => {
    const result = CreateRoomPayload.safeParse({
      nickname: 'Alice',
      config: { maxPlayers: 100 },
    });
    expect(result.success).toBe(false);
  });
});

describe('JoinRoomPayload', () => {
  it('accepts valid payload', () => {
    const result = JoinRoomPayload.safeParse({ roomCode: 'ABCD', nickname: 'Bob' });
    expect(result.success).toBe(true);
  });

  it('rejects room code with wrong length', () => {
    const result = JoinRoomPayload.safeParse({ roomCode: 'AB', nickname: 'Bob' });
    expect(result.success).toBe(false);
  });

  it('rejects empty nickname', () => {
    const result = JoinRoomPayload.safeParse({ roomCode: 'ABCD', nickname: '' });
    expect(result.success).toBe(false);
  });
});

describe('HopPayload', () => {
  it('accepts valid payload', () => {
    const result = HopPayload.safeParse({ fromArticle: 'Cat', toArticle: 'Dog' });
    expect(result.success).toBe(true);
  });

  it('rejects empty fromArticle', () => {
    const result = HopPayload.safeParse({ fromArticle: '', toArticle: 'Dog' });
    expect(result.success).toBe(false);
  });

  it('rejects empty toArticle', () => {
    const result = HopPayload.safeParse({ fromArticle: 'Cat', toArticle: '' });
    expect(result.success).toBe(false);
  });

  it('rejects article titles longer than 300 characters', () => {
    const result = HopPayload.safeParse({
      fromArticle: 'A'.repeat(301),
      toArticle: 'Dog',
    });
    expect(result.success).toBe(false);
  });
});
