import { Test, TestingModule } from '@nestjs/testing';
import { ReportsAggregationService } from './reports-aggregation.service';

describe('ReportsAggregationService', () => {
  let service: ReportsAggregationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsAggregationService],
    }).compile();

    service = module.get<ReportsAggregationService>(ReportsAggregationService);
  });

  it('returns an empty aggregation when there are no records', () => {
    const result = service.aggregate([]);

    expect(result).toEqual({
      isEmpty: true,
      analysisCount: 0,
      sentimentDistribution: {},
      mostActiveUsers: [],
      coversOnlyInactiveUsers: false,
    });
  });

  it('counts analyses and builds the sentiment distribution', () => {
    const records = [
      { userId: 'user-1', sentiment: 'positive', user: { email: 'a@a.com', isActive: true } },
      { userId: 'user-1', sentiment: 'positive', user: { email: 'a@a.com', isActive: true } },
      { userId: 'user-2', sentiment: 'negative', user: { email: 'b@b.com', isActive: true } },
    ];

    const result = service.aggregate(records);

    expect(result.isEmpty).toBe(false);
    expect(result.analysisCount).toBe(3);
    expect(result.sentimentDistribution).toEqual({ positive: 2, negative: 1 });
  });

  it('does not include a null sentiment in the distribution', () => {
    const records = [
      { userId: 'user-1', sentiment: null, user: { email: 'a@a.com', isActive: true } },
    ];

    const result = service.aggregate(records);

    expect(result.sentimentDistribution).toEqual({});
  });

  it('ranks users by descending analysis count', () => {
    const records = [
      { userId: 'user-1', sentiment: 'positive', user: { email: 'a@a.com', isActive: true } },
      { userId: 'user-2', sentiment: 'positive', user: { email: 'b@b.com', isActive: true } },
      { userId: 'user-2', sentiment: 'positive', user: { email: 'b@b.com', isActive: true } },
    ];

    const result = service.aggregate(records);

    expect(result.mostActiveUsers[0]).toMatchObject({
      userId: 'user-2',
      analysisCount: 2,
    });
    expect(result.mostActiveUsers[1]).toMatchObject({
      userId: 'user-1',
      analysisCount: 1,
    });
  });

  it('breaks ties in analysis count alphabetically by email', () => {
    const records = [
      { userId: 'user-1', sentiment: 'positive', user: { email: 'zoe@example.com', isActive: true } },
      { userId: 'user-2', sentiment: 'positive', user: { email: 'anna@example.com', isActive: true } },
    ];

    const result = service.aggregate(records);

    expect(result.mostActiveUsers[0].email).toBe('anna@example.com');
    expect(result.mostActiveUsers[1].email).toBe('zoe@example.com');
  });

  it('limits mostActiveUsers to the top 5', () => {
    const records = Array.from({ length: 7 }, (_, i) => ({
      userId: `user-${i}`,
      sentiment: 'positive',
      user: { email: `user${i}@example.com`, isActive: true },
    }));

    const result = service.aggregate(records);

    expect(result.mostActiveUsers).toHaveLength(5);
  });

  it('sets coversOnlyInactiveUsers to true when every contributing user is inactive', () => {
    const records = [
      { userId: 'user-1', sentiment: 'positive', user: { email: 'a@a.com', isActive: false } },
      { userId: 'user-2', sentiment: 'negative', user: { email: 'b@b.com', isActive: false } },
    ];

    const result = service.aggregate(records);

    expect(result.coversOnlyInactiveUsers).toBe(true);
  });

  it('sets coversOnlyInactiveUsers to false when at least one contributing user is active', () => {
    const records = [
      { userId: 'user-1', sentiment: 'positive', user: { email: 'a@a.com', isActive: false } },
      { userId: 'user-2', sentiment: 'negative', user: { email: 'b@b.com', isActive: true } },
    ];

    const result = service.aggregate(records);

    expect(result.coversOnlyInactiveUsers).toBe(false);
  });
});
