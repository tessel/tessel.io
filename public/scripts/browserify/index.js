var once = require('lodash.once')
var fastdom = require('fastdom');

var Graph = require('./graph.js');

var scrolling = require('./scrolling.js');
var carousels = require('./carousels.js');

var gifURL = 'https://s3.amazonaws.com/technicalmachine-assets/launch/gifs/';

var gifQueue = [
  gifURL + 'Neopixels.mp4',
  gifURL + 'Sign.mp4',
  gifURL + 'Servos.mp4'
];

var clapOff = true;

var calloutLocations = {
  'module-port': [{left: 275, top: 80}, {left: 275, top: 205}],
  'usb-port': [{left: 167, top: 250}],
  'wifi': [{left: 115, top: 15}, {left: 35, top: 40}],
  'ethernet': [{left: 75, top: 240}],
  'micro-usb': [{left: 220, top: 275}],
  'mediatek': [{left:138, top:120}],
  'ram-flash': [{left:70, top:125}],
  'atmel': [{left:218, top:78}],
}

var isSmall = false; 

function fadecarousel (images) {
  var delay = 5000;
  var duration = 1000;

  var i = images.length - 1;
  ;(function next () {
    if (i == images.length - 1) {
      images.slice(0, -1).css('opacity', 1);
    }

    images.css('pointer-events', 'none');

    if (i == 0) {
      images.eq(0).css('pointer-events', 'auto');
      images.eq(images.length - 1)
      .transition({
        opacity: 0,
        duration: delay,
      })
      .transition({
        opacity: 1,
        duration: duration,
      }, next)
    } else {
      images.eq(i).css('pointer-events', 'auto');
      images.eq(i)
      .transition({
        opacity: 1,
        duration: delay,
      })
      .transition({
        opacity: 0,
        duration: duration,
      }, next);
    }

    i = i == 0 ? images.length - 1 : i - 1;
  })();
}

function repeatFn (count, strfn) {
  var arr = [];
  for (var i = 0; i < count; i++) {
    arr.push(strfn(i))
  }
  return arr.join('');
}

function smallCheck (){
  var display = $('#js-is-small').css('display');
  if (display == "none") {
    return true;
  }

  return false;
}

/*
// Facebook Pixel
window._fbq.push(['track', "ViewPage", {
  referrer: document.referrer,
  userAgent: navigator.userAgent,
  language: navigator.language,
}]);

$(function () {
  // Facebook pixel.
  $('[data-celery]').on('click', function () {
    window._fbq.push(['track', "AddToCart", {}]);
  });
});
*/

