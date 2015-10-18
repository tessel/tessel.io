var App = function(){};

App.prototype.init =function(){
  var self = this;
  // Set formatting rules for currency
  numeral.defaultFormat('$0,0.00');

  // Get all the moving pieces.
  self.subtotal = 0;
  self.subtotal_el = $('.js-subtotal');

  self.modules = [];
  self.orderId = $('#id-holder').attr('data-order');
  self.updated = false;
  var moduleTable = $('.js-module-table');
  moduleTable.children().each(function(index){
    var row = $(this);
    var data = row.data();
    if(Object.keys(data).length > 1){
      data.input = row.find('input').first();
      data.unitTotal = data.input.val() * data.price;
      data.unitTotal_el = row.find('.js-unit-total');
      data.unitTotal_el.text(self.currency(data.unitTotal));
      data.input.on('change', function(){
        self.calculate();
        self.updateView();
      });
      self.modules.push(data);
    }
  });
  self.shipping_form = $('.js-shipping-form');
  $('.js-submit').on('click', function(){
    self.updateOrder();
  });
};

App.prototype.calculate = function(event) {
  var self = this;
  var total = 0;
  self.modules.forEach(function(module){
    var value = module.input.val() || 0;
    module.unitTotal = module.price * value;
    total += module.unitTotal;
  })
  self.subtotal = total;
  return;
};

App.prototype.updateView = function(first_argument) {
  var self = this;
  self.subtotal_el.text(self.currency(self.subtotal));
  self.modules.forEach(function(module){
    module.unitTotal_el.text(self.currency(module.unitTotal));
  });
};

App.prototype.currency = function(number) {
  number = number || 0;
  return numeral(number/100).format();
};

App.prototype.updateOrder = function(){
  var self = this;
  if (!self.updated) {

    var module_info = self.modules.reduce(function(aggregator, module){
      // If some quantity of modules was selected
      if (parseInt(module.input.val()) > 0) {
        // Push this module data into the aggregator
        aggregator.push({
          id: module.id,
          product_id: module.productId,
          quantity: module.input.val(),
        });

      }
      return aggregator;
    }, []);

    // Send back the shipping address and module info
    var data = {shippingInfo: self.getShippingInfo(), modules: module_info, orderId: self.orderId }
    $.post('/t2-update-order',data, function(data){
      var email = JSON.parse(data).email;
      $('#update-container').remove();
      $('body').prepend('<h1 id="success-banner">&nbsp;&nbsp;Success</h1>');
      $('#success-banner').append('<h3>&nbsp;&nbsp;&nbsp;&nbsp;Your response has been saved.</h3>');
      $('#success-banner').append('<h3>&nbsp;&nbsp;&nbsp;&nbsp;Find your order details <a href="https://dashboard.trycelery.com/status?number=' + self.orderId + '&email=' + email +'">here</a>.</h3>');
    })
    .fail(function(xhr) {
      $('#update-container').remove();
      $('body').prepend('<h1 style="color: #ff0000">Error</h1><h3>Oh no! We couldn\'t save your response for some reason. Status Code: ' + xhr.status + '</h3><h3>Email <a href="mailto:support@technical.io">support@technical.io</a> for assistance.</h3>');
    });

    self.updated = true;
  }
};

App.prototype.getShippingInfo = function(){
  var self = this;
  var form_kv_array = self.shipping_form.serializeArray();
  var shipping_info = form_kv_array.reduce(function(aggregator, kv){
    aggregator[kv.name] = kv.value;
    return aggregator;
  }, {});
  return shipping_info;
};

$(document).ready(function(){
  var app = new App();
  app.init();
});
