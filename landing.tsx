import { html } from "hono/html";

export const LandingPage = () => html`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Absolute - Smart LLM Proxy</title>
      <style>
        :root {
          --bg: #111111;
          --text: #e5e5e5;
          --accent: #3b82f6; /* Using blue as accent color */
        }

        body {
          font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
          background: var(--bg);
          color: var(--text);
          line-height: 1.6;
          margin: 0;
          padding: 2rem;
        }

        .container {
          max-width: 900px;
          margin: 0 auto;
        }

        h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          font-weight: normal;
        }

        .subtitle {
          color: var(--accent);
          margin-bottom: 3rem;
          font-size: 1.1rem;
        }

        .description {
          margin-bottom: 3rem;
          line-height: 1.8;
        }

        pre {
          background: rgba(59, 130, 246, 0.1);
          padding: 1.5rem;
          border-radius: 4px;
          overflow-x: auto;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        code {
          font-family: inherit;
        }

        .section {
          margin-bottom: 3rem;
        }

        .comment {
          color: var(--accent);
        }

        .highlight {
          color: var(--accent);
          font-weight: 500;
        }

        a {
          color: var(--accent);
          text-decoration: none;
          border-bottom: 1px solid var(--accent);
        }

        a:hover {
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="section">
          <h1>💥 Absolute</h1>
          <div class="subtitle">Ultrafast Smart LLM Proxy</div>
          <div class="description">
            Route requests between fast and slow models based on complexity.
            <br />
            Simple interactions like "Hello" or "What's 2+2?" go to quick
            models,
            <br />
            while complex reasoning, analysis, and domain-specific questions go
            to more capable ones. <br />
            <span class="highlight">Zero added latency.</span> Drop-in
            replacement for your OpenAI client.
          </div>
        </div>

        <div class="section">
          <div class="comment">// Usage Example</div>
          <pre><code>curl https://your-proxy.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -d '{
    "messages": [
      {"role": "user", "content": "What is the meaning of life?"}
    ],
    "fastModel": "gpt-4o", // Quick model for simple queries
    "slowModel": "o1-mini", // Powerful model for complex ones
    "stream": true
  }'</code></pre>
        </div>

        <div class="section">
          <div class="comment">// Features</div>
          <pre><code>1. OpenAI API Compatible
2. Mixed heuristics for deciding model
3. Support any OpenAI compatible model
4. Open-source and private
5. Very fast (hosted on Cloudflare Workers)</code></pre>
        </div>

        <div class="section">
          <div class="comment">// Links</div>
          <pre><code>Source code: <a href="https://github.com/vincelwt/absolute" target="_blank">github.com</a>
Twitter: <a href="https://twitter.com/vincelwt" target="_blank">@vincelwt</a></code></pre>
        </div>
      </div>
    </body>
  </html>
`;
