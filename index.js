/**
 * Module dependencies.
 */

var express = require('express'),
  routes = require('./routes'),
  http = require('http'),
  path = require('path'),
  fs = require('fs'),
  request = require('request'),
  uri = require('url'),
  marked = require('marked'),
  jade = require('jade'),
  hl = require('highlight.js'),
  https = require('https'),
  _ = require('lodash'),
  moduleSelection = require('./module-selection.js'),
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

app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'build/public')));
app.use(express.favicon('public/favicon.ico'));

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
  request('https://raw.githubusercontent.com/tessel/hardware-modules/master/modules.json', function (error, response, body) {
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
  res.redirect('http://start.tessel.io');
});

app.get('/t2-start', function(req, res) {
  res.redirect('http://tessel.github.io/t2-start/');
});

app.get('/install', function(req, res) {
  res.redirect('http://start.tessel.io');
});

app.get('/docs', function(req, res) {
  res.redirect('/docs/home');
});

app.get('/shop', function(req, res) {
  res.redirect('https://shop.tessel.io');
});

app.get('/store', function(req, res) {
  res.redirect('https://shop.tessel.io');
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

// Pull the docs from GitHub
var rawDocs = {
  home: {
    type: 'API',
    clean: "Tessel 2 Docs",
    url: 'https://raw.githubusercontent.com/tessel/t2-docs/master/README.md',
    text: '',
    updated: null,
    newLink: '/docs/home'
  },
  hardwareAPI: {
    type: 'API',
    clean: "Hardware API",
    url: 'https://raw.githubusercontent.com/tessel/t2-docs/master/hardware-api.md',
    text: '',
    updated: null,
    newlink: '/docs/hardwareAPI'
  },
  modules: {
    type: 'API',
    clean: "Modules",
    url: 'https://raw.githubusercontent.com/tessel/t2-docs/master/modules.md',
    text: '',
    updated: null,
    newLink: '/docs/modules'
  },
  cli: {
    type: 'API',
    clean: "Tessel 2 CLI",
    url: 'https://raw.githubusercontent.com/tessel/t2-docs/master/cli.md',
    text: '',
    updated: null,
    newlink: '/docs/cli'
  },
  languages: {
    type: 'API',
    clean: "Supported Languages",
    url: 'https://raw.githubusercontent.com/tessel/t2-docs/master/languages.md',
    text: '',
    updated: null,
    newLink: '/docs/compatibility'
  },
  source: {
    type: 'API',
    clean: "Source & Design Files",
    url: 'https://raw.githubusercontent.com/tessel/t2-docs/master/repos.md',
    text: '',
    updated: null,
    newLink: '/docs/source'
  },
  accelerometer: {
    type: 'module',
    clean: "Accelerometer",
    url: 'https://raw.githubusercontent.com/tessel/accel-mma84/master/README.md',
    text: '',
    updated: null,
    newlink: ''
  },
  ambient: {
    type: 'module',
    clean: "Ambient",
    url: 'https://raw.githubusercontent.com/tessel/ambient-attx4/master/README.md',
    text: '',
    updated: null,
    newlink: ''
  },
  climate: {
    type: 'module',
    clean: "Climate",
    url: 'https://raw.githubusercontent.com/tessel/climate-si7020/master/README.md',
    text: '',
    updated: null,
    newlink: ''
  },
  gps: {
    type: 'module',
    clean: "GPS",
    url: 'https://raw.githubusercontent.com/tessel/gps-a2235h/master/README.md',
    text: '',
    updated: null,
    newlink: ''
  },
  infrared: {
    type: 'module',
    clean: "Infrared",
    url: 'https://raw.githubusercontent.com/tessel/ir-attx4/master/README.md',
    text: '',
    updated: null,
    newlink: ''
  },
  relay: {
    type: 'module',
    clean: "Relay",
    url: 'https://raw.githubusercontent.com/tessel/relay-mono/master/README.md',
    text: '',
    updated: null,
    newlink: ''
  },
  rfid: {
    type: 'module',
    clean: "RFID",
    url: 'https://raw.githubusercontent.com/tessel/rfid-pn532/master/README.md',
    text: '',
    updated: null,
    newlink: ''
  },
  servo: {
    type: 'module',
    clean: "Servo",
    url: 'https://raw.githubusercontent.com/tessel/servo-pca9685/master/README.md',
    text: '',
    updated: null,
    newlink: ''
  },

  communicationProtocols: {
    type: 'tutorials',
    clean: 'Communication Protocols',
    url: 'https://raw.githubusercontent.com/tessel/docs/master/tutorials/communication-protocols.md',
    text: '',
    updated: null,
    newlink: '/docs/communicationProtocols'
  },
  DIYModule: {
    type: 'tutorials',
    clean: 'Making a DIY Module',
    url: 'https://raw.githubusercontent.com/tessel/docs/master/tutorials/diy_module_creation.md',
    text: '',
    updated: null,
    newlink: '/docs/DIYModule'
  },
  multiModule: {
    type: 'tutorials',
    clean: "Multiple Modules",
    url: 'https://raw.githubusercontent.com/tessel/docs/master/tutorials/multi-module.md',
    text: '',
    updated: null,
    newlink: '/docs/multiModule'
  },
  untethered: {
    type: 'tutorials',
    clean: "Untethering Tessel",
    url: 'https://raw.githubusercontent.com/tessel/docs/master/tutorials/untethered.md',
    text: '',
    updated: null,
    newlink: '/docs/untethered'
  }
};

var sideBarLists = {
  'API': [],
  'tutorials': [],
  'module': []
};
Object.keys(rawDocs).forEach(function(item) {
  var doc = rawDocs[item];
  if (sideBarLists[doc.type])
    sideBarLists[doc.type].push({
      link: item,
      clean: doc.clean
    });
});

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

var renderer = new marked.Renderer();
var headingList = [];

renderer.heading = function(text, level) {
  var escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
  var link = "";
  var divClass = "";
  if (level <= 2) {
    if (level == 2) {
      headingList.push({
        link: escapedText,
        text: text
      });
    }
    link = '<i class="fa fa-link fa-1"></i>';
    divClass = 'class="heading-div"';
  }
  return '<div ' + divClass + '><a name="' + escapedText + '" class="docHeader-' + level + '" href="#' +
    escapedText + '"><span>' + link + '</span></a><h' + level + ' class="cliHeader">' + text + '</h' + level + '></div>';
};

renderer.list = function(body, ordered) {
  if (ordered) {
    return '<ol class="list-div">' + body + '</ol>';
  } else {
    return '<ul class="list-div">' + body + '</ul>';
  }
};

renderer.code = function(code, lang) {
  if (lang == 'js') {
    return '<pre><code class="lang-js"><div style="line-height:1.1em;">' + require('highlight.js').highlightAuto(code).value + '</div></code></pre>';
  } else {
    return '<code><cli>' + code + '</cli></code>';
  }
};

app.get('/docs/:slug', function(req, res) {
  var doc = req.params.slug;
  if (!rawDocs[doc]) {
    return res.status(404).send("Sorry page not found");
  }
  var forkPath = uri.parse(rawDocs[doc].url).pathname.split('/');
  var forkUrl = '//github.com/' + forkPath[1] + '/' + forkPath[2];
  // update on anything older than 1 hour
  var d = new Date((new Date()) * 1 - 1000 * 3600 * 1);
  // if any urls have blank code, request it
  if ((rawDocs[doc].text === '' && rawDocs[doc].url) || (rawDocs[doc].updated < d.valueOf())) {
    request.get(rawDocs[doc].url, function(err, data) {
      if (err) {
        return console.error('could not get', doc, rawDocs[doc].text, err);
      }
      // Turn markdown into html
      headingList = [];
      var text = marked(data.body, {
        renderer: renderer
      });
      rawDocs[doc].heading = headingList;
      // Replace internal links referring gh docs with links referring to imported docs
      var myURL = rawDocs[doc].url.replace('/raw.githubusercontent.com/', '/github.com/').replace('/master/', '/blob/master/');
      text = replaceAll(myURL, rawDocs[doc].newlink, text);

      rawDocs[doc].text = text;
      rawDocs[doc].updated = Date.now();
      // console.log('doc', doc, headingList);
      res.render('doc', {
        navbar: indexdata.navbar,
        link: forkUrl,
        sideBar: sideBarLists,
        expandedSide: rawDocs[doc].heading,
        title: doc,
        text: rawDocs[doc].text
      });
    });
  } else {
    res.render('doc', {
      navbar: indexdata.navbar,
      link: forkUrl,
      sideBar: sideBarLists,
      expandedSide: rawDocs[doc].heading,
      title: doc,
      text: rawDocs[doc].text
    });
  }

});

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
})

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
})

