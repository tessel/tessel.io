function install () {
  var width = 5;
  var duration = 200;

  $('.my-carousel')
  .addClass('loaded')
  .wrapInner('<div class="my-carousel-wrapper-two">')
  .wrapInner('<div class="my-carousel-wrapper-one">');

  $('.my-carousel')
  .prepend('<div class="my-carousel-left">')
  .append('<div class="my-carousel-right">');

  $('.my-carousel')
  .each(function () {
    $(this).data('carousel-index', 0);
    $(this).find('.my-carousel-left').addClass('hidden');
    $(this).find('.my-carousel-right').toggleClass('hidden', $(this).find('.my-carousel-wrapper-two').children().length <= 5);
  })

  $('body').on('click', '.my-carousel-right', function () {
    var $wrapper = $(this).parent();
    var $inner = $wrapper.find('.my-carousel-wrapper-two');
    var len = $inner.children().length;

    var index = Math.min(($wrapper.data('carousel-index') || 0) + 1, len - width);
    $wrapper.data('carousel-index', index);

    $inner.transition({
      x: "-" + (100/len * index) + "%",
      duration: duration,
      ease: 'linear'
    });

    $wrapper.find('.my-carousel-left').toggleClass('hidden', index == 0);
    $wrapper.find('.my-carousel-right').toggleClass('hidden', len - index <= width);
  });

  $('body').on('click', '.my-carousel-left', function () {
    var $wrapper = $(this).parent();
    var $inner = $wrapper.find('.my-carousel-wrapper-two');
    var len = $inner.children().length;
    
    var index = Math.max(($wrapper.data('carousel-index') || 0) - 1, 0);
    $wrapper.data('carousel-index', index);

    $inner.transition({
      x: "-" + (100/len * index) + "%",
      duration: duration,
      ease: 'linear'
    });

    $wrapper.find('.my-carousel-left').toggleClass('hidden', index == 0);
    $wrapper.find('.my-carousel-right').toggleClass('hidden', len - index <= width);
  });
}

exports.install = install;