$(function ($) {
  isSmall = smallCheck();

  // Initialize typist
  if (!isSmall) {
    var Typist = require('./auto-typing.js');
    var typist = new Typist();
  }
  // Initialize graph
  var graph = new Graph();

  // Install carousels.
  carousels.install();

  // Adds triggers.
  var boardmintop = 120;
  scrolling.trigger('preorder', '#js-animation-area', -58);
  scrolling.trigger('animationarea', '#js-animation-area', 0);
  scrolling.trigger('moduleecosystem', '#js-section-moduleecosystem', -140);
  scrolling.trigger('plugandplay', '#js-section-plugandplay', -140);
  scrolling.trigger('highlevel', '#js-section-highlevel', -230);
  scrolling.trigger('usbsupport', '#js-usbsupport', -230);
  // scrolling.trigger('optimize', '#optimize', -170);
  scrolling.trigger('testimonials', '.js-testimonials', -60);

  scrolling.trigger('end', '#js-animation-end', -300,
  function (delta) {
    $('#js-animation-target-one .js-animation-group')
    .detach()
    .appendTo('#js-animation-target-two');
    return;
  },
  function(){
    $('#js-animation-target-two .js-animation-group')
    .detach()
    .appendTo('#js-animation-target-one');
  });

  // scrolling.trigger('checkbox', "#optimize", -170, once(function(){

  //   function animate(ele, cb){
  //     $(ele.parent().find('.remove-square')[0]).animate({
  //       'opacity': "0"
  //     }, 800, "linear");

  //     ele.animate({
  //       'max-width': "25px",
  //       'opacity': "1"
  //     }, 800, "linear", function(){

  //       cb && cb();
  //     });
  //   }

  //   var checks = $('.js-check-me');
  //   (function iterate(index){
  //     if (index >= checks.length) return;

  //     animate($(checks[index]), function(){
  //       iterate(index+1);
  //     });
  //   })(0);
  // }));

  /*
  $(window).on('scroll-tick', function () {
    // Have to compute this manually for now :(
    if ($('body').is('.scroll-pass-end')) {
      $('.board').css('top', boardmintop - 40 + ($('.scaleup').offset().top - $('#js-animation-area').offset().top));
    } else {
      $('.board').removeAttr('style');
    }
  });
  */

  if (!isSmall) {
    scrolling.trigger('npminstall', '.js-npm-install-trigger', -80, once(function(){
      // TODO: This is horrible, fix it.
      typist.run_tessel_typist()()
      .then(typist.run_npm_install_typist())
      .then(typist.run_module_typist())
      .then(typist.run_wifi_typist());
    }));    
  }

  scrolling.trigger('npmrun', '.js-tessel-run-trigger', -200, once(function(){
    // TODO: This is horrible, fix it later.
    if (!isSmall) {
      typist.run_tessel_run_typist()()
      .then(function(){
        graph.simulate_data();
      });
    } else {
      graph.simulate_data();
    }
  }));

  scrolling.listen();

  // Fading header carousel

  fadecarousel($('#testimonials .testimonial'));

  // Camera

  $('#js-clap-on').on('click', function(){
    var self = $(this);
    if (self.hasClass('disabled')) return;

    var gifDisplay = $('#js-gif-display');
    // disable button
    self.addClass('disabled');
    // renable once video is done playing
    gifDisplay.on('ended',function(){
      self.removeClass('disabled');
      gifDisplay.hide();
      recordRing.hide();
      noRecordText.fadeIn("slow");

    });

    // store elements for performance
    var recordRing = $('.js-record-ring');
    var noRecordText = $('#js-no-record-text');

    // play next video
    recordRing.fadeIn("slow");
    gifDisplay.fadeIn("slow");
    noRecordText.hide();

    // swap url with another gif in queue
    var popped = gifQueue.splice(0, 1);
    gifQueue.push(popped);
    gifDisplay.attr("src", gifQueue[0]);

  });

  // Callouts

  $('.js-callout').on('mouseenter', function(){
    var board = $('#js-board');
    // em calc for media query.
    var windowsize_em = $(window).width() / 16;
    // Don't run this if it's not a large screen ( > 64em)
    if(board && windowsize_em > 64){
      var boardLoc = board.offset();
      // figure out which one it is
      var id = $(this).attr('id');
      var location = calloutLocations[id];
      var currPos = $(this).offset();
      currPos.top = currPos.top + 21; // offset values for the label
      currPos.left = currPos.left;

      var offset = 7.5; // this needs to be half of the circle size
      // iterate through location
      location.forEach(function(loc, i){

        var endingLeft = boardLoc.left + loc.left;
        var endingTop = boardLoc.top + loc.top;
        // draw lines first
        var calloutXLine = $('#callout-x-'+(i+1));
        var calloutYLine = $('#callout-y-'+(i+1));

        calloutXLine.css("left", currPos.left-1); // minus 1 to account for width of line
        calloutXLine.css("top", currPos.top);
        calloutXLine.css("width", 0);
        calloutXLine.show();

        calloutYLine.css("height", 0);
        calloutYLine.show();

        calloutXLine.animate({
          "left": endingLeft + offset,
          "width": currPos.left - endingLeft - offset + 1
        }, "fast", function(){
          // draw y
          calloutYLine.css("left", endingLeft + offset - 1); // minus 1 to account for width of line
          calloutYLine.css("top", currPos.top);

          var animationParam = {"height": endingTop - currPos.top + offset};
          if (currPos.top - endingTop > 0) {
            // we need to animate top and height
            // because the callout element is above text
            animationParam.height = currPos.top - endingTop - offset + 1;
            animationParam.top = endingTop + offset;
          }

          calloutYLine.animate(animationParam, "fast", function(){
            // then animate dots
            var calloutDotEle = $('#callout-'+(i+1));
            calloutDotEle.css("left", endingLeft);
            calloutDotEle.css("top", endingTop);
            calloutDotEle.fadeIn("fast", function(){
              // done with animation
              $(window).on('scroll', stopCallout);
            });
          })
        });
      });
    }
  });

  function stopCallout(){
    // fade out lines and callouts
    $('.calloutLineX').stop(true, true);
    $('.calloutLineY').stop(true, true);
    $('.calloutDot').stop(true, true);

    $('.calloutLineX').hide();
    $('.calloutLineY').hide();
    $('.calloutDot').hide();
  }

  // Callout cleanup
  $('.callout').on('mouseleave', function(){
    $(window).off('scroll', stopCallout);
    stopCallout();
  });

  // code samples
  $('.code-tab').on('click', function(){
    var self = $(this);
    var codeSample = self.closest('.code-sample');
    // remove all previously active elements
    codeSample.find('.active').each(function(e){
      $(this).removeClass('active');
    });

    // put an active tag on this element
    self.addClass('active');

    // find matching <pre> code
    var codeType = self.attr('code');
    // put active tag on matching <pre> code
    $(codeSample.find('pre[code='+codeType+']')[0]).addClass('active');

    // change out the text on "run code" example if we need to
    if (self.parent().hasClass('js-run-example')) {
      var blinkEle = $(".js-tessel-run.cursor-blink.disabled");
      if (blinkEle.html() != "" && blinkEle && !isSmall) {
        blinkEle.html(typist.get_tessel_run_text())
      }
    }
  });
});
