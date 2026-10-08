/**
 * DineAI UI Helper Module
 * Escaping, alerts, skeletons, action-locking, and component renderers.
 */
window.DineAI = window.DineAI || {};

window.DineAI.ui = {
  /**
   * Escape HTML to ensure dynamic strings from AI/backend are untrusted and safe.
   */
  escapeHtml: function(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  /**
   * Format prices consistently across screens (e.g. "280 EGP")
   */
  formatPrice: function(amount) {
    var currency = (window.DineAI.config && window.DineAI.config.CURRENCY) || "EGP";
    var num = Number(amount);
    if (isNaN(num)) return "0 " + currency;
    return num.toLocaleString() + " " + currency;
  },

  /**
   * Render alert banner into container
   */
  showAlert: function(containerEl, type, message) {
    if (!containerEl) return;
    var safeType = (type === "success") ? "success" : "error";
    var safeMsg = this.escapeHtml(message);

    containerEl.innerHTML = '<div class="alert-box alert-' + safeType + '" role="alert">' +
      '<span class="alert-indicator" aria-hidden="true">' + (safeType === "success" ? "✓" : "!") + '</span>' +
      '<span class="alert-text">' + safeMsg + '</span>' +
    '</div>';

    // Auto-scroll to alert
    containerEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  },

  clearAlert: function(containerEl) {
    if (containerEl) {
      containerEl.innerHTML = "";
    }
  },

  /**
   * Show typographic skeleton loading state
   */
  showSkeleton: function(containerEl, message) {
    if (!containerEl) return;
    var msg = message ? this.escapeHtml(message) : "Preparing ticket...";
    containerEl.innerHTML = 
      '<div class="skeleton-wrap" aria-busy="true" aria-live="polite">' +
        '<div class="skeleton-msg font-display">' + msg + '</div>' +
        '<div class="skeleton-line skeleton-line-title"></div>' +
        '<div class="skeleton-line skeleton-line-subtitle"></div>' +
        '<div class="skeleton-line skeleton-line-body"></div>' +
        '<div class="skeleton-line skeleton-line-meta"></div>' +
      '</div>';
  },

  /**
   * Button locking helper with inline spinner and 2-second rate limit lockout
   */
  withActionLock: function(buttonEl, actionFn) {
    if (!buttonEl || buttonEl.disabled) return Promise.resolve();

    var originalText = buttonEl.getAttribute("data-original-label") || buttonEl.innerHTML;
    buttonEl.setAttribute("data-original-label", originalText);
    buttonEl.disabled = true;
    buttonEl.classList.add("btn-loading");

    // Inline tiny spinner next to text
    buttonEl.innerHTML = '<span class="inline-spinner" aria-hidden="true"></span> ' + originalText;

    return Promise.resolve()
      .then(function() {
        return actionFn();
      })
      .finally(function() {
        buttonEl.innerHTML = originalText;
        // Lock for 2 more seconds after response for rate limit friendliness
        setTimeout(function() {
          buttonEl.disabled = false;
          buttonEl.classList.remove("btn-loading");
        }, 2000);
      });
  },

  /**
   * Renders the Signature Kitchen Order Ticket
   */
  renderOrderTicket: function(orderData) {
    var orderId = orderData.order_id || "NEW";
    var tableNumber = orderData.table_number || "—";
    var total = this.formatPrice(orderData.total || 0);
    var dateStr = orderData.date || new Date().toISOString().replace("T", " ").substring(0, 16);
    var items = Array.isArray(orderData.items) ? orderData.items : [];

    var itemsHtml = "";
    for (var i = 0; i < items.length; i++) {
      var itm = items[i];
      var name = this.escapeHtml(itm.dish || itm.name || "Item");
      var qty = Number(itm.quantity) || 1;
      var price = Number(itm.price) || 0;
      var lineTotal = Number(itm.line_total) || (price * qty);

      itemsHtml += 
        '<div class="ticket-row">' +
          '<span class="ticket-qty">' + qty + 'x</span>' +
          '<span class="ticket-name">' + name + '</span>' +
          '<span class="ticket-dots" aria-hidden="true"></span>' +
          '<span class="ticket-price">' + this.formatPrice(lineTotal) + '</span>' +
        '</div>';
    }

    return (
      '<div class="kitchen-ticket print-in" tabindex="0" aria-label="Kitchen Order Ticket #' + this.escapeHtml(orderId) + '">' +
        '<div class="ticket-header">' +
          '<div class="ticket-brand">DINE·AI // KITCHEN PASS</div>' +
          '<div class="ticket-order-badge">TICKET #' + this.escapeHtml(orderId) + '</div>' +
          '<div class="ticket-meta-grid">' +
            '<div><span class="ticket-dim">TABLE</span> <strong>' + this.escapeHtml(tableNumber) + '</strong></div>' +
            '<div class="text-right"><span class="ticket-dim">TIME</span> <strong>' + this.escapeHtml(dateStr) + '</strong></div>' +
          '</div>' +
        '</div>' +

        '<div class="ticket-divider"></div>' +

        '<div class="ticket-items">' +
          (itemsHtml || '<div class="ticket-row ticket-empty">No itemized details recorded.</div>') +
        '</div>' +

        '<div class="ticket-divider"></div>' +

        '<div class="ticket-total-row">' +
          '<span class="ticket-total-label">TOTAL PAYABLE</span>' +
          '<span class="ticket-dots" aria-hidden="true"></span>' +
          '<span class="ticket-total-val">' + total + '</span>' +
        '</div>' +

        '<div class="ticket-footer-note">' +
          '<span>STATUS: ACTIVE &bull; ORDER DISPATCHED</span>' +
        '</div>' +

        '<div class="ticket-zigzag" aria-hidden="true"></div>' +
      '</div>'
    );
  },

  /**
   * Renders the Signature Chef's Pick Menu Card
   */
  renderRecommendationCard: function(recData, source) {
    var dish = recData.recommended_dish || recData.dish || recData.name || "Chef's Daily Special";
    var cuisine = recData.cuisine || "Specialty";
    var category = recData.category || "House Curated";
    var price = recData.price ? this.formatPrice(recData.price) : "Market Price";
    var reason = recData.reason || "Carefully prepared with seasonal ingredients matching your taste profile.";
    var confidence = Math.min(100, Math.max(0, Number(recData.confidence) || 85));

    var isFallback = (source === "fallback" || recData.source === "fallback");

    var sourceBadgeHtml = isFallback
      ? '<div class="fallback-badge-wrap">' +
          '<span class="fallback-badge" tabindex="0" title="The AI was unavailable, so a rule-based pick was used.">Backup pick</span>' +
          '<span class="fallback-tooltip-text">The AI was unavailable, so a rule-based pick was used.</span>' +
        '</div>'
      : '<span class="ai-badge">AI Curated Pick</span>';

    return (
      '<article class="chef-pick-card" aria-labelledby="chef-pick-title">' +
        '<div class="chef-pick-meta-top">' +
          '<div class="dish-tags">' +
            '<span class="tag-caps">' + this.escapeHtml(cuisine) + '</span>' +
            '<span class="tag-sep">&bull;</span>' +
            '<span class="tag-caps">' + this.escapeHtml(category) + '</span>' +
          '</div>' +
          sourceBadgeHtml +
        '</div>' +

        '<h3 id="chef-pick-title" class="chef-pick-dish font-display">' + this.escapeHtml(dish) + '</h3>' +

        '<div class="chef-pick-price font-mono">' + price + '</div>' +

        '<p class="chef-pick-reason">' + this.escapeHtml(reason) + '</p>' +

        '<div class="confidence-container" aria-label="Recommendation match rating ' + confidence + '%">' +
          '<div class="confidence-header">' +
            '<span class="confidence-title">Match index</span>' +
            '<span class="confidence-number font-mono">' + confidence + '%</span>' +
          '</div>' +
          '<div class="confidence-track" aria-hidden="true">' +
            '<div class="confidence-fill" style="width: ' + confidence + '%;"></div>' +
            '<div class="confidence-ticks">' +
              '<span class="tick tick-0" title="0%"></span>' +
              '<span class="tick tick-25" title="25%"></span>' +
              '<span class="tick tick-50" title="50%"></span>' +
              '<span class="tick tick-75" title="75%"></span>' +
              '<span class="tick tick-100" title="100%"></span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="chef-pick-actions">' +
          '<button type="button" class="btn btn-primary btn-add-pick" data-dish-name="' + this.escapeHtml(dish) + '">' +
            'Add to my order' +
          '</button>' +
        '</div>' +
      '</article>'
    );
  },

  /**
   * Renders the Signature Waiter PASS Screen
   */
  renderWaiterPass: function(tableNumber, suggestions, source) {
    var items = Array.isArray(suggestions) ? suggestions : [suggestions];
    var isFallback = (source === "fallback");

    var listHtml = "";
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var numStr = (i + 1 < 10) ? "0" + (i + 1) : String(i + 1);
      var dishName = item.dish || item.recommended_dish || item.name || "Kitchen Special";
      var price = item.price ? this.formatPrice(item.price) : "Market Price";
      var reason = item.reason || "Recommended complement for current active orders at table.";
      var cuisine = item.cuisine ? this.escapeHtml(item.cuisine) : "";
      var category = item.category ? this.escapeHtml(item.category) : "";

      listHtml += 
        '<li class="pass-item">' +
          '<div class="pass-item-index font-mono" aria-hidden="true">' + numStr + '</div>' +
          '<div class="pass-item-body">' +
            '<div class="pass-item-head">' +
              '<h3 class="pass-dish-name font-display">' + this.escapeHtml(dishName) + '</h3>' +
              '<span class="pass-dish-price font-mono">' + price + '</span>' +
            '</div>' +
            (cuisine || category ? 
              '<div class="pass-dish-tags tag-caps">' + 
                (cuisine ? '<span>' + cuisine + '</span>' : '') + 
                (cuisine && category ? '<span class="tag-sep">&bull;</span>' : '') + 
                (category ? '<span>' + category + '</span>' : '') + 
              '</div>' : '') +
            '<p class="pass-dish-reason">' + this.escapeHtml(reason) + '</p>' +
          '</div>' +
        '</li>';
    }

    return (
      '<div class="waiter-pass-board">' +
        '<div class="pass-board-header">' +
          '<div class="pass-table-callout">' +
            '<span class="pass-table-label">THE PASS // TABLE</span>' +
            '<span class="pass-table-num font-mono">' + this.escapeHtml(tableNumber) + '</span>' +
          '</div>' +
          '<div class="pass-meta">' +
            '<div class="pass-helper-text">Based on guests with active orders at this table.</div>' +
            (isFallback ? '<span class="fallback-badge">Backup suggestions</span>' : '<span class="ai-badge">Live pairings</span>') +
          '</div>' +
        '</div>' +

        '<ol class="pass-numbered-list">' +
          listHtml +
        '</ol>' +
      '</div>'
    );
  },

  /**
   * Renders Accordion Receipt Rows for Order History
   */
  renderOrderHistory: function(orders) {
    if (!orders || orders.length === 0) {
      return (
        '<div class="empty-state-box">' +
          '<div class="empty-state-title font-display">No orders yet.</div>' +
          '<div class="empty-state-desc">Their first one will show up here.</div>' +
        '</div>'
      );
    }

    var totalSpent = 0;
    for (var i = 0; i < orders.length; i++) {
      totalSpent += (Number(orders[i].total) || 0);
    }

    var summaryHeader = 
      '<div class="history-summary-bar">' +
        '<span class="history-count font-mono">' + orders.length + ' ' + (orders.length === 1 ? 'order' : 'orders') + '</span>' +
        '<span class="history-dot-sep">&bull;</span>' +
        '<span class="history-total font-mono">' + this.formatPrice(totalSpent) + ' in total</span>' +
      '</div>';

    var receiptsHtml = "";
    for (var j = 0; j < orders.length; j++) {
      var ord = orders[j];
      var orderId = ord.order_id || ("ORD-" + (j + 1));
      var dateStr = ord.date || "Recent";
      var statusStr = ord.status || "active";
      var table = ord.table_number ? ("Table " + ord.table_number) : "Table —";
      var totalStr = this.formatPrice(ord.total || 0);
      var items = Array.isArray(ord.items) ? ord.items : [];
      var panelId = "receipt-panel-" + j + "-" + orderId;
      var btnId = "receipt-btn-" + j + "-" + orderId;

      var itemsRows = "";
      for (var k = 0; k < items.length; k++) {
        var itm = items[k];
        var iname = this.escapeHtml(itm.dish || itm.name || "Item");
        var qty = Number(itm.quantity) || 1;
        var prc = Number(itm.price) || 0;
        var lineTot = this.formatPrice(prc * qty);

        itemsRows += 
          '<div class="receipt-item-row font-mono">' +
            '<span class="receipt-item-qty">' + qty + 'x</span>' +
            '<span class="receipt-item-name">' + iname + '</span>' +
            '<span class="ticket-dots" aria-hidden="true"></span>' +
            '<span class="receipt-item-price">' + lineTot + '</span>' +
          '</div>';
      }

      receiptsHtml += 
        '<div class="receipt-strip">' +
          '<button type="button" class="receipt-row-btn" id="' + btnId + '" aria-expanded="false" aria-controls="' + panelId + '">' +
            '<div class="receipt-row-left">' +
              '<span class="receipt-chevron" aria-hidden="true">&#9654;</span>' +
              '<span class="receipt-id font-mono">#' + this.escapeHtml(orderId) + '</span>' +
              '<span class="receipt-table font-mono">' + this.escapeHtml(table) + '</span>' +
              '<span class="receipt-date">' + this.escapeHtml(dateStr) + '</span>' +
            '</div>' +
            '<div class="receipt-row-right">' +
              '<span class="receipt-status-badge status-' + this.escapeHtml(statusStr.toLowerCase()) + '">' + this.escapeHtml(statusStr) + '</span>' +
              '<span class="receipt-total font-mono">' + totalStr + '</span>' +
            '</div>' +
          '</button>' +
          '<div id="' + panelId + '" class="receipt-details-panel" role="region" aria-labelledby="' + btnId + '" hidden>' +
            '<div class="receipt-details-inner">' +
              '<div class="receipt-items-list">' +
                (itemsRows || '<div class="receipt-no-items font-mono">Item breakdown not stored for this record.</div>') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    return (
      '<div class="history-results">' +
        summaryHeader +
        '<div class="receipts-stack">' +
          receiptsHtml +
        '</div>' +
      '</div>'
    );
  }
};
