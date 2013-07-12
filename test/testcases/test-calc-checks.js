timing_test(function() {
  at(0, function() {
    assert_styles(".anim",{'width':'50px'});
  });
  at(0.5, function() {
    assert_styles(".anim", [
      {'width':'81.25px'},
      {'width':'109.375px'},
      {'width':'137.5px'},
      {'width':'95.3125px'},
      {'width':'95.3125px'},
      {'width':'123.4375px'},
      {'width':'67.1875px'},
    ]);
  });
  at(1, function() {
    assert_styles(".anim", [
      {'width':'150px'},
      {'width':'187.5px'},
      {'width':'225px'},
      {'width':'168.75px'},
      {'width':'168.75px'},
      {'width':'206.25px'},
      {'width':'143.75px'},
    ]);
  });
  at(1.5, function() {
    assert_styles(".anim", [
      {'width':'256.25px'},
      {'width':'284.375px'},
      {'width':'312.5px'},
      {'width':'270.3125px'},
      {'width':'270.3125px'},
      {'width':'298.4375px'},
      {'width':'257.8125px'},
    ]);
  });
  at(2, function() {
    assert_styles(".anim",{'width':'400px'});
  });
}, "Auto generated tests");