// TODO: Delete after shipping T2
app.get('/t2_finalize_order/:order_id_hash', function(req, res) {
  var hashed_id = req.params.order_id_hash;
  var order_id = hashids.decode(hashed_id);
  moduleSelection.getExistingOrderDetails(order_id, function(err, order) {
    if (err) {
      res.end(err);
    }
    else {
      console.log('the order', order);
      moduleSelection.getAvailableModules(function(err, modules) {
        if (err) {
          res.end(err);
        }
        else {
          var shippingInfo = order.shipping_address;
          for (var prop in shippingInfo) {
            if (shippingInfo[prop] === null) {
              shippingInfo[prop] = '';
            }
          }

          var countries = require(__dirname + '/countries.json');
          res.render('finalize_order.jade', {
            order: order,
            shippingInfo: shippingInfo,
            modules: modules,
            countries: countries
          });
        }
      });
    }
  });
});

// TODO: Delete after shipping T2
app.post('/t2-update-order', function(req, res){
  if (!req.body.orderId) {
    res.send(400, "Invalid Response. Must include order id.");
    return;
  }
  else if (!req.body.shippingInfo) {
    res.send(400, "Invalid response. Must include shipping address.");
    return
  }
  else {

    // If no modules were sent, assume empty array
    if (!req.body.modules) {
      req.body.modules = [];
    }

    // Update the order
    moduleSelection.updateOrder(req.body.orderId, req.body.modules, req.body.shippingInfo, function(err) {
      // Something didn't work properly
      if (err) {
        console.error('ERROR UPDATING ORDER', req.body.orderId, err);
        res.send(400, 'Error updating order.');
      }
      // Everything worked
      else {

        moduleSelection.getExistingOrderDetails(req.body.orderId, function(err, order) {
          if (err) {
            console.error('ERROR UPDATING ORDER AFTER FETCH', err);
            res.send(400, 'Error updating order.');
          }
          else {
            res.send(200, JSON.stringify({email:order.buyer.email}));
          }
        });
      }
    })
  }
});

app.locals.ucfirst = function(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
};

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
