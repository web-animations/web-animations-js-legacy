timing_test(function() {
  at(0, function() {
    assert_styles("#target",{'height':'0px'});
  });
  at(0.25, function() {
    assert_styles("#target",{'height':'12.5px'});
  });
  at(0.5, function() {
    assert_styles("#target",{'height':'25px'});
  });
  at(0.75, function() {
    assert_styles("#target",{'height':'37.5px'});
  });
  at(1, function() {
    assert_styles("#target",{'height':'50px'});
  });
  at(1.25, function() {
    assert_styles("#target",{'height':'62.5px'});
  });
  at(1.5, function() {
    assert_styles("#target",{'height':'75px'});
  });
  at(1.75, function() {
    assert_styles("#target",{'height':'87.5px'});
  });
  at(2, function() {
    assert_styles("#target",{'height':'100px'});
  });
  at(2.25, function() {
    assert_styles("#target",{'height':'106.5px'});
  });
  at(2.5, function() {
    assert_styles("#target",{'height':'125px'});
  });
  at(2.75, function() {
    assert_styles("#target",{'height':'143.5px'});
  });
  at(3, function() {
    assert_styles("#target",{'height':'150px'});
  });
  at(3.25, function() {
    assert_styles("#target",{'height':'150px'});
  });
  at(3.5, function() {
    assert_styles("#target",{'height':'150px'});
  });
  at(3.75, function() {
    assert_styles("#target",{'height':'200px'});
  });
  at(4, function() {
    assert_styles("#target",{'height':'200px'});
  });
  at(4.25, function() {
    assert_styles("#target",{'height':'200px'});
  });
  at(4.5, function() {
    assert_styles("#target",{'height':'225px'});
  });
  at(4.75, function() {
    assert_styles("#target",{'height':'225px'});
  });
  at(5, function() {
    assert_styles("#target",{'height':'250px'});
  });
}, "Auto generated tests");
