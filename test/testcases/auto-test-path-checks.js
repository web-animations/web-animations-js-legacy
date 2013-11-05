timing_test(function() {
  at(0, function() {
    assert_styles(".animation", [
      {'transform':'matrix(0.7071, 0.7071, -0.7071, 0.7071, 87.5, 87.5)'},
      {'transform':'matrix(0.9701, 0.2425, -0.2425, 0.9701, 387.5, 87.5)'},
      {'transform':'matrix(0.3158, 0.9488, -0.9488, 0.3158, 87.5, 287.5)'},
      {'transform':'matrix(0.7993, 0.601, -0.601, 0.7993, 387.5, 287.5)'},
    ]);
  });
  at(1, function() {
    assert_styles(".animation", [
      {'transform':'matrix(0.958, 0.2868, -0.2868, 0.958, 101.8, 131.6)'},
      {'transform':'matrix(0.9701, 0.2425, -0.2425, 0.9701, 387.5, 87.5)'},
      {'transform':'matrix(0, -1, 1, 0, 87.5, 237.5)'},
      {'transform':'matrix(0, -1, 1, 0, 387.5, 237.5)'},
    ]);
  });
  at(2, function() {
    assert_styles(".animation", [
      {'transform':'matrix(0.9986, 0.05336, -0.05336, 0.9986, 139.3, 158.8)'},
      {'transform':'matrix(0.9701, 0.2425, -0.2425, 0.9701, 387.5, 87.5)'},
      {'transform':'matrix(1, 0, 0, 1, 137.5, 237.5)'},
      {'transform':'matrix(1, 0, 0, 1, 437.5, 237.5)'},
    ]);
  });
  at(3, function() {
    assert_styles(".animation", [
      {'transform':'matrix(0.9518, -0.3066, 0.3066, 0.9518, 185.7, 158.8)'},
      {'transform':'matrix(0, -1, 1, 0, 387.5, 62.5)'},
      {'transform':'matrix(1, 0, 0, 1, 187.5, 237.5)'},
      {'transform':'matrix(0.5878, -0.809, 0.809, 0.5878, 387.5, 287.5)'},
    ]);
  });
  at(4, function() {
    assert_styles(".animation", [
      {'transform':'matrix(0.587, -0.8096, 0.8096, 0.587, 223.2, 131.6)'},
      {'transform':'matrix(0, -1, 1, 0, 387.5, 37.5)'},
      {'transform':'matrix(0.5753, 0.8179, -0.8179, 0.5753, 216.3, 278.4)'},
      {'transform':'matrix(0.309, -0.9511, 0.9511, 0.309, 387.5, 287.5)'},
    ]);
  });
  at(5, function() {
    assert_styles(".animation", [
      {'transform':'matrix(0.003053, -1, 1, 0.003053, 237.5, 87.5)'},
      {'transform':'matrix(1, 0, 0, 1, 437.5, 37.5)'},
      {'transform':'matrix(0.5743, 0.8187, -0.8187, 0.5743, 245.1, 319.3)'},
      {'transform':'matrix(0, -1, 1, 0, 387.5, 287.5)'},
    ]);
  });
  at(6, function() {
    assert_styles(".animation", [
      {'transform':'matrix(-0.9581, -0.2864, 0.2864, -0.9581, 223.2, 43.37)'},
      {'transform':'matrix(1, 0, 0, 1, 487.5, 37.5)'},
      {'transform':'matrix(0.5763, 0.8172, -0.8172, 0.5763, 273.8, 360.2)'},
      {'transform':'matrix(0.5757, 0.8176, -0.8176, 0.5757, 573.8, 360.2)'},
    ]);
  });
  at(7, function() {
    assert_styles(".animation", [
      {'transform':'matrix(-0.9986, -0.05222, 0.05222, -0.9986, 185.7, 16.15)'},
      {'transform':'matrix(0.5746, 0.8184, -0.8184, 0.5746, 530.7, 98.83)'},
      {'transform':'matrix(-0.9318, -0.363, 0.363, -0.9318, 227.2, 342)'},
      {'transform':'matrix(-0.9312, -0.3645, 0.3645, -0.9312, 527.2, 342)'},
    ]);
  });
  at(8, function() {
    assert_styles(".animation", [
      {'transform':'matrix(-0.9516, 0.3072, -0.3072, -0.9516, 139.3, 16.15)'},
      {'transform':'matrix(0.5743, 0.8187, -0.8187, 0.5743, 573.8, 160.2)'},
      {'transform':'matrix(-0.932, -0.3624, 0.3624, -0.932, 180.7, 323.8)'},
      {'transform':'matrix(-0.9316, -0.3635, 0.3635, -0.9316, 480.7, 323.8)'},
    ]);
  });
  at(9, function() {
    assert_styles(".animation", [
      {'transform':'matrix(-0.5866, 0.8099, -0.8099, -0.5866, 101.8, 43.41)'},
      {'transform':'matrix(-0.9316, -0.3635, 0.3635, -0.9316, 480.7, 123.8)'},
      {'transform':'matrix(-0.9318, -0.363, 0.363, -0.9318, 134.1, 305.7)'},
      {'transform':'matrix(-0.9316, -0.3635, 0.3635, -0.9316, 434.1, 305.7)'},
    ]);
  });
  at(10, function() {
    assert_styles(".animation", [
      {'transform':'matrix(0.7071, 0.7071, -0.7071, 0.7071, 87.5, 87.5)'},
      {'transform':'matrix(0.9701, 0.2425, -0.2425, 0.9701, 387.5, 87.5)'},
      {'transform':'matrix(0.3158, 0.9488, -0.9488, 0.3158, 87.5, 287.5)'},
      {'transform':'matrix(0.7993, 0.601, -0.601, 0.7993, 387.5, 287.5)'},
    ]);
  });
  at(11, function() {
    assert_styles(".animation", [
      {'transform':'matrix(0.958, 0.2868, -0.2868, 0.958, 101.8, 131.6)'},
      {'transform':'matrix(0.9701, 0.2425, -0.2425, 0.9701, 387.5, 87.5)'},
      {'transform':'matrix(0, -1, 1, 0, 87.5, 237.5)'},
      {'transform':'matrix(0, -1, 1, 0, 387.5, 237.5)'},
    ]);
  });
  at(12, function() {
    assert_styles(".animation", [
      {'transform':'matrix(0.9986, 0.05336, -0.05336, 0.9986, 139.3, 158.8)'},
      {'transform':'matrix(0.9701, 0.2425, -0.2425, 0.9701, 387.5, 87.5)'},
      {'transform':'matrix(1, 0, 0, 1, 137.5, 237.5)'},
      {'transform':'matrix(1, 0, 0, 1, 437.5, 237.5)'},
    ]);
  });
  at(13, function() {
    assert_styles(".animation", [
      {'transform':'matrix(0.9518, -0.3066, 0.3066, 0.9518, 185.7, 158.8)'},
      {'transform':'matrix(0, -1, 1, 0, 387.5, 62.5)'},
      {'transform':'matrix(1, 0, 0, 1, 187.5, 237.5)'},
      {'transform':'matrix(1, 0.001529, -0.001529, 1, 487.5, 237.5)'},
    ]);
  });
  at(14, function() {
    assert_styles(".animation", [
      {'transform':'matrix(0.587, -0.8096, 0.8096, 0.587, 223.2, 131.6)'},
      {'transform':'matrix(0, -1, 1, 0, 387.5, 37.5)'},
      {'transform':'matrix(0.5753, 0.8179, -0.8179, 0.5753, 216.3, 278.4)'},
      {'transform':'matrix(0.5769, 0.8168, -0.8168, 0.5769, 516.3, 278.4)'},
    ]);
  });
  at(15, function() {
    assert_styles(".animation", [
      {'transform':'matrix(0.003053, -1, 1, 0.003053, 237.5, 87.5)'},
      {'transform':'matrix(1, 0, 0, 1, 437.5, 37.5)'},
      {'transform':'matrix(0.5743, 0.8187, -0.8187, 0.5743, 245.1, 319.3)'},
      {'transform':'matrix(0.5743, 0.8187, -0.8187, 0.5743, 545.1, 319.3)'},
    ]);
  });
  at(16, function() {
    assert_styles(".animation", [
      {'transform':'matrix(-0.9581, -0.2864, 0.2864, -0.9581, 223.2, 43.37)'},
      {'transform':'matrix(1, 0, 0, 1, 487.5, 37.5)'},
      {'transform':'matrix(0.5763, 0.8172, -0.8172, 0.5763, 273.8, 360.2)'},
      {'transform':'matrix(0.5757, 0.8176, -0.8176, 0.5757, 573.8, 360.2)'},
    ]);
  });
  at(17, function() {
    assert_styles(".animation", [
      {'transform':'matrix(-0.9986, -0.05222, 0.05222, -0.9986, 185.7, 16.15)'},
      {'transform':'matrix(0.5746, 0.8184, -0.8184, 0.5746, 530.7, 98.83)'},
      {'transform':'matrix(-0.9318, -0.363, 0.363, -0.9318, 227.2, 342)'},
      {'transform':'matrix(-0.9312, -0.3645, 0.3645, -0.9312, 527.2, 342)'},
    ]);
  });
  at(18, function() {
    assert_styles(".animation", [
      {'transform':'matrix(-0.9516, 0.3072, -0.3072, -0.9516, 139.3, 16.15)'},
      {'transform':'matrix(0.5743, 0.8187, -0.8187, 0.5743, 573.8, 160.2)'},
      {'transform':'matrix(-0.932, -0.3624, 0.3624, -0.932, 180.7, 323.8)'},
      {'transform':'matrix(-0.9316, -0.3635, 0.3635, -0.9316, 480.7, 323.8)'},
    ]);
  });
  at(19, function() {
    assert_styles(".animation", [
      {'transform':'matrix(-0.5866, 0.8099, -0.8099, -0.5866, 101.8, 43.41)'},
      {'transform':'matrix(-0.9316, -0.3635, 0.3635, -0.9316, 480.7, 123.8)'},
      {'transform':'matrix(-0.9318, -0.363, 0.363, -0.9318, 134.1, 305.7)'},
      {'transform':'matrix(-0.9316, -0.3635, 0.3635, -0.9316, 434.1, 305.7)'},
    ]);
  });
  at(20, function() {
    assert_styles(".animation", [
      {'transform':'matrix(1, 0, 0, 1, 87.5, 87.5)'},
      {'transform':'matrix(1, 0, 0, 1, 387.5, 87.5)'},
      {'transform':'matrix(1, 0, 0, 1, 87.5, 287.5)'},
      {'transform':'matrix(1, 0, 0, 1, 387.5, 287.5)'},
    ]);
  });
}, "Auto generated tests");

