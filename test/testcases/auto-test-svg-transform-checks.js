timing_test(function() {
  at(0 * 1000, function() {
    assert_styles(".anim",{'transform':'scale(1)'});
  });
  at(0.2 * 1000, function() {
    assert_styles(".anim",{'transform':'scale(2)'});
  });
  at(0.4 * 1000, function() {
    assert_styles(".anim",{'transform':'scale(3)'});
  });
  at(0.6000000000000001 * 1000, function() {
    assert_styles(".anim",{'transform':'scale(4)'});
  });
  at(0.8 * 1000, function() {
    assert_styles(".anim",{'transform':'scale(5)'});
  });
  at(1 * 1000, function() {
    assert_styles(".anim",{'transform':'null'});
  });
  at(1.2 * 1000, function() {
    assert_styles(".anim",{'transform':'null'});
  });
}, "Auto generated tests");
