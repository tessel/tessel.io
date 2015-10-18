var raf = require('raf');

// adds window scroll-tick event
function listen () {
  var await = false;
  function tick () {
    $(window).trigger('scroll-tick');
    await = false;
  }
  $(window).on('scroll', function () {
    if (!await) {
      await = true;
      raf(tick);
    }
  });
  $(function () {
    $(window).trigger('scroll-tick');
  })
  $(window).on('load', function () {
    $(window).trigger('scroll-tick');
  })
  raf(function () {
    $(window).trigger('scroll-tick');
  });
}

var pins = [];
var $html = $('html'), $window = $(window);

$(window).on('scroll-tick', function () {
  var scrolltop = $window.scrollTop();

  // Used for determining if an item has scrolled past this point
  // Apply styling using before-id or after-id class to remain fixed
  for (var i = 0; i < pins.length; i++) {
    var pin = pins[i];

    var top = pin.$match.offset().top + pin.offset;
    $html
      .toggleClass('before-' + pin.id, !(scrolltop >= top))
      .toggleClass('after-' + pin.id, scrolltop >= top);

    if (pin.antifn) {
      if (scrolltop >= top) {
        pin.fn(scrolltop - top);
      } else {
        pin.antifn(scrolltop - top);
      }
    } else if (pin.fn) {
      var element_height = pin.$match.height();
      if (scrolltop > top && scrolltop < (top + element_height)){
        pin.fn(scrolltop - top);
      }
    }
  }
})

function trigger (id, match, offset, fn, antifn) {
  pins.push({
    id: id,
    $match: $(match),
    offset: offset,
    fn: fn,
    antifn: antifn,
  })
}

exports.listen = listen;
exports.trigger = trigger;
