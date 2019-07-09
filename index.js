/**
 * Module dependencies.
 */

var express = require('express'),
  routes = require('./routes'),
  http = require('http'),
  path = require('path'),
  request = require('request'),
  uri = require('url'),
  marked = require('marked'),
  jade = require('jade'),
  hl = require('highlight.js'),
  https = require('https'),
  _ = require('lodash'),
  Hashids = require('hashids'),
  hashids = new Hashids(process.env.URL_HASH_KEY)
  ;

express.static.mime.define({
  'text/plain': ['sh', 'ps1']
});

jade.filters.highlight = function (str) {
  hl.configure({
    tabReplace: '  ',
  })

  str = '<div class="javascript">' + hl.highlightAuto(str.replace(/\s*$/, '')).value + '</div>';
  // adds more optional breakpoints for mobile
  str = str.replace(/([(|)|{|}|\.])/g, '$1<wbr>');

  return str;
};

var app = express();

// all environments
app.set('port', process.env.PORT || 5000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.engine('html', require('ejs').renderFile);

app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.compress());

// Tumblr redirecting
app.use(function (req, res, next) {
  var host = req.headers['host'];
  console.log('CHECKING REDIRECT', host, req.url)
  if (host == 'blog.technical.io') {
    return res.redirect('https://tessel.io' + req.url.replace(/^\/post\//, '/blog/'));
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'build/public')));
app.use(express.favicon('public/favicon.ico'));
app.use(app.router);

app.locals.encoder = new require('node-html-encoder').Encoder('entity');

if ('development' == app.get('env')) {
  // development-only
  app.use(express.errorHandler());
  app.locals.pretty = true;
}

// Setup cached celery service for pre-order query
var celeryConfig = {
  baseurl: process.env.CELERY_URL,
  version: 2,
  key: process.env.CELERY_TOKEN,
  caching: true,
  cachLength: 30 * 60 * 1000 // Half hour
};

if(process.env.NODE_ENV == 'development'){
  celeryConfig = {
      baseurl: process.env.TEST_CELERY_URL,
      version: 2,
      key: process.env.TEST_CELERY_TOKEN,
      caching: true,
      cacheLength: 5 * 60 * 1000 // five minutes
    };
    userID = process.env.TEST_CELERY_ID;
}

var Celery = require('./celery-service');
var celery = new Celery(celeryConfig);

var indexdata = require('./data.json');
var faqs = require('./faq.json');


app.get('/', function(req, res) {

  res.render('index', {
    title: 'Tessel 2',
    reg: req.query.reg,
    email: req.query.email,
    navbar: indexdata.navbar,
    header: indexdata.header,
    modules: indexdata.modules,
    community_modules: indexdata.community_modules,
    testimonials: indexdata.testimonials,
    partners: indexdata.partners,
    faqs: faqs,
    isproduction: process.env.NODE_ENV == 'production',
  });
});

// Test order number:
app.get('/thanks', function(req, res) {
  // Gather the order number and the email
  var orderNum = req.query.number;
  var confirmationEmail = req.query.email;

  // If the order number or email don't exist
  if (!orderNum || !confirmationEmail) {
    // Something went wrong
    console.error(new Date(), "Invalid order number and or email address on confirmation page. OrderNum:", orderNum, "Confirmation Email:", confirmationEmail);
    res.render('error', {
      navbar: indexdata.navbar,
    });
    return
  }

  // Request data on the Celery order
  celery.request('orders?number='+orderNum, function(error, response, body){

    if (error) {
      console.error(error, ordernumber)
    }

    var emailOnOrder = body.data.length ? body.data[0].buyer.email : null;

    // If the confirmation email and order email differ
    if (emailOnOrder != confirmationEmail) {
      // Something went wrong
      console.error(new Date(), "Confirmation Email doesn't match order. Confirmation Email:", confirmationEmail, "Order Email:", emailOnOrder);
      res.render('error', {
        navbar: indexdata.navbar,
      });
    return
    }

    var orderid = body.data.length ? body.data[0]._id : null;
    var url = process.env.NODE_ENV == 'development' ? "https://dashboard-sandbox.trycelery.com/" : "https://dashboard.trycelery.com/";
    var managementLink = url + "status?number=" + orderNum
                              + "&email=" + emailOnOrder;
    var orderlink = url + 'orders/' + orderid;
    console.log(emailOnOrder, orderid, orderlink, managementLink);
    res.render('thanks', {
      navbar: indexdata.navbar,
      title: 'Thanks | Tessel',
      ordernumber: orderNum,
      orderlink: orderlink,
      managementLink: managementLink,
      email: emailOnOrder
    });
  });
});

app.post('/launch_confirmation', function(req, res) {
  // Keys to data returned from Google Form
  var useArrKey = 'entry.956889617';
  var useTextKey = 'entry.1866908001';
  var emailKey = 'entry.1689662361';

  var uses = req.body[useArrKey];
  // Single items are strings... thanks Google Forms
  if (typeof uses === "string") uses = Array(uses);

  // Request options for forwarding on to Google Docs
  var googleDocOptions = {
    host: 'docs.google.com',
    path: '/forms/d/19Hq5eNQ8OZySUxlsZzSINZ1rwwf44kCdjL7vGKkksmc/formResponse',
    port: 443,
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
  };

  // Create a request with the above options
  var googleReq = https.request(googleDocOptions);
  // Encode the body data as a url query
  var encodedBody = require('urlcode-json').encode(req.body)
  // Write the data to the request
  googleReq.write(encodedBody);

  // Close our requests
  googleReq.end('OK', 200);
  res.redirect('/');
});

app.get('/about', function(req, res) {
  res.render('about', {
    navbar: indexdata.navbar,
    title: 'About us | Tessel'
  });
});

app.get('/press', function(req, res) {
  res.render('press', {
    navbar: indexdata.navbar,
    title: 'Press | Tessel'
  });
});

app.get('/modules', function(req, res) {
  // Request module data
  request('https://raw.githubusercontent.com/tessel/tessel.io/master/modules.json', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      // Parse as JSON
      var moduleData = JSON.parse(body);
      console.log(moduleData);
      // Render
      res.render('modules', {
        navbar: indexdata.navbar,
        title: 'Modules | Tessel',
        moduleData: moduleData
      });
    }
    else {
      console.log(err);
      res.send(400);
    }
  });
});

