import express, { Request, Response } from "express";

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT ?? "3002", 10);

interface AnalyzeRequest {
  text?: string;
}

interface AnalyzeResponse {
  sentiment?: "positive" | "negative" | "neutral";
  keywords?: string[];
}

/**
 * POST /analyze
 *
 * Failure modes (controlled via X-Mock-Mode header or text content):
 *
 * | X-Mock-Mode header | Text trigger     | Behavior                              |
 * |--------------------|------------------|---------------------------------------|
 * | timeout            | __timeout__      | No response for 15s (simulates timeout)|
 * | 500                | __error_500__    | HTTP 500 Internal Server Error        |
 * | 503                | __error_503__    | HTTP 503 Service Unavailable          |
 * | partial            | __partial__      | Response without `sentiment` field    |
 * | (default)          |                  | Normal response with sentiment+keywords|
 */
app.post(
  "/analyze",
  (req: Request<object, AnalyzeResponse, AnalyzeRequest>, res: Response) => {
    const mockMode = req.headers["x-mock-mode"] as string | undefined;
    const text = req.body?.text ?? "";

    const mode =
      mockMode ??
      (text.includes("__timeout__")
        ? "timeout"
        : text.includes("__error_500__")
          ? "500"
          : text.includes("__error_503__")
            ? "503"
            : text.includes("__partial__")
              ? "partial"
              : "ok");

    switch (mode) {
      case "timeout":
        // No response — simulates a hung connection / timeout
        console.log(
          "[mock-analytics] Simulating timeout — no response will be sent",
        );
        setTimeout(() => {
          res.status(503).json({ error: "Timeout simulation completed" });
        }, 15_000);
        return;

      case "500":
        console.log("[mock-analytics] Simulating HTTP 500");
        res.status(500).json({
          error: "Internal Server Error",
          message: "Simulated internal server error",
        });
        return;

      case "503":
        console.log("[mock-analytics] Simulating HTTP 503");
        res.status(503).json({
          error: "Service Unavailable",
          message: "Simulated service unavailable",
        });
        return;

      case "partial":
        console.log(
          "[mock-analytics] Simulating partial response (no sentiment field)",
        );
        res.status(200).json({
          keywords: extractKeywords(text),
          // NOTE: 'sentiment' field intentionally omitted
        });
        return;

      default: {
        const sentiment = analyzeSentiment(text);
        const keywords = extractKeywords(text);
        console.log("[mock-analytics] Normal response", {
          sentiment,
          keywords,
        });
        res.status(200).json({ sentiment, keywords });
      }
    }
  },
);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  const positiveWords = [
    "good",
    "great",
    "excellent",
    "happy",
    "positive",
    "love",
    "best",
  ];
  const negativeWords = [
    "bad",
    "terrible",
    "awful",
    "hate",
    "negative",
    "worst",
    "poor",
  ];

  const positiveCount = positiveWords.filter((w) => lower.includes(w)).length;
  const negativeCount = negativeWords.filter((w) => lower.includes(w)).length;

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

function extractKeywords(text: string): string[] {
  const stopwords = new Set([
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
  ]);
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3 && !stopwords.has(word))
    .slice(0, 10);
}

app.listen(PORT, () => {
  console.log(`[mock-analytics] Server running on http://localhost:${PORT}`);
  console.log(
    "[mock-analytics] POST /analyze — supported X-Mock-Mode values: timeout | 500 | 503 | partial | (default: ok)",
  );
});
