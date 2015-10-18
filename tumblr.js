var Promise = require('bluebird');
var request = require('request');
var _ = require('lodash');

var api_key = process.env.TUMBLR_APIKEY;
var root = "http://api.tumblr.com/v2/blog/tesselproject.tumblr.com";

function promisereq (opts) {
  return new Promise(function (resolve, reject) {
    request(opts, function (err, req, body) {
      if (err || req.statusCode != 200) {
        reject(err || req.statusCode);
      } else {
        resolve(body);
      }
    });
  });
}

function getPosts () {
  return getPosts.singleton || (getPosts.singleton = promisereq({
    url: root + '/posts',
    qs: {
      "api_key": api_key,
    },
    json: true,
  })
  .then(function (body) {
    return body.response.total_posts
  })
  .then(function (total) {
    var pages = Math.ceil(total / 20);
    return Promise.map(_.range(pages), function (page) {
      return promisereq({
        url: root + '/posts',
        qs: {
          "api_key": api_key,
          "offset": page*20,
        },
        json: true,
      })
      .then(function (body) {
        return body.response.posts;
      })
    }, {concurrency: 6})
    .then(function (posts) {
      return _.sortBy(_.flatten(posts, true), function (post) {
        return post.timestamp;
      }).reverse();
    });
  }));
}

exports.getPosts = getPosts;
