timing_test(function() {
  at(0 * 1000, function() {
    assert_styles(".anim",{'transform':'matrix(1, 0, 0, 1, 0, 0)'});
  });
  at(0.4 * 1000, function() {
    assert_styles(".anim", [
      {'transform':'matrix(0.3090, 0.9511, -0.9511, 0.3090, 40, 0)'},
      {'transform':'matrix(0.3090, 0.9511, -0.9511, 0.3090, 20, 0)'},
      {'transform':'matrix(1, 0, 0, 1, 40, 0)'},
      {'transform':'matrix(0.3090, 0.9511, -0.9511, 0.309, 20, 0)'},
    ]);
  });
  at(0.8 * 1000, function() {
    assert_styles(".anim", [
      {'transform':'matrix(-0.8090, 0.5878, -0.5878, -0.8090, 80, 0)'},
      {'transform':'matrix(-0.8090, 0.5878, -0.5878, -0.8090, 40, 0)'},
      {'transform':'matrix(1, 0, 0, 1, 80, 0)'},
      {'transform':'matrix(-0.8090, 0.5878, -0.5878, -0.8090, 40, 0)'},
    ]);
  });
  at(1.2000000000000002 * 1000, function() {
    assert_styles(".anim", [
      {'transform':'matrix(-0.8090, -0.5878, 0.5878, -0.8090, 120, 0)'},
      {'transform':'matrix(-0.8090, -0.5878, 0.5878, -0.8090, 60, 0)'},
      {'transform':'matrix(1, 0, 0, 1, 120, 0)'},
      {'transform':'matrix(-0.8090, -0.5878, 0.5878, -0.8090, 60, 0)'},
    ]);
  });
  at(1.6 * 1000, function() {
    assert_styles(".anim", [
      {'transform':'matrix(0.3090, -0.9511, 0.9511, 0.3090, 160, 0)'},
      {'transform':'matrix(0.3090, -0.9511, 0.9511, 0.3090, 80, 0)'},
      {'transform':'matrix(1, 0, 0, 1, 160, 0)'},
      {'transform':'matrix(0.3090, -0.9511, 0.9511, 0.3090, 80, 0)'},
    ]);
  });
  at(2 * 1000, function() {
    assert_styles(".anim", [
      {'transform':'matrix(1, 0, 0, 1, 200, 0)'},
      {'transform':'matrix(1, 0, 0, 1, 100, 0)'},
      {'transform':'matrix(1, 0, 0, 1, 200, 0)'},
      {'transform':'matrix(1, 0, 0, 1, 100, 0)'},
    ]);
  });
}, "Auto generated tests");

