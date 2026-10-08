/**
 * DineAI Configuration
 * The only file a beginner edits.
 */
window.DineAI = window.DineAI || {};

window.DineAI.config = {
  // Production webhook base URL (never use /webhook-test/ in production)
  BASE_URL: "https://zozvoid.app.n8n.cloud/webhook",

  // Optional: if non-empty, sent as header 'x-api-key'.
  // Visible to anyone who opens dev tools; only deters casual abuse.
  // Note: adding it forces a CORS preflight request, so allow 'x-api-key' in your n8n workflow webhook options.
  API_KEY: "",

  // Default true so the UI runs completely offline with realistic simulated data
  USE_MOCK: false,

  // Currency symbol / code used throughout ticket & menu formatting
  CURRENCY: "EGP",

  // Network timeout in milliseconds
  TIMEOUT_MS: 30000,

  /**
   * n8n webhooks with route parameters (:customer_id) may have a production URL that
   * includes the webhook ID, for example:
   * /webhook/<webhookId>/dineai/customers/1/orders
   * Copy the exact Production URL from your n8n Webhook node and adjust ENDPOINTS.orderHistory if needed.
   */
  ENDPOINTS: {
    createOrder:    { method: "POST", path: "/dineai/orders" },
    orderHistory:   { method: "GET",  path: "/54f9602e-397f-4e19-ab30-7903f85fae59/dineai/customers/{customer_id}/orders" },
    recommend:      { method: "POST", path: "/dineai/recommend" },
    tableRecommend: { method: "POST", path: "/dineai/table-recommend" }
  },

  // Hardcoded restaurant menu items
  MENU: [
    { id: 1,  name: "Ramen",            cuisine: "Japanese", category: "Noodles",   flavor: "Savory",  price: 250 },
    { id: 2,  name: "Sushi",            cuisine: "Japanese", category: "Seafood",   flavor: "Fresh",   price: 320 },
    { id: 3,  name: "Tempura",          cuisine: "Japanese", category: "Seafood",   flavor: "Crispy",  price: 280 },
    { id: 4,  name: "Gyoza",            cuisine: "Japanese", category: "Appetizer", flavor: "Savory",  price: 180 },
    { id: 5,  name: "Yakitori",         cuisine: "Japanese", category: "Grilled",   flavor: "Smoky",   price: 220 },
    { id: 6,  name: "Pad Thai",         cuisine: "Thai",     category: "Noodles",   flavor: "Sweet",   price: 220 },
    { id: 7,  name: "Kimchi Rice",      cuisine: "Korean",   category: "Rice",      flavor: "Spicy",   price: 200 },
    { id: 8,  name: "Margherita Pizza", cuisine: "Italian",  category: "Pizza",     flavor: "Cheesy",  price: 180 },
    { id: 9,  name: "Carbonara",        cuisine: "Italian",  category: "Pasta",     flavor: "Creamy",  price: 240 },
    { id: 10, name: "Lasagna",          cuisine: "Italian",  category: "Pasta",     flavor: "Rich",    price: 260 }
  ],

  // Preset customers
  CUSTOMERS: [
    { id: 1, name: "Ahmed Mohamed" },
    { id: 2, name: "Omar Sawan" },
    { id: 3, name: "Sara Ali" }
  ]
};
