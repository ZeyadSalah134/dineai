/**
 * DineAI Mock Data Provider
 * Simulates latency and every edge case required for local offline testing:
 * - 800ms delay
 * - customer 2 -> fallback rule-based recommendation
 * - customer 99 -> 404
 * - customer 3 -> empty history
 * - customer 77 -> simulated 500 error
 * - table 99 -> 404 for waiter suggestions
 */
window.DineAI = window.DineAI || {};

window.DineAI.mock = {
  // In-memory order counter and store for newly created orders in mock mode
  _orderSeq: 1042,
  _orders: [
    {
      order_id: 1018,
      customer_id: 1,
      date: "2025-05-12 19:40",
      total: 570,
      status: "completed",
      table_number: 4,
      items: [
        { dish: "Ramen", cuisine: "Japanese", category: "Noodles", quantity: 1, price: 250 },
        { dish: "Sushi", cuisine: "Japanese", category: "Seafood", quantity: 1, price: 320 }
      ]
    },
    {
      order_id: 1035,
      customer_id: 1,
      date: "2025-05-18 20:15",
      total: 440,
      status: "active",
      table_number: 5,
      items: [
        { dish: "Yakitori", cuisine: "Japanese", category: "Grilled", quantity: 2, price: 220 }
      ]
    },
    {
      order_id: 1024,
      customer_id: 2,
      date: "2025-05-14 13:10",
      total: 500,
      status: "completed",
      table_number: 2,
      items: [
        { dish: "Pad Thai", cuisine: "Thai", category: "Noodles", quantity: 1, price: 220 },
        { dish: "Tempura", cuisine: "Japanese", category: "Seafood", quantity: 1, price: 280 }
      ]
    }
  ],

  execute: function(endpointKey, options) {
    var self = this;
    var params = options.params || {};
    var body = options.body || {};

    return new Promise(function(resolve) {
      setTimeout(function() {
        if (endpointKey === "createOrder") {
          var customerId = Number(body.customer_id);
          var tableNumber = Number(body.table_number);
          var reqItems = Array.isArray(body.items) ? body.items : [];

          if (customerId === 77) {
            resolve({
              ok: false,
              status: 500,
              data: { success: false, error: "Database transaction failed on simulated server." },
              message: "The server had a problem. Try again."
            });
            return;
          }

          if (customerId === 99) {
            resolve({
              ok: false,
              status: 404,
              data: { success: false, error: "Customer not found." },
              message: "Not found."
            });
            return;
          }

          if (!tableNumber || reqItems.length === 0) {
            resolve({
              ok: false,
              status: 400,
              data: { success: false, error: "Missing required table number or order items." },
              message: "Something in the request isn't valid."
            });
            return;
          }

          // Resolve dish details from config
          var menu = window.DineAI.config.MENU;
          var total = 0;
          var enrichedItems = [];

          for (var i = 0; i < reqItems.length; i++) {
            var itemReq = reqItems[i];
            var dish = null;
            for (var m = 0; m < menu.length; m++) {
              if (menu[m].id === itemReq.dish_id) {
                dish = menu[m];
                break;
              }
            }
            if (!dish) {
              resolve({
                ok: false,
                status: 400,
                data: { success: false, error: "Dish ID " + itemReq.dish_id + " is not currently available." },
                message: "Something in the request isn't valid."
              });
              return;
            }
            var linePrice = dish.price * itemReq.quantity;
            total += linePrice;
            enrichedItems.push({
              dish_id: dish.id,
              dish: dish.name,
              cuisine: dish.cuisine,
              category: dish.category,
              quantity: itemReq.quantity,
              price: dish.price,
              line_total: linePrice
            });
          }

          self._orderSeq += 1;
          var newOrder = {
            order_id: self._orderSeq,
            customer_id: customerId,
            date: new Date().toISOString().replace("T", " ").substring(0, 16),
            total: total,
            status: "active",
            table_number: tableNumber,
            items: enrichedItems
          };

          self._orders.unshift(newOrder);

          resolve({
            ok: true,
            status: 200,
            data: {
              success: true,
              message: "Order placed successfully.",
              order_id: newOrder.order_id,
              total: total,
              table_number: tableNumber,
              items: enrichedItems
            },
            message: "Order sent. Table " + tableNumber + " is on the way."
          });
          return;
        }

        if (endpointKey === "orderHistory") {
          var cid = Number(params.customer_id);

          if (cid === 77) {
            resolve({
              ok: false,
              status: 500,
              data: { success: false, error: "Simulated database connection error." },
              message: "The server had a problem. Try again."
            });
            return;
          }

          if (cid === 99) {
            resolve({
              ok: false,
              status: 404,
              data: { success: false, error: "Customer not found." },
              message: "Customer not found."
            });
            return;
          }

          if (cid === 3) {
            // Customer 3: empty history
            resolve({
              ok: true,
              status: 200,
              data: {
                success: true,
                customer_id: 3,
                orders: []
              },
              message: "Orders retrieved."
            });
            return;
          }

          var customerOrders = self._orders.filter(function(o) {
            return o.customer_id === cid;
          });

          resolve({
            ok: true,
            status: 200,
            data: {
              success: true,
              customer_id: cid,
              orders: customerOrders
            },
            message: "Orders retrieved."
          });
          return;
        }

        if (endpointKey === "recommend") {
          var rcid = Number(body.customer_id);

          if (rcid === 77) {
            resolve({
              ok: false,
              status: 500,
              data: { success: false, error: "AI recommendation engine failure." },
              message: "The server had a problem. Try again."
            });
            return;
          }

          if (rcid === 99) {
            resolve({
              ok: false,
              status: 404,
              data: { success: false, error: "Customer profile not found." },
              message: "Customer not found."
            });
            return;
          }

          if (rcid === 2) {
            // Rule-based fallback pick
            resolve({
              ok: true,
              status: 200,
              data: {
                success: true,
                source: "fallback",
                recommendation: {
                  recommended_dish: "Pad Thai",
                  reason: "A classic street-noodle balance of tamarind, sweet heat, and crushed peanuts for an authentic lunch craving.",
                  cuisine: "Thai",
                  category: "Noodles",
                  price: 220,
                  confidence: 72
                }
              },
              message: "Recommendation ready."
            });
            return;
          }

          // Default AI pick for customer 1 and others
          resolve({
            ok: true,
            status: 200,
            data: {
              success: true,
              source: "ai",
              recommendation: {
                recommended_dish: "Tempura",
                reason: "Pairs with your frequent preference for Japanese broth and savory notes, offering light shatter-crisp texture without overpowering the palate.",
                cuisine: "Japanese",
                category: "Seafood",
                price: 280,
                confidence: 94
              }
            },
            message: "Recommendation ready."
          });
          return;
        }

        if (endpointKey === "tableRecommend") {
          var tbl = Number(body.table_number);

          if (tbl === 77) {
            resolve({
              ok: false,
              status: 500,
              data: { success: false, error: "Internal table aggregation error." },
              message: "The server had a problem. Try again."
            });
            return;
          }

          if (tbl === 99) {
            // Table 99: nobody has active order
            resolve({
              ok: false,
              status: 404,
              data: {
                success: false,
                error: "Nobody has an active order at this table yet. Place an order for this table first."
              },
              message: "Nobody has an active order at this table yet. Place an order for this table first."
            });
            return;
          }

          // Active suggestions for the pass
          resolve({
            ok: true,
            status: 200,
            data: {
              success: true,
              table_number: tbl,
              source: "ai",
              recommendations: [
                {
                  dish: "Gyoza",
                  price: 180,
                  cuisine: "Japanese",
                  category: "Appetizer",
                  reason: "Shared savory starter that complements currently queued ramen and sushi orders across the bench."
                },
                {
                  dish: "Yakitori",
                  price: 220,
                  cuisine: "Japanese",
                  category: "Grilled",
                  reason: "Smoky skewers with tare glaze to bridge table conversation while mains finish in the kitchen."
                },
                {
                  dish: "Tempura",
                  price: 280,
                  cuisine: "Japanese",
                  category: "Seafood",
                  reason: "Crispy prawn and seasonal veg, fast hot-line pickup that balances broth courses."
                }
              ]
            },
            message: "Table suggestions ready."
          });
          return;
        }

        resolve({
          ok: false,
          status: 404,
          data: { error: "Unknown endpoint" },
          message: "Not found."
        });
      }, 800);
    });
  }
};