app.get('/status', function(req, res) {
  res.render('status', {
    navbar: indexdata.navbar,
    title: 'Status | Tessel'
  });
});

app.get('/opensource', function(req, res) {
  res.render('opensource', {
    navbar: indexdata.navbar,
    title: 'Open Source | Tessel'
  });
});

app.get('/start', function(req, res) {
  res.redirect('http://tessel.github.io/t2-start/');
});

app.get('/t1-start', function(req, res) {
  res.redirect('http://start.tessel.io');
});

app.get('/t2-start', function(req, res) {
  res.redirect('http://tessel.github.io/t2-start/');
});

app.get('/install', function(req, res) {
  res.redirect('http://start.tessel.io');
});

app.get('/shop', function(req, res) {
  res.redirect('http://www.seeedstudio.com/depot/Tessel-m-153.html');
});

app.get('/store', function(req, res) {
  res.redirect('http://www.seeedstudio.com/depot/Tessel-m-153.html');
});

app.get('/projects', function(req, res) {
  res.redirect('http://tessel.hackster.io');
});

app.get('/forums', function(req, res) {
  res.redirect('https://forums.tessel.io');
});

app.get('/resellers', function(req, res) {
  res.render('resellers', {
    navbar: indexdata.navbar,
    title: 'Resellers | Tessel'
  });
});

app.get('/community', function(req, res) {
  res.render('community', {
    navbar: indexdata.navbar,
    title: 'Community | Tessel'
  });
});

app.get('/diy', function(req, res) {
  res.redirect('/docs/DIYModule');
});

app.get('/slack', function(req, res) {
  res.redirect('https://tessel-slack.herokuapp.com/');
});

// All the docs redirects
var gitbooksBase = 'https://tessel.gitbooks.io/t2-docs/content/';

