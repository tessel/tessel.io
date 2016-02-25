window.malarkey = require('malarkey');
var Promise = require('bluebird');
var Typist = function(){
  this.options = {
    speed: 40,
    loop: false,
    pauseDelay: 1250,
    postfix: ''
  };
  this.tessel_el = null;
  this.npm_install_el = null;
  this.module_el = null;
  this.tessel_run_el = null;
  this.tessel_wifi_el = null;
  this.angle_el = null;
  this.angle_el_2 = null;
  this.angle_el_3 = null;
  this.init();
}

Typist.prototype.init = function() {
  // Find all the elements
  this.tessel_el = document.querySelectorAll('.js-npm-install-tessel')[0];
  this.npm_install_el = document.querySelectorAll('.js-npm-install')[0];
  this.module_el = document.querySelectorAll('.js-npm-install-module')[0];
  this.tessel_run_el = document.querySelectorAll('.js-tessel-run')[0];
  this.tessel_wifi_el = document.querySelectorAll('.js-tessel-wifi')[0];
  this.angle_el = document.querySelectorAll('.js-angle')[0];
  this.angle_el_2 = document.querySelectorAll('.js-angle-2')[0];
  this.angle_el_3 = document.querySelectorAll('.js-angle-3')[0];
  // Clear default text
  this.clear();
  // init all the typists
  this.tessel_typist = malarkey(this.tessel_el, this.options);
  this.npm_install_typist = malarkey(this.npm_install_el, this.options);
  this.module_typist = malarkey(this.module_el, this.options);
  this.tessel_run_typist = malarkey(this.tessel_run_el, this.options);
  this.tessel_wifi_typist = malarkey(this.tessel_wifi_el, this.options);
};

Typist.prototype.clear = function() {
  // Disable adaption for auto typing on JavaScript disabled browsers.
  // Clear the loaded content
  this.tessel_el.innerHTML = "";
  this.npm_install_el.innerHTML = "";
  this.module_el.innerHTML = "";
  this.tessel_run_el.innerHTML = "";
  this.tessel_wifi_el.innerHTML = ""
  // Enable cursor blink
  this.tessel_el.classList.remove("disabled");
  // Disable cursor blink
  this.tessel_wifi_el.classList.add("disabled");
  this.tessel_run_el.classList.add("disabled");
}

Typist.prototype.run_tessel_typist = function() {
  var self = this;
  return function(){
    return new Promise(function(resolve, reject){
      self.tessel_typist
          .type('npm install t2-cli -g').pause()
          .call(function() {
            // Propagate cursor styling
            self.tessel_el.classList.add("disabled");
            self.npm_install_el.classList.remove("disabled");
            self.angle_el.classList.remove("hide");
            resolve();
          });
    });
  };
};

Typist.prototype.run_npm_install_typist = function(){
  var self = this;
  return function(){
    return new Promise(function(resolve, reject){
      self.npm_install_typist
          .pause()
          .type('npm install ')
          .call(function() {
            // Propagate cursor styling
            self.npm_install_el.classList.add("disabled");
            self.module_el.classList.remove("disabled");
            resolve();
          });
    });
  }
};

Typist.prototype.run_module_typist = function(){
  var self = this;
  return function(){
    return new Promise(function(resolve, reject){
      self.module_typist
          // .type('accel-mma84').pause().delete(11)
          // .type('ambient-attx4').pause().delete(13)
          // .type('relay-mono').pause().delete(10)
          .type('ambient-attx4')
          // .type('ir-attx4').pause().delete(8)
          // .type('servo-pca9685').pause().delete(13)
          // .type('rfid-pn532').pause().delete(10)
          // .type('ble-usb').pause().delete(7)
          // .type('ble-gprs').pause().delete(8)
          // .type('gps-').pause().delete(7)
          // .type('camera-usb').pause().delete(10)
          // .type('microsd-usb').pause().delete(11)
          // .type('audio-usb').pause().delete(9)
          // .type('your-awesome-driver').pause(2400)
          .call(function() {
            // Remove cursor
            self.module_el.classList.add("disabled");
            self.angle_el_3.classList.remove("hide");
            self.tessel_wifi_el.classList.remove("disabled");
            resolve();
          });

    });
  };
}


Typist.prototype.run_wifi_typist = function(){
  var self = this;
  return function(){
    return new Promise(function(resolve, reject){
      self.tessel_wifi_typist
          .type('t2 wifi -n [ssid] -p [password]')
          .pause()
          .call(function() {
            // Remove cursor
            self.tessel_wifi_el.classList.add("disabled");
            resolve();
          });
    });
  };
}

Typist.prototype.get_tessel_run_text = function(){
  // swap with rs or py code depending on which tab is rendered
  var activeType = $('.js-run.active').attr('code').split('-')[1];
  var typistText = "t2 run ambient."+activeType;

  if (activeType == "rs") {
    typistText = "t2 run .";
  }

  return typistText;
}

Typist.prototype.run_tessel_run_typist = function(){
  var self = this;
  return function(){
    return new Promise(function(resolve, reject){
      self.tessel_run_el.classList.remove("disabled");
      self.tessel_run_typist
          .type(self.get_tessel_run_text()).pause()
          .call(function(){
            self.tessel_run_el.classList.add("disabled");
            // self.angle_el_2.classList.remove("hide");
            // self.angle_el_2.classList.remove("disabled");
            resolve();
          });
    });
  };
};

module.exports = Typist;
