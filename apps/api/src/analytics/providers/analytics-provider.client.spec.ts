import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AnalyticsProviderClient } from './analytics-provider.client';
import {
  AnalyticsProviderUnavailableException,
  AnalyticsInvalidResponseException,
} from '../analytics.exceptions';
import { AnalyticsConfigModel } from '../../config/analytics-config';

const mockConfig: AnalyticsConfigModel = {
  baseUrl: 'http://localhost:3002',
  timeoutMs: 5000,
  maxRetries: 2,
  backoffBaseMs: 300,
  idempotencyWindowMinutes: 5,
};

const jsonResponse = (status: number, body: unknown) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe('AnalyticsProviderClient', () => {
  let client: AnalyticsProviderClient;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    const mockConfigService: Partial<ConfigService> = {
      get: jest.fn().mockReturnValue(mockConfig),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsProviderClient,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    client = module.get<AnalyticsProviderClient>(AnalyticsProviderClient);

    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns the result on the first successful attempt, without retrying', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { sentiment: 'positive', keywords: ['great'] }),
    );

    const result = await client.analyze('some text');

    expect(result).toEqual({
      sentiment: 'positive',
      keywords: ['great'],
      attemptsMade: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries after transient failures and succeeds on the final attempt, waiting the exact backoff delays', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(jsonResponse(503, { error: 'unavailable' }))
      .mockResolvedValueOnce(
        jsonResponse(200, { sentiment: 'neutral', keywords: [] }),
      );

    const resultPromise = client.analyze('some text');

    // after attempt 1 fails: 300ms backoff before attempt 2
    await jest.advanceTimersByTimeAsync(300);
    // after attempt 2 fails: 900ms backoff before attempt 3
    await jest.advanceTimersByTimeAsync(900);

    const result = await resultPromise;

    expect(result).toEqual({
      sentiment: 'neutral',
      keywords: [],
      attemptsMade: 3,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws AnalyticsProviderUnavailableException after exhausting all attempts', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: 'server error' }));

    const resultPromise = client.analyze('some text');
    // Attach a catch handler immediately so the eventual rejection is never
    // "unhandled" while fake timers are advanced below.
    resultPromise.catch(() => undefined);

    await jest.advanceTimersByTimeAsync(300);
    await jest.advanceTimersByTimeAsync(900);

    await expect(resultPromise).rejects.toThrow(
      AnalyticsProviderUnavailableException,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('fails immediately on a 4xx response, without retrying', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { error: 'bad request' }));

    await expect(client.analyze('some text')).rejects.toThrow(
      AnalyticsProviderUnavailableException,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails immediately with AnalyticsInvalidResponseException on a schema-invalid 200 response, without retrying', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { keywords: ['a', 'b'] }));

    await expect(client.analyze('some text')).rejects.toThrow(
      AnalyticsInvalidResponseException,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
