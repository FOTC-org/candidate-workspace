# Mock Analytics API

Minimal HTTP server simulating an external text analysis API for local development and testing.

## Endpoint

```
POST /analyze
Content-Type: application/json

{ "text": "Your text here" }
```

Normal response:

```json
{
  "sentiment": "positive",
  "keywords": ["text", "analysis", "result"]
}
```

## Failure modes

Failure modes are controlled by the `X-Mock-Mode` request header **or** by embedding a trigger string in the request text.

| `X-Mock-Mode` header | Text trigger    | Behavior                                                       |
| -------------------- | --------------- | -------------------------------------------------------------- |
| `timeout`            | `__timeout__`   | No response for 15 seconds — simulates network timeout         |
| `500`                | `__error_500__` | Returns HTTP 500 with JSON error body                          |
| `503`                | `__error_503__` | Returns HTTP 503 with JSON error body                          |
| `partial`            | `__partial__`   | Returns 200 with `keywords` array but **no `sentiment` field** |
| _(absent)_           | _(absent)_      | Normal success response                                        |

### Usage examples

```bash
# Normal response
curl -s -X POST http://localhost:3002/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a great product"}'

# Simulate timeout
curl -s -X POST http://localhost:3002/analyze \
  -H "Content-Type: application/json" \
  -H "X-Mock-Mode: timeout" \
  -d '{"text": "some text"}'

# Simulate HTTP 500
curl -s -X POST http://localhost:3002/analyze \
  -H "Content-Type: application/json" \
  -H "X-Mock-Mode: 500" \
  -d '{"text": "some text"}'

# Simulate partial response (no sentiment)
curl -s -X POST http://localhost:3002/analyze \
  -H "Content-Type: application/json" \
  -H "X-Mock-Mode: partial" \
  -d '{"text": "some text"}'

# Text-based trigger (useful when you control only the text field)
curl -s -X POST http://localhost:3002/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "trigger __error_503__ here"}'
```

## Start

```bash
cp .env.example .env
pnpm start:dev
```

Default port: `3002` (configurable via `PORT` env).
