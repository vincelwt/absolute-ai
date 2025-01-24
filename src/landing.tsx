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
          --muted: #777;
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
          max-width: 1000px;
          margin: 0 auto;
        }

        h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          font-weight: normal;
        }

        .subtitle {
          color: var(--accent);
          margin-bottom: 2rem;
          font-size: 1.1rem;
        }

        .section {
          margin-bottom: 2rem;
        }

        /* Two-column layout for description & code sample */
        .two-column {
          display: flex;
          flex-wrap: wrap;
          gap: 2rem;
        }

        .description-col {
          flex: 1 1 50%;
          min-width: 280px;
        }

        .description {
          line-height: 1.8;
        }

        .highlight {
          color: var(--accent);
          font-weight: 500;
        }

        /* Feature styling */
        .features {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          padding: 1.5rem;
          border-radius: 4px;
          margin-top: 1.5rem;
        }
        .features .comment {
          color: var(--accent);
          margin-bottom: 0.5rem;
        }
        .feature-item::before {
          content: "➜ ";
          color: var(--accent);
        }
        .feature-item {
          margin-left: 1rem;
          margin-bottom: 0.5rem;
        }

        /* Tabbed code sample styles */
        .code-col {
          flex: 1 1 50%;
          min-width: 280px;
          position: relative;
        }
        .tabs-nav {
          display: flex;
          border-bottom: 1px solid rgba(59, 130, 246, 0.2);
          margin-bottom: 1rem;
        }
        .tab-btn {
          background: none;
          border: none;
          color: var(--text);
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.9rem;
          border-right: 1px solid rgba(59, 130, 246, 0.2);
          transition: opacity 0.2s;
        }
        .tab-btn:last-of-type {
          border-right: none;
        }
        .tab-btn:hover {
          opacity: 0.8;
        }
        .tab-btn.active {
          color: var(--accent);
        }
        .tabs-content {
          position: relative;
        }
        .tab-content {
          display: none;
          background: rgba(59, 130, 246, 0.1);
          padding: 1rem 1.5rem;
          border-radius: 4px;
          border: 1px solid rgba(59, 130, 246, 0.2);
          overflow-x: auto;
          font-size: 0.9rem;
          min-height: 160px;
        }
        .tab-content.active {
          display: block;
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
        </div>

        <div class="two-column">
          <!-- Left column: description + features -->
          <div class="description-col">
            <div class="description">
              Absolute automatically routes your queries between
              <strong>faster</strong> or
              <strong>more advanced models</strong>—depending on complexity. For
              quick requests (like casual greetings or basic math), it picks a
              lightning‑fast model. For deeper analysis, domain expertise, or
              intricate reasoning, it seamlessly switches to a more powerful
              one. Enjoy
              <span class="highlight">near-zero added latency</span> and drop it
              in as a direct replacement for your existing OpenAI client.
            </div>

            <div class="features">
              <div class="comment">// Features</div>
              <div class="feature-item">OpenAI API compatible</div>
              <div class="feature-item">
                Mixed heuristics for deciding model
              </div>
              <div class="feature-item">
                Support any OpenAI-compatible model
              </div>
              <div class="feature-item">Open-source</div>
              <div class="feature-item">Very fast (Cloudflare Workers)</div>
            </div>
          </div>

          <!-- Right column: tabbed code sample -->
          <div class="code-col">
            <div class="tabs-nav">
              <button class="tab-btn active" data-tab="tab-curl">cURL</button>
              <button class="tab-btn" data-tab="tab-js">JS</button>
              <button class="tab-btn" data-tab="tab-py">Python</button>
            </div>
            <div class="tabs-content">
              <!-- cURL tab -->
              <pre class="tab-content active" id="tab-curl">
curl https://absoluteai.dev/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -d '{
    "messages": [
      {"role": "user", "content": "What is the meaning of life?"}
    ],
    "fastModel": "gpt-4o",
    "slowModel": "o1-mini",
    "stream": true
  }'
              </pre
              >

              <!-- JS tab -->
              <pre class="tab-content" id="tab-js">
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  basePath: "https://absoluteai.dev/v1"
});

const openai = new OpenAIApi(configuration);

(async () => {
  const response = await openai.createChatCompletion({
    model: "gpt-4o",
    messages: [{ role: "user", content: "What is the meaning of life?" }],
    fastModel: "gpt-4o",    // for simple queries
    slowModel: "o1-mini",   // for complex ones
    stream: true
  });
  console.log(response.data);
})();
              </pre
              >

              <!-- Python tab -->
              <pre class="tab-content" id="tab-py">
import os
import openai

openai.api_key = os.getenv("OPENAI_API_KEY")
openai.api_base = "https://absoluteai.dev/v1"

response = openai.ChatCompletion.create(
  model="gpt-4o",
  messages=[{"role": "user", "content": "What is the meaning of life?"}],
  fastModel="gpt-4o",   # for simple queries
  slowModel="o1-mini",  # for complex ones
  stream=True
)

print(response)
              </pre
              >
            </div>
          </div>
        </div>

        <div class="section" style="margin-top:3rem;">
          <div class="comment">// Links</div>
          <pre><code>Source code: <a href="https://github.com/vincelwt/absolute-ai" target="_blank">github.com</a>
Twitter: <a href="https://twitter.com/vincelwt" target="_blank">@vincelwt</a></code></pre>
        </div>
      </div>

      <!-- Simple tab-switching script (inline for convenience) -->
      <script>
        const tabButtons = document.querySelectorAll(".tab-btn");
        const tabContents = document.querySelectorAll(".tab-content");

        tabButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            // Clear active states
            tabButtons.forEach((b) => b.classList.remove("active"));
            tabContents.forEach((tc) => tc.classList.remove("active"));

            // Activate the chosen tab and button
            btn.classList.add("active");
            const tabId = btn.getAttribute("data-tab");
            document.getElementById(tabId).classList.add("active");
          });
        });
      </script>
    </body>
  </html>
`;
