/**
 * DineAI API Layer
 * Handles network requests with timeout, safe JSON parsing, and mock delegation.
 * Never throws to the UI layer.
 */
window.DineAI = window.DineAI || {};

window.DineAI.api = {
  /**
   * Calls an endpoint configured in DineAI.config.ENDPOINTS.
   * @param {string} endpointKey 'createOrder' | 'orderHistory' | 'recommend' | 'tableRecommend'
   * @param {Object} options { params: {}, body: {} }
   * @returns {Promise<{ ok: boolean, status: number, data: any, message: string }>}
   */
  apiCall: function(endpointKey, options) {
    options = options || {};
    var config = window.DineAI.config;

    // Route to mock provider if USE_MOCK is active
    if (config.USE_MOCK) {
      if (window.DineAI.mock && typeof window.DineAI.mock.execute === "function") {
        return window.DineAI.mock.execute(endpointKey, options);
      }
      return Promise.resolve({
        ok: false,
        status: 500,
        data: null,
        message: "Mock engine unavailable."
      });
    }

    var endpointDef = config.ENDPOINTS[endpointKey];
    if (!endpointDef) {
      return Promise.resolve({
        ok: false,
        status: 400,
        data: null,
        message: "Configuration error: Unknown endpoint " + endpointKey
      });
    }

    // Build URL replacing path placeholders like {customer_id}
    var path = endpointDef.path;
    var params = options.params || {};
    for (var key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        path = path.replace(new RegExp("{" + key + "}", "g"), encodeURIComponent(params[key]));
      }
    }

    // Clean any accidental double slashes
    var base = config.BASE_URL.replace(/\/+$/, "");
    var fullPath = path.replace(/^\/+/, "");
    var url = base + "/" + fullPath;

    var method = (endpointDef.method || "GET").toUpperCase();
    var headers = {};

    // Only send x-api-key if explicitly provided
    if (config.API_KEY && config.API_KEY.trim() !== "") {
      headers["x-api-key"] = config.API_KEY.trim();
    }

    var fetchOptions = {
      method: method,
      headers: headers
    };

    if (method === "POST" || method === "PUT" || method === "PATCH") {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(options.body || {});
    }
    // GET requests omit Content-Type to avoid triggering avoidable CORS preflight

    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timeoutId = null;

    if (controller) {
      fetchOptions.signal = controller.signal;
      timeoutId = setTimeout(function() {
        controller.abort();
      }, config.TIMEOUT_MS || 30000);
    }

    return fetch(url, fetchOptions)
      .then(function(response) {
        if (timeoutId) clearTimeout(timeoutId);

        var status = response.status;
        return response.text().then(function(rawText) {
          var parsedData = null;
          if (rawText && rawText.trim() !== "") {
            try {
              parsedData = JSON.parse(rawText);
            } catch (err) {
              parsedData = { raw: rawText };
            }
          } else {
            parsedData = {};
          }

          if (response.ok) {
            return {
              ok: true,
              status: status,
              data: parsedData,
              message: (parsedData && parsedData.message) ? parsedData.message : "Request succeeded."
            };
          }

          // Error handling: Prioritize the backend's explicit error message
          var backendError = (parsedData && (parsedData.error || parsedData.message)) ? (parsedData.error || parsedData.message) : null;
          var friendlyMsg = backendError;

          if (!friendlyMsg) {
            if (status === 400) {
              friendlyMsg = "Something in the request isn't valid.";
            } else if (status === 404) {
              friendlyMsg = "Not found.";
            } else if (status === 429) {
              friendlyMsg = "Too many requests. Wait a moment and try again.";
            } else if (status >= 500) {
              friendlyMsg = "The server had a problem. Try again.";
            } else {
              friendlyMsg = "Request failed (" + status + ").";
            }
          }

          return {
            ok: false,
            status: status,
            data: parsedData,
            message: friendlyMsg
          };
        });
      })
      .catch(function(error) {
        if (timeoutId) clearTimeout(timeoutId);

        var isTimeout = error && (error.name === "AbortError" || error.code === 20);
        if (isTimeout) {
          return {
            ok: false,
            status: 408,
            data: null,
            message: "Request timed out (30s). The server or AI model may be busy, please try again."
          };
        }

        var isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
        var offlineMsg = isOffline
          ? "You appear to be offline. Check your internet connection."
          : "Can't reach the kitchen. Check that the n8n workflow is published and the URL is the production URL.";

        return {
          ok: false,
          status: 0,
          data: null,
          message: offlineMsg
        };
      });
  }
};
