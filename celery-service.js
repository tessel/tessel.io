var request = require("request");
var dotty = require("dotty");
var defaults = require("lodash.defaults");

var Celery = function(config){
  this.config = this.setConfig(config);
  this.options = null;
  this.cache = {};
};

Celery.prototype.request = function(options, callback) {
  var now = new Date();
  var self = this;
  options = self.setOptions(options);
  if(self.config.caching){
    if(dotty.exists(self.cache, options.url)){
      var cache = self.cache[options.url];
      if(self.cache[options.url].date - now < self.options.cacheLength){
        return callback(cache.error, cache.response, cache.body);
      }
      self.cache[options.url] = now;
    }
    self.cache[options.url] = {
      date: now
    };
  }
  request(options, function(error,response,body) {
    if(self.config.caching){
      self.cache[options.url] = {
        error: error,
        response: response,
        body: body
      }
    }

    if (error) {
      return callback(error, response, body);
    }

    if (response && dotty.exists(response, "statusCode")) {
      return callback(false, response, body);
    }

    return callback("no response status code", response, body);
  });
};

Celery.prototype.setConfig = function(config) {
  if(typeof(config) === "string"){
    this.config = {
        "key":config
    };
  }else if(typeof(config) == "undefined"){
    this.config = {};
  }

  this.config = defaults(config,{
    "baseurl": 'https://api.trycelery.com',
    "version": 2,
  });

  return this.config;
};



Celery.prototype.setOptions = function(options) {
  if (typeof(options) === "string"){
    options = {
        "url":options
    };
  }
  else if(typeof(options) == "undefined"){
    options = {};
  }

  if(dotty.exists(options,"url")){
    // Trim trailing slash if included
    options.url = (options.url.match(/^\//)) ? options.url.substring(1,options.url.length) : options.url;
    // Create api url out of version and options url
    options.url = this.config.baseurl + "/v" + this.config.version + "/"  + options.url;
  }

  this.options = defaults(options,{
    "caching": false,
    "cacheLength": 36000,
    "url": this.config.baseurl + "/v" + this.config.version + "/",
    "method": "GET",
    "json" : true,
    "headers":{
        "Content-Type": "application/json",
        "Authorization" : this.config.key
    },
  });
  return this.options;
};

module.exports = Celery;
