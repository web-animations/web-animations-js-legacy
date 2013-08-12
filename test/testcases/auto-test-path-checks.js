timing_test(function() {
  at(0, function() {
    assert_styles(".target", [
      {'transform':'matrix(1, 0, 0, 1, 30, 140)'},
      {'transform':'matrix(0.9148, 0.404, -0.404, 0.9148, 330, 140)'},
      {'transform':'matrix(0.1135, 0.9935, -0.9935, 0.1135, 30, 340)'},
      {'transform':'matrix(0.6963, 0.7177, -0.7177, 0.6963, 330, 340)'},
      {'transform':'matrix(0, -2, 2, 0, 30, 520)'},
      {'transform':'matrix(0.5261, 0.8504, -0.6589, 0.8357, 338.5, 534.7)'},
      {'transform':'matrix(0.05328, 0.9986, -0.9986, 0.05328, 30, 740)'},
      {'transform':'matrix(0.4127, 0.9109, -0.7607, 0.7442, 339.1, 735.9)'},
    ]);
  });
  at(1, function() {
    assert_styles(".target", [
      {'transform':'matrix(1, 0, 0, 1, 81.82, 211.3)'},
      {'transform':'matrix(0.9986, 0.05344, -0.05344, 0.9986, 381.8, 211.3)'},
      {'transform':'matrix(0.1135, 0.9935, -0.9935, 0.1135, 30, 340)'},
      {'transform':'matrix(1, 0, 0, 1, 380, 290)'},
      {'transform':'matrix(0, -2, 2, 0, 80, 470)'},
      {'transform':'matrix(1, 0, 0.364, 1, 380, 480)'},
      {'transform':'matrix(1, 0, 0, 1, 80, 690)'},
      {'transform':'matrix(1, 0, 0.364, 1, 380, 680)'},
    ]);
  });
  at(2, function() {
    assert_styles(".target", [
      {'transform':'matrix(1, 0, 0, 1, 165.7, 184.1)'},
      {'transform':'matrix(0.5873, -0.8094, 0.8094, 0.5873, 465.7, 184.1)'},
      {'transform':'matrix(0, -1, 1, 0, 30, 290)'},
      {'transform':'matrix(0.5749, 0.8182, -0.8182, 0.5749, 458.8, 330.9)'},
      {'transform':'matrix(0, -2, 2, 0, 158.8, 510.9)'},
      {'transform':'matrix(0.5763, 0.8172, -0.6075, 0.8738, 466.9, 525.1)'},
      {'transform':'matrix(0.309, -0.9511, 0.9511, 0.309, 0, 0)'},
      {'transform':'matrix(-0.8172, 0.5763, -0.5763, -0.8172, 466.9, 725.1)'},
    ]);
  });
  at(3, function() {
    assert_styles(".target", [
      {'transform':'matrix(1, 0, 0, 1, 165.7, 95.87)'},
      {'transform':'matrix(-0.9582, -0.2861, 0.2861, -0.9582, 465.7, 95.87)'},
      {'transform':'matrix(1, 0, 0, 1, 130, 290)'},
      {'transform':'matrix(0.5757, 0.8176, -0.8176, 0.5757, 516.3, 412.7)'},
      {'transform':'matrix(0, -2, 2, 0, 216.3, 592.7)'},
      {'transform':'matrix(0.5743, 0.8187, -0.6096, 0.8722, 524.5, 606.9)'},
      {'transform':'matrix(0.5763, 0.8172, -0.8172, 0.5763, 216.3, 812.7)'},
      {'transform':'matrix(0.5743, 0.8187, -0.6096, 0.8722, 524.5, 806.9)'},
    ]);
  });
  at(4, function() {
    assert_styles(".target", [
      {'transform':'matrix(1, 0, 0, 1, 81.82, 68.65)'},
      {'transform':'matrix(-0.9517, 0.3071, -0.3071, -0.9517, 381.8, 68.65)'},
      {'transform':'matrix(0.5763, 0.8172, -0.8172, 0.5763, 216.3, 412.7)'},
      {'transform':'matrix(-0.932, -0.3624, 0.3624, -0.932, 423.2, 376.3)'},
      {'transform':'matrix(0, -2, 2, 0, 123.2, 556.3)'},
      {'transform':'matrix(-0.9326, -0.3608, 0.02137, -1.064, 419.6, 585.7)'},
      {'transform':'matrix(-0.9326, -0.3608, 0.3608, -0.9326, 123.2, 776.3)'},
      {'transform':'matrix(-0.9326, -0.3608, 0.02137, -1.064, 419.6, 785.7)'},
    ]);
  });
  at(5, function() {
    assert_styles(".target", [
      {'transform':'matrix(1, 0, 0, 1, 30, 140)'},
      {'transform':'matrix(0.9148, 0.404, -0.404, 0.9148, 330, 140)'},
      {'transform':'matrix(0.1135, 0.9935, -0.9935, 0.1135, 30, 340)'},
      {'transform':'matrix(0.6963, 0.7177, -0.7177, 0.6963, 330, 340)'},
      {'transform':'matrix(0, -2, 2, 0, 30, 520)'},
      {'transform':'matrix(0.5261, 0.8504, -0.6589, 0.8357, 338.5, 534.7)'},
      {'transform':'matrix(0.05328, 0.9986, -0.9986, 0.05328, 30, 740)'},
      {'transform':'matrix(0.4127, 0.9109, -0.7607, 0.7442, 339.1, 735.9)'},
    ]);
  });
  at(6, function() {
    assert_styles(".target", [
      {'transform':'matrix(1, 0, 0, 1, 81.82, 211.3)'},
      {'transform':'matrix(0.9986, 0.05344, -0.05344, 0.9986, 381.8, 211.3)'},
      {'transform':'matrix(0.1135, 0.9935, -0.9935, 0.1135, 30, 340)'},
      {'transform':'matrix(1, 0, 0, 1, 380, 290)'},
      {'transform':'matrix(0, -2, 2, 0, 80, 470)'},
      {'transform':'matrix(1, 0, 0.364, 1, 380, 480)'},
      {'transform':'matrix(1, 0, 0, 1, 80, 690)'},
      {'transform':'matrix(1, 0, 0.364, 1, 380, 680)'},
    ]);
  });
  at(7, function() {
    assert_styles(".target", [
      {'transform':'matrix(1, 0, 0, 1, 165.7, 184.1)'},
      {'transform':'matrix(0.5873, -0.8094, 0.8094, 0.5873, 465.7, 184.1)'},
      {'transform':'matrix(0, -1, 1, 0, 30, 290)'},
      {'transform':'matrix(0.5749, 0.8182, -0.8182, 0.5749, 458.8, 330.9)'},
      {'transform':'matrix(0, -2, 2, 0, 158.8, 510.9)'},
      {'transform':'matrix(0.5763, 0.8172, -0.6075, 0.8738, 466.9, 525.1)'},
      {'transform':'matrix(0.5763, 0.8172, -0.8172, 0.5763, 158.8, 730.9)'},
      {'transform':'matrix(0.5763, 0.8172, -0.6075, 0.8738, 466.9, 725.1)'},
    ]);
  });
  at(8, function() {
    assert_styles(".target", [
      {'transform':'matrix(1, 0, 0, 1, 165.7, 95.87)'},
      {'transform':'matrix(-0.9582, -0.2861, 0.2861, -0.9582, 465.7, 95.87)'},
      {'transform':'matrix(1, 0, 0, 1, 130, 290)'},
      {'transform':'matrix(0.5757, 0.8176, -0.8176, 0.5757, 516.3, 412.7)'},
      {'transform':'matrix(0, -2, 2, 0, 216.3, 592.7)'},
      {'transform':'matrix(0.5743, 0.8187, -0.6096, 0.8722, 524.5, 606.9)'},
      {'transform':'matrix(0.5763, 0.8172, -0.8172, 0.5763, 216.3, 812.7)'},
      {'transform':'matrix(0.5743, 0.8187, -0.6096, 0.8722, 524.5, 806.9)'},
    ]);
  });
  at(9, function() {
    assert_styles(".target", [
      {'transform':'matrix(1, 0, 0, 1, 81.82, 68.65)'},
      {'transform':'matrix(-0.9517, 0.3071, -0.3071, -0.9517, 381.8, 68.65)'},
      {'transform':'matrix(0.5763, 0.8172, -0.8172, 0.5763, 216.3, 412.7)'},
      {'transform':'matrix(-0.932, -0.3624, 0.3624, -0.932, 423.2, 376.3)'},
      {'transform':'matrix(0, -2, 2, 0, 123.2, 556.3)'},
      {'transform':'matrix(-0.9326, -0.3608, 0.02137, -1.064, 419.6, 585.7)'},
      {'transform':'matrix(-0.9326, -0.3608, 0.3608, -0.9326, 123.2, 776.3)'},
      {'transform':'matrix(-0.9326, -0.3608, 0.02137, -1.064, 419.6, 785.7)'},
    ]);
  });
  at(10, function() {
    assert_styles(".target", [
      {'transform':'matrix(1, 0, 0, 1, 30, 140)'},
      {'transform':'matrix(1, 0, 0, 1, 330, 140)'},
      {'transform':'matrix(1, 0, 0, 1, 30, 340)'},
      {'transform':'matrix(1, 0, 0, 1, 330, 340)'},
      {'transform':'matrix(0, -2, 2, 0, 30, 520)'},
      {'transform':'matrix(1, 0, 0.364, 1, 330, 530)'},
      {'transform':'matrix(1, 0, 0, 1, 30, 740)'},
      {'transform':'matrix(1, 0, 0.364, 1, 330, 730)'},
    ]);
  });
}, "Auto generated tests");
