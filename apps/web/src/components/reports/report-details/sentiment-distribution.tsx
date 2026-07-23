export interface SentimentDistributionProps {
  distribution: Record<string, number>;
}

export function SentimentDistribution({
  distribution,
}: SentimentDistributionProps): React.JSX.Element {
  const entries = Object.entries(distribution);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-medium text-gray-700">
        Sentiment distribution
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No sentiment data available.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map(([sentiment, count]) => (
            <li key={sentiment} className="flex items-center justify-between">
              <span className="text-sm text-gray-900">{sentiment}</span>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                {count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
