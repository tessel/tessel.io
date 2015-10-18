var Celery = require("try-celery");
var async = require('async')
var stubs = require('./stubs.json');
var numeral = require('numeral');
numeral.defaultFormat('$0,0.00');

function getExistingOrderDetails(orderID, callback) {
  // Create a Celery connection to the Tessel 2 Celery account
  if(process.env.NODE_ENV === 'dev'){
    callback(null, stubs.orderDetails.data);
    return;
  }
  var celery = new Celery({
    "key" : process.env.CELERY_TOKEN_T2, 
    "version" : 2
  });

  console.log('fetching!', "orders/" + orderID.toString())
  // Ping Celery for orders for a specific id
  celery.request("orders/" + orderID.toString(), function(err, body) { 
    // If an error happened, log it just in case
    if (err) {
      console.log(err);
      // Pass the error back to the caller
      if (typeof callback === 'function') {
        callback(err);
      }
      return;
    }
    // If there was no error
    else {
      // Just call the callback
      if (typeof callback === 'function') {
        callback(null, body.data);
      }
      return;
    } 
  });
}

function getAvailableModules(callback) {
  if(process.env.NODE_ENV === 'dev'){
    stubs.products.map(function(item){
      item.price_formatted = numeral(item.price/100).format();
      item.product_id = item._id;
      item.id = item.slug;
      return item;
    });
    callback(null, stubs.products);
    return;
  }
  // Fetch modules from the celery account
  var celery = new Celery({
    "key" : process.env.CELERY_TOKEN_T2, 
    "version" : 2
  });

  // Ping Celery for orders for a specific id
  celery.request("products/", function(err, body) { 
    if (err) {
    // If an error happened, log it just in case
      console.log(err);
      // Pass the error back to the caller
      if (typeof callback === 'function') {
        callback(err);
      }
      return;
    }
    // If there was no error
    else {
      // Create a filter on all the products returned
      async.filter(body.data, function iter(item, callback) {
        // If it doesn't have a name
        if (!item.name) {
          // Give it the axe
          callback(false);
          return;
        }
        // It's part of a Tessel + a module
        else if (item.name.indexOf('Tessel') !== -1) {
          // Axe it
          callback(false);
          return;
        }
        else {
          item.product_id = item._id;
          item.price_formatted = numeral(item.price / 100).format();
          item.id =  item.slug;
          // Otherwise, this is a legit module
          callback(true);
        }
      }, function done(results) {
        results.sort(function(a, b) {
          if (a.name > b.name) {
            return 1;
          }
          if (a.name < b.name) {
            return -1;
          }
          // a must be equal to b
          return 0;
        });

        results=results.concat(results.splice(results.indexOf('DIY'), 3))

        // The filtering is complete
        if (typeof callback === 'function') {
          // Return the valid modules
          callback(null, results);
        }
        return;
      });
    } 
  });
  
}

function updateOrder(orderID, modules, address, callback) {
    // Create a Celery connection to the Tessel 2 Celery account
  var celery = new Celery({
    "key" : process.env.CELERY_TOKEN_T2, 
    "version" : 2
  });
  var orderDetails;
  //Get origonal order body
  celery.request("/orders/"+ orderID, function(err, body){
    if(err || (body.meta.code && body.meta.code !== 200)){
      callback(err || body.meta.error.message);
    }
    orderDetails = body.data;
    // Add the modules to the order
    if (modules.length) {
      orderDetails.line_items = orderDetails.line_items.concat(modules);  
    }

    // update address
    orderDetails.shipping_address = address;
    // Make a request to update the order
    celery.request({
      'method' : 'PUT',
      'url': 'orders/' + orderID.toString(),
      'body': orderDetails},
      function(err, body) {
        if (typeof callback === 'function') {
          if (body.meta.code !== 200) {
            callback(new Error("Uh oh! Something went wrong:" + body.meta.error.message));
          } else {
            // Call the callback
            callback(err);
          }
        }
    });

  });
}

module.exports.getExistingOrderDetails = getExistingOrderDetails;
module.exports.getAvailableModules = getAvailableModules;
module.exports.updateOrder = updateOrder;