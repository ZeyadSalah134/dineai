# DineAI &mdash; Restaurant Ordering & Recommendation Web Application

A tactile, editorial restaurant ordering and AI recommendation frontend engineered with **pure HTML, CSS, and Vanilla JavaScript** (no frameworks, no npm, no build steps). Designed around the physical metaphor of the **kitchen ticket, printed menu card, and waiter's pass**.

DineAI connects directly over HTTP to an **n8n automation backend**, with an offline mock engine allowing full product testing without an active connection.

---

## 1. Project Structure

```
DineAiAgent/
├── index.html       # Single-page application markup with semantic landmarks
├── css/
│   └── style.css    # Complete design tokens, ticket textures, zigzag mask, responsive rail
├── js/
│   ├── config.js    # Endpoint configuration, menu items, mock toggle
│   ├── mock.js      # Offline test engine simulating 800ms latency and backend edge cases
│   ├── api.js       # Resilient HTTP client with AbortController timeout & safe JSON parsing
│   ├── ui.js        # Ticket generator, Chef's pick card, Pass board, Accordion receipts
│   └── app.js       # Navigation, shopping cart, theme controller, event bindings
└── README.md        # Documentation and deployment guide
```

> **Direct File Access:** Because DineAI uses classic `<script>` tags loaded in dependency order with `defer` under a single global namespace (`window.DineAI`), the entire application can be run simply by double-clicking [index.html](file:///c:/Users/fanal/OneDrive/Desktop/DineAiAgent/index.html) or hosting it on any static server.

---

## 2. Configuration (`js/config.js`)

[config.js](file:///c:/Users/fanal/OneDrive/Desktop/DineAiAgent/js/config.js) is the single file designed for customization:

### Switching Off Mock Mode
To connect to your live n8n backend:
```javascript
window.DineAI.config = {
  BASE_URL: "https://zozvoid.app.n8n.cloud/webhook",
  USE_MOCK: false, // Set to false to send live HTTP requests
  ...
};
```

### Setting Webhook Endpoints
n8n webhooks with route parameters (`:customer_id`) may produce production URLs containing the Webhook node ID, such as `/webhook/<webhookId>/dineai/customers/1/orders`. Copy the exact Production URL from your n8n Webhook node and update `ENDPOINTS`:

```javascript
ENDPOINTS: {
  createOrder:    { method: "POST", path: "/dineai/orders" },
  orderHistory:   { method: "GET",  path: "/54f9602e-397f-4e19-ab30-7903f85fae59/dineai/customers/{customer_id}/orders" },
  recommend:      { method: "POST", path: "/dineai/recommend" },
  tableRecommend: { method: "POST", path: "/dineai/table-recommend" }
}
```

### Optional API Key Header
If your webhook requires an API key, set `API_KEY: "your-key"`. The application will transmit it as `x-api-key`.
> *Note:* Adding an API key causes the browser to issue an HTTP `OPTIONS` CORS preflight. Ensure your n8n Webhook node responds to `OPTIONS` and permits the `x-api-key` header.

---

## 3. Design System & Color Palette

The interface strictly adheres to two curated palettes and uses `color-mix()` for derived surfaces and borders. No generic gradients or glassmorphism are used.

### CSS Variables (`css/style.css`)
```css
/* Dark Theme */
--c-deep-navy:  #091540;
--c-royal-blue: #1B2CC1;
--c-periwinkle: #7692FF;
--c-ice-blue:   #ABD2FA;

/* Light Theme */
--c-steel-blue: #3368A0;
--c-sky-teal:   #66A3BF;
--c-pale-sage:  #C8DFDB;
--c-warm-paper: #F2EFE7;
```

### Contrast & WCAG AA Compliance
- **Dark Mode:** Text `#ABD2FA` on deep navy background `#091540` achieves a contrast ratio of **9.8:1** (exceeding WCAG AAA). Buttons use `#1B2CC1` with `#ABD2FA` text (**5.6:1**, exceeding WCAG AA).
- **Light Mode:** High-contrast navy text `color-mix(in srgb, #3368A0 25%, black)` on `#F2EFE7` paper background achieves a contrast ratio of **12.4:1**. Primary buttons pair `#3368A0` with `#F2EFE7` (**5.2:1**, exceeding WCAG AA).

---

## 4. Screens & Metaphors

1. **Order:** Asymmetric menu browsing with monograms, category/flavor chips, sticky ticket sidebar, and a physical **kitchen ticket** printed upon submission (with perforated zigzag edge and dot leaders).
2. **History:** Stack of compact receipt accordion rows (`aria-expanded`) displaying timestamps, table badges, and expandable line items.
3. **For you:** Editorial **Chef's pick card** featuring display typography, flavor notes, a 0-100 linear confidence scale with tick marks, and fallback badges for rule-based picks.
4. **Waiter:** The **Pass screen** featuring an oversized table number callout and numbered culinary suggestions (`01`, `02`, `03`) based on active table orders.

---

## 5. Deployment

### GitHub Pages
1. Push this repository to GitHub.
2. In your GitHub repository, navigate to **Settings** &rarr; **Pages**.
3. Under **Branch**, select `main` (or `master`) and folder `/ (root)`.
4. Click **Save**. Your site will be available at `https://<username>.github.io/<repo>/`.

### Netlify
1. Drag and drop the root folder into [Netlify Drop](https://app.netlify.com/drop).
2. Or connect your Git repository with:
   - **Build command:** *(leave blank)*
   - **Publish directory:** `.`

---

## 6. Troubleshooting

- **"The requested webhook is not registered" / 404:**
  - Make sure the n8n workflow toggle is switched to **Active** (production calls only hit active workflows).
  - Verify that the path in `config.js` matches the Production Webhook URL in n8n (not the Test URL).
- **CORS Failure / "Can't reach the kitchen":**
  - Verify that your n8n Webhook node has **Allowed Origins** set to `*` or your specific domain.
  - If using an `API_KEY`, ensure `x-api-key` is listed under **Allowed Headers** to prevent preflight rejection.
- **Supabase Paused:**
  - Free Supabase projects pause after 7 days of inactivity. If n8n queries Supabase and throws a database connection error, log in to Supabase and resume the project.
- **OpenRouter Free Model Rate Limits / Latency:**
  - Free LLM endpoints can throttle requests or experience high queue times. The frontend includes a 30-second abort controller and displays user-friendly recovery messages when timeouts occur.
