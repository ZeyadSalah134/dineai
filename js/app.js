/**
 * DineAI App Controller
 * Orchestrates navigation, cart state, screen events, and theme management.
 */
window.DineAI = window.DineAI || {};

(function() {
  var app = {
    // Current cart: key is dish_id, value is quantity
    cart: {},

    // Active screen
    currentScreen: "order",

    // Cuisine filter for menu
    activeCuisine: "all",

    init: function() {
      this.initTheme();
      this.bindNavigation();
      this.bindOrderScreen();
      this.bindHistoryScreen();
      this.bindRecommendScreen();
      this.bindWaiterScreen();
      this.bindGlobalActions();

      // Initial render of menu
      this.renderMenu();
      this.updateCartTicket();
    },

    /* =====================================================================
       THEME MANAGEMENT
       ===================================================================== */
    initTheme: function() {
      var savedTheme = localStorage.getItem("dineai_theme") || "auto";
      this.applyTheme(savedTheme);

      var themeSelect = document.getElementById("theme-selector");
      if (themeSelect) {
        themeSelect.value = savedTheme;
        themeSelect.addEventListener("change", function(e) {
          app.applyTheme(e.target.value);
        });
      }

      // Listen for system changes if on auto
      if (window.matchMedia) {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function() {
          var current = localStorage.getItem("dineai_theme") || "auto";
          if (current === "auto") {
            app.applyTheme("auto");
          }
        });
      }
    },

    applyTheme: function(theme) {
      localStorage.setItem("dineai_theme", theme);
      var effectiveTheme = theme;
      if (theme === "auto") {
        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
          effectiveTheme = "dark";
        } else {
          effectiveTheme = "light";
        }
      }

      document.documentElement.setAttribute("data-theme", effectiveTheme);

      // Meta theme color update
      var metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute("content", effectiveTheme === "dark" ? "#091540" : "#F2EFE7");
      }
    },

    /* =====================================================================
       NAVIGATION
       ===================================================================== */
    bindNavigation: function() {
      var navButtons = document.querySelectorAll("[data-nav-target]");
      navButtons.forEach(function(btn) {
        btn.addEventListener("click", function() {
          var target = btn.getAttribute("data-nav-target");
          app.navigateTo(target);
        });
      });
    },

    navigateTo: function(screenId) {
      this.currentScreen = screenId;
      var screens = document.querySelectorAll(".screen-panel");
      screens.forEach(function(screen) {
        if (screen.id === "screen-" + screenId) {
          screen.classList.add("active");
          screen.removeAttribute("hidden");
        } else {
          screen.classList.remove("active");
          screen.setAttribute("hidden", "true");
        }
      });

      // Update active nav markers across desktop rail and mobile bottom bar
      var allNavBtns = document.querySelectorAll("[data-nav-target]");
      allNavBtns.forEach(function(btn) {
        if (btn.getAttribute("data-nav-target") === screenId) {
          btn.classList.add("active");
          btn.setAttribute("aria-current", "page");
        } else {
          btn.classList.remove("active");
          btn.removeAttribute("aria-current");
        }
      });

      // Announce view change for screen readers
      var liveRegion = document.getElementById("nav-live-announcer");
      if (liveRegion) {
        liveRegion.textContent = "Navigated to " + screenId.replace("-", " ") + " section.";
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    /* =====================================================================
       ORDER SCREEN & CART
       ===================================================================== */
    bindOrderScreen: function() {
      var customerSelect = document.getElementById("order-customer-select");
      var customIdGroup = document.getElementById("order-custom-id-group");
      var cuisineFilters = document.getElementById("cuisine-filters");
      var submitBtn = document.getElementById("order-submit-btn");
      var clearTicketBtn = document.getElementById("clear-ticket-btn");

      if (customerSelect) {
        customerSelect.addEventListener("change", function() {
          if (customerSelect.value === "other") {
            customIdGroup.removeAttribute("hidden");
            document.getElementById("order-custom-id-input").focus();
          } else {
            customIdGroup.setAttribute("hidden", "true");
          }
        });
      }

      if (cuisineFilters) {
        cuisineFilters.addEventListener("click", function(e) {
          var chip = e.target.closest(".filter-chip");
          if (!chip) return;
          var cuisine = chip.getAttribute("data-cuisine");
          app.activeCuisine = cuisine;

          var chips = cuisineFilters.querySelectorAll(".filter-chip");
          chips.forEach(function(c) {
            c.classList.remove("active");
            c.setAttribute("aria-pressed", "false");
          });
          chip.classList.add("active");
          chip.setAttribute("aria-pressed", "true");

          app.renderMenu();
        });
      }

      if (clearTicketBtn) {
        clearTicketBtn.addEventListener("click", function() {
          app.cart = {};
          app.renderMenu();
          app.updateCartTicket();
        });
      }

      if (submitBtn) {
        submitBtn.addEventListener("click", function() {
          app.handleOrderSubmit(submitBtn);
        });
      }
    },

    getSelectedCustomerId: function(prefix) {
      var select = document.getElementById(prefix + "-customer-select");
      if (!select) return null;
      var val = select.value;
      if (val === "other") {
        var customInput = document.getElementById(prefix + "-custom-id-input");
        var customVal = customInput ? Number(customInput.value.trim()) : 0;
        return customVal || null;
      }
      return Number(val) || null;
    },

    renderMenu: function() {
      var menuList = document.getElementById("menu-items-list");
      if (!menuList) return;

      var items = window.DineAI.config.MENU || [];
      var activeCuisine = this.activeCuisine;

      var filtered = items.filter(function(item) {
        if (activeCuisine === "all") return true;
        return item.cuisine.toLowerCase() === activeCuisine.toLowerCase();
      });

      var html = "";
      for (var i = 0; i < filtered.length; i++) {
        var dish = filtered[i];
        var qty = this.cart[dish.id] || 0;
        var initial = dish.name.charAt(0).toUpperCase();

        html += 
          '<div class="menu-dish-row" data-dish-id="' + dish.id + '">' +
            '<div class="dish-monogram font-display" aria-hidden="true">' + initial + '</div>' +
            '<div class="dish-info">' +
              '<h3 class="dish-name font-display">' + window.DineAI.ui.escapeHtml(dish.name) + '</h3>' +
              '<div class="dish-meta tag-caps">' +
                '<span>' + window.DineAI.ui.escapeHtml(dish.cuisine) + '</span>' +
                '<span class="tag-sep">&bull;</span>' +
                '<span>' + window.DineAI.ui.escapeHtml(dish.category) + '</span>' +
                '<span class="tag-sep">&bull;</span>' +
                '<span>' + window.DineAI.ui.escapeHtml(dish.flavor) + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="dish-price-stepper">' +
              '<span class="dish-price font-mono">' + window.DineAI.ui.formatPrice(dish.price) + '</span>' +
              '<div class="stepper" role="group" aria-label="Quantity for ' + window.DineAI.ui.escapeHtml(dish.name) + '">' +
                '<button type="button" class="stepper-btn btn-step-minus" data-dish-id="' + dish.id + '" aria-label="Decrease quantity" ' + (qty === 0 ? 'disabled' : '') + '>&minus;</button>' +
                '<span class="stepper-val font-mono" id="qty-' + dish.id + '" aria-live="polite">' + qty + '</span>' +
                '<button type="button" class="stepper-btn btn-step-plus" data-dish-id="' + dish.id + '" aria-label="Increase quantity">+</button>' +
              '</div>' +
            '</div>' +
          '</div>';
      }

      menuList.innerHTML = html;

      // Bind steppers
      menuList.querySelectorAll(".btn-step-plus").forEach(function(btn) {
        btn.addEventListener("click", function() {
          var id = Number(btn.getAttribute("data-dish-id"));
          app.adjustCart(id, 1);
        });
      });

      menuList.querySelectorAll(".btn-step-minus").forEach(function(btn) {
        btn.addEventListener("click", function() {
          var id = Number(btn.getAttribute("data-dish-id"));
          app.adjustCart(id, -1);
        });
      });
    },

    adjustCart: function(dishId, delta) {
      var current = this.cart[dishId] || 0;
      var updated = current + delta;
      if (updated > 20) {
        var alertContainer = document.getElementById("order-alert-box");
        window.DineAI.ui.showAlert(alertContainer, "error", "Maximum 20 units allowed per item.");
        return;
      }
      if (updated <= 0) {
        delete this.cart[dishId];
      } else {
        this.cart[dishId] = updated;
      }
      this.updateCartTicket();

      // Update specific stepper inline for responsiveness
      var qtyEl = document.getElementById("qty-" + dishId);
      if (qtyEl) {
        qtyEl.textContent = this.cart[dishId] || 0;
      }
      var minusBtn = document.querySelector('.btn-step-minus[data-dish-id="' + dishId + '"]');
      if (minusBtn) {
        minusBtn.disabled = (!this.cart[dishId] || this.cart[dishId] <= 0);
      }
      var plusBtn = document.querySelector('.btn-step-plus[data-dish-id="' + dishId + '"]');
      if (plusBtn) {
        plusBtn.disabled = (this.cart[dishId] >= 20);
      }
    },

    updateCartTicket: function() {
      var ticketItems = document.getElementById("ticket-cart-items");
      var ticketTotal = document.getElementById("ticket-cart-total");
      var submitBtn = document.getElementById("order-submit-btn");
      var cartBadge = document.getElementById("mobile-cart-badge");
      var clearBtn = document.getElementById("clear-ticket-btn");

      var menu = window.DineAI.config.MENU || [];
      var keys = Object.keys(this.cart);
      var estimatedTotal = 0;
      var totalItemsCount = 0;
      var rowsHtml = "";

      for (var i = 0; i < keys.length; i++) {
        var dishId = Number(keys[i]);
        var qty = this.cart[dishId];
        if (qty > 0) {
          var dish = menu.find(function(d) { return d.id === dishId; });
          if (dish) {
            var lineTot = dish.price * qty;
            estimatedTotal += lineTot;
            totalItemsCount += qty;
            rowsHtml += 
              '<div class="ticket-row">' +
                '<span class="ticket-qty">' + qty + 'x</span>' +
                '<span class="ticket-name">' + window.DineAI.ui.escapeHtml(dish.name) + '</span>' +
                '<span class="ticket-dots" aria-hidden="true"></span>' +
                '<span class="ticket-price">' + window.DineAI.ui.formatPrice(lineTot) + '</span>' +
              '</div>';
          }
        }
      }

      if (ticketItems) {
        if (rowsHtml) {
          ticketItems.innerHTML = rowsHtml;
          if (clearBtn) clearBtn.removeAttribute("hidden");
        } else {
          ticketItems.innerHTML = '<div class="ticket-empty-text">Nothing on your ticket yet.</div>';
          if (clearBtn) clearBtn.setAttribute("hidden", "true");
        }
      }

      if (ticketTotal) {
        ticketTotal.textContent = window.DineAI.ui.formatPrice(estimatedTotal);
      }

      if (submitBtn) {
        submitBtn.disabled = (totalItemsCount === 0);
      }

      if (cartBadge) {
        if (totalItemsCount > 0) {
          cartBadge.textContent = totalItemsCount;
          cartBadge.removeAttribute("hidden");
        } else {
          cartBadge.setAttribute("hidden", "true");
        }
      }
    },

    handleOrderSubmit: function(submitBtn) {
      var alertContainer = document.getElementById("order-alert-box");
      var ticketContainer = document.getElementById("order-ticket-result");
      window.DineAI.ui.clearAlert(alertContainer);

      var customerId = this.getSelectedCustomerId("order");
      var tableInput = document.getElementById("order-table-input");
      var tableNumber = tableInput ? Number(tableInput.value) : 0;

      if (!customerId || customerId <= 0) {
        window.DineAI.ui.showAlert(alertContainer, "error", "Please select or enter a valid customer ID.");
        return;
      }

      if (!tableNumber || tableNumber <= 0 || tableNumber > 50) {
        window.DineAI.ui.showAlert(alertContainer, "error", "Please specify a valid table number between 1 and 50.");
        return;
      }

      var itemsToSend = [];
      var keys = Object.keys(this.cart);
      for (var i = 0; i < keys.length; i++) {
        var did = Number(keys[i]);
        var q = this.cart[did];
        if (q > 0) {
          if (q < 1 || q > 20) {
            window.DineAI.ui.showAlert(alertContainer, "error", "Each item quantity must be between 1 and 20.");
            return;
          }
          itemsToSend.push({ dish_id: did, quantity: q });
        }
      }

      if (itemsToSend.length === 0) {
        window.DineAI.ui.showAlert(alertContainer, "error", "Nothing on your ticket yet.");
        return;
      }

      window.DineAI.ui.showSkeleton(ticketContainer, "Printing kitchen order ticket...");

      window.DineAI.ui.withActionLock(submitBtn, function() {
        return window.DineAI.api.apiCall("createOrder", {
          body: {
            customer_id: customerId,
            table_number: tableNumber,
            items: itemsToSend
          }
        }).then(function(res) {
          if (res.ok && res.data && res.data.success) {
            // Success response: render ticket and clear cart
            var successMsg = "Order sent. Table " + tableNumber + " is on the way.";
            window.DineAI.ui.showAlert(alertContainer, "success", successMsg);

            // Render signature kitchen ticket
            ticketContainer.innerHTML = window.DineAI.ui.renderOrderTicket(res.data);

            // Clear current cart state
            app.cart = {};
            app.renderMenu();
            app.updateCartTicket();
          } else {
            ticketContainer.innerHTML = "";
            var errorMsg = res.message || (res.data && res.data.error) || "Something in the request isn't valid.";
            window.DineAI.ui.showAlert(alertContainer, "error", errorMsg);
          }
        });
      });
    },

    /* =====================================================================
       ORDER HISTORY SCREEN
       ===================================================================== */
    bindHistoryScreen: function() {
      var customerSelect = document.getElementById("history-customer-select");
      var customIdGroup = document.getElementById("history-custom-id-group");
      var loadBtn = document.getElementById("history-load-btn");

      if (customerSelect) {
        customerSelect.addEventListener("change", function() {
          if (customerSelect.value === "other") {
            customIdGroup.removeAttribute("hidden");
            document.getElementById("history-custom-id-input").focus();
          } else {
            customIdGroup.setAttribute("hidden", "true");
          }
        });
      }

      if (loadBtn) {
        loadBtn.addEventListener("click", function() {
          app.handleLoadHistory(loadBtn);
        });
      }

      // Delegate click for accordion receipt rows
      var resultContainer = document.getElementById("history-result");
      if (resultContainer) {
        resultContainer.addEventListener("click", function(e) {
          var btn = e.target.closest(".receipt-row-btn");
          if (!btn) return;

          var panelId = btn.getAttribute("aria-controls");
          var panel = document.getElementById(panelId);
          if (!panel) return;

          var isExpanded = btn.getAttribute("aria-expanded") === "true";
          btn.setAttribute("aria-expanded", !isExpanded);
          if (isExpanded) {
            panel.setAttribute("hidden", "true");
          } else {
            panel.removeAttribute("hidden");
          }
        });
      }
    },

    handleLoadHistory: function(btn) {
      var alertContainer = document.getElementById("history-alert-box");
      var resultContainer = document.getElementById("history-result");
      window.DineAI.ui.clearAlert(alertContainer);

      var customerId = this.getSelectedCustomerId("history");
      if (!customerId) {
        window.DineAI.ui.showAlert(alertContainer, "error", "Please select or enter a valid customer ID.");
        return;
      }

      window.DineAI.ui.showSkeleton(resultContainer, "Retrieving customer orders...");

      window.DineAI.ui.withActionLock(btn, function() {
        return window.DineAI.api.apiCall("orderHistory", {
          params: { customer_id: customerId }
        }).then(function(res) {
          if (res.ok && res.data && res.data.success) {
            var orders = Array.isArray(res.data.orders) ? res.data.orders : [];
            resultContainer.innerHTML = window.DineAI.ui.renderOrderHistory(orders);
          } else {
            resultContainer.innerHTML = "";
            var errorMsg = res.message || (res.data && res.data.error) || "Could not retrieve history.";
            window.DineAI.ui.showAlert(alertContainer, "error", errorMsg);
          }
        });
      });
    },

    /* =====================================================================
       FOR YOU (RECOMMENDATION) SCREEN
       ===================================================================== */
    bindRecommendScreen: function() {
      var customerSelect = document.getElementById("rec-customer-select");
      var customIdGroup = document.getElementById("rec-custom-id-group");
      var getPickBtn = document.getElementById("rec-get-btn");
      var resultContainer = document.getElementById("rec-result");

      if (customerSelect) {
        customerSelect.addEventListener("change", function() {
          if (customerSelect.value === "other") {
            customIdGroup.removeAttribute("hidden");
            document.getElementById("rec-custom-id-input").focus();
          } else {
            customIdGroup.setAttribute("hidden", "true");
          }
        });
      }

      if (getPickBtn) {
        getPickBtn.addEventListener("click", function() {
          app.handleGetRecommendation(getPickBtn);
        });
      }

      // Delegate "Add to my order" button click
      if (resultContainer) {
        resultContainer.addEventListener("click", function(e) {
          var addBtn = e.target.closest(".btn-add-pick");
          if (!addBtn) return;
          var dishName = addBtn.getAttribute("data-dish-name");
          app.addRecommendedDishToOrder(dishName);
        });
      }
    },

    handleGetRecommendation: function(btn) {
      var alertContainer = document.getElementById("rec-alert-box");
      var resultContainer = document.getElementById("rec-result");
      window.DineAI.ui.clearAlert(alertContainer);

      var customerId = this.getSelectedCustomerId("rec");
      if (!customerId) {
        window.DineAI.ui.showAlert(alertContainer, "error", "Please select or enter a valid customer ID.");
        return;
      }

      window.DineAI.ui.showSkeleton(resultContainer, "Looking at what you usually order...");

      window.DineAI.ui.withActionLock(btn, function() {
        return window.DineAI.api.apiCall("recommend", {
          body: { customer_id: customerId }
        }).then(function(res) {
          if (res.ok && res.data && res.data.success) {
            var rec = res.data.recommendation || {};
            // Source may be at top level or inside recommendation
            var source = res.data.source || rec.source || "ai";
            resultContainer.innerHTML = window.DineAI.ui.renderRecommendationCard(rec, source);
          } else {
            resultContainer.innerHTML = "";
            var errorMsg = res.message || (res.data && res.data.error) || "Could not retrieve recommendation.";
            window.DineAI.ui.showAlert(alertContainer, "error", errorMsg);
          }
        });
      });
    },

    addRecommendedDishToOrder: function(dishName) {
      if (!dishName) return;
      var menu = window.DineAI.config.MENU || [];
      var matched = menu.find(function(d) {
        return d.name.toLowerCase().trim() === dishName.toLowerCase().trim();
      });

      if (matched) {
        this.adjustCart(matched.id, 1);
        this.navigateTo("order");
        var orderAlert = document.getElementById("order-alert-box");
        window.DineAI.ui.showAlert(orderAlert, "success", "Added " + matched.name + " to your ticket.");
      } else {
        var recAlert = document.getElementById("rec-alert-box");
        window.DineAI.ui.showAlert(recAlert, "error", "Recommended dish '" + dishName + "' is not on the active seasonal menu.");
      }
    },

    /* =====================================================================
       WAITER PASS SCREEN
       ===================================================================== */
    bindWaiterScreen: function() {
      var getSuggestionsBtn = document.getElementById("waiter-get-btn");
      if (getSuggestionsBtn) {
        getSuggestionsBtn.addEventListener("click", function() {
          app.handleGetWaiterSuggestions(getSuggestionsBtn);
        });
      }
    },

    handleGetWaiterSuggestions: function(btn) {
      var alertContainer = document.getElementById("waiter-alert-box");
      var resultContainer = document.getElementById("waiter-result");
      window.DineAI.ui.clearAlert(alertContainer);

      var tableInput = document.getElementById("waiter-table-input");
      var tableNumber = tableInput ? Number(tableInput.value) : 0;

      if (!tableNumber || tableNumber <= 0 || tableNumber > 50) {
        window.DineAI.ui.showAlert(alertContainer, "error", "Please provide a valid table number between 1 and 50.");
        return;
      }

      window.DineAI.ui.showSkeleton(resultContainer, "Checking the table...");

      window.DineAI.ui.withActionLock(btn, function() {
        return window.DineAI.api.apiCall("tableRecommend", {
          body: { table_number: tableNumber }
        }).then(function(res) {
          if (res.ok && res.data && res.data.success) {
            var rawRecs = res.data.recommendations;
            // Defensive: if recommendations is an object instead of array, wrap it
            var recs = Array.isArray(rawRecs) ? rawRecs : (rawRecs ? [rawRecs] : []);
            var source = res.data.source || "ai";
            resultContainer.innerHTML = window.DineAI.ui.renderWaiterPass(tableNumber, recs, source);
          } else {
            resultContainer.innerHTML = "";
            var errorMsg = res.message || (res.data && res.data.error) || "Could not retrieve table suggestions.";
            window.DineAI.ui.showAlert(alertContainer, "error", errorMsg);
          }
        });
      });
    },

    /* =====================================================================
       GLOBAL / CONNECTION CHECK
       ===================================================================== */
    bindGlobalActions: function() {
      var connBtn = document.getElementById("check-connection-btn");
      var connStatus = document.getElementById("connection-status-pill");

      if (connBtn && connStatus) {
        connBtn.addEventListener("click", function() {
          connStatus.textContent = "Checking...";
          connStatus.className = "conn-pill conn-checking";

          window.DineAI.ui.withActionLock(connBtn, function() {
            // Read-only check for customer 1
            return window.DineAI.api.apiCall("orderHistory", {
              params: { customer_id: 1 }
            }).then(function(res) {
              if (res.ok) {
                connStatus.textContent = "Connected";
                connStatus.className = "conn-pill conn-ok";
              } else {
                connStatus.textContent = "Can't reach the server";
                connStatus.className = "conn-pill conn-err";
              }
            });
          });
        });
      }
    }
  };

  // Assign to global namespace
  window.DineAI.app = app;

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      app.init();
    });
  } else {
    app.init();
  }
})();