app.get('/docs', function(req, res) {
  res.redirect(gitbooksBase);
});

//********* Begin legacy redirects for docs *********//
// These legacy link redirects keep links posted around the internet functional with new Gitbooks version of docs

var originalBase = '/docs/';

app.get(originalBase + 'home', function (req, res) {
  res.redirect(gitbooksBase);
});

app.get(originalBase + 'hardwareAPI', function (req, res) {
  res.redirect(gitbooksBase + 'API/Hardware_API.html');
});

app.get(originalBase + 'networkAPI', function (req, res) {
  res.redirect(gitbooksBase + 'API/Network_API.html');
});

app.get(originalBase + 'modules', function (req, res) {
  res.redirect(gitbooksBase + 'API/Modules.html');
});

app.get(originalBase + 'cli', function (req, res) {
  res.redirect(gitbooksBase + 'API/CLI.html');
});

app.get(originalBase + 'compatibility', function (req, res) {
  res.redirect(gitbooksBase + 'API/Languages.html');
});

app.get(originalBase + 'communicationProtocols', function (req, res) {
  res.redirect(gitbooksBase + 'Tutorials/Communication_Protocols.html');
});

app.get(originalBase + 'DIYModule', function (req, res) {
  res.redirect(gitbooksBase + 'Tutorials/Making_Your_Own_Module.html');
});

// Even weirder legacy redirects to places that aren't found in the gitbook version of T2 docs
app.get(originalBase + 'source', function (req, res) {
  res.redirect('/opensource.html');
});

app.get(originalBase + 'accelerometer', function (req, res) {
  res.redirect(gitbooksBase + 'API/Modules.html');
});

app.get(originalBase + 'ambient', function (req, res) {
  res.redirect(gitbooksBase + 'API/Modules.html');
});

app.get(originalBase + 'climate', function (req, res) {
  res.redirect(gitbooksBase + 'API/Modules.html');
});

app.get(originalBase + 'gps', function (req, res) {
  res.redirect(gitbooksBase + 'API/Modules.html');
});

app.get(originalBase + 'infrared', function (req, res) {
  res.redirect(gitbooksBase + 'API/Modules.html');
});

app.get(originalBase + 'relay', function (req, res) {
  res.redirect(gitbooksBase + 'API/Modules.html');
});

app.get(originalBase + 'rfid', function (req, res) {
  res.redirect(gitbooksBase + 'API/Modules.html');
});

app.get(originalBase + 'servo', function (req, res) {
  res.redirect(gitbooksBase + 'API/Modules.html');
});

//********* End legacy redirects for docs *********//

app.get('/forums', function(req, res) {
  res.redirect('http://forums.tessel.io');
});

app.get('/blog/?', function (req, res) {
  require('./tumblr').getPosts()
  .then(function (posts) {
    res.render('blog', {
      title: 'Tessel Blog',
      postsbymonth: _.groupBy(posts, function (post) {
        var d = new Date(post.timestamp*1000);
        return d.toLocaleString('en-US', { month: "long", year: 'numeric' });
      }),
      posts: posts,
      page: (parseInt(req.query.page || '1') || 1) - 1,
      pagelength: 5,
      navbar: indexdata.navbar,
      header: indexdata.header,
    });
  });
});

app.get('/blog/:postid/:slug?', function (req, res) {
  require('./tumblr').getPosts()
  .then(function (posts) {
    var onepost = posts.filter(function (post) {
      return post.id == req.params.postid;
    })[0];
    res.render('blog', {
      title: (onepost ? onepost.title + ' | ' : '') + 'Tessel Blog',
      postsbymonth: _.groupBy(posts, function (post) {
        var d = new Date(post.timestamp*1000);
        return d.toLocaleString('en-US', { month: "long", year: 'numeric' });
      }),
      posts: posts,
      onepost: onepost,
      pagelength: 5,
      navbar: indexdata.navbar,
      header: indexdata.header,
    });
  });
});

// 404 route
app.get('*', function(req, res){
  res.render('error', {
    navbar: indexdata.navbar,
    title: 'Page not found | Tessel'
  });
});

app.locals.ucfirst = function(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
};

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
