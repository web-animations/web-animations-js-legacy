timing_test(function() {
  at(0, function() {
    assert_styles(".test",{'transformOrigin':'53px 53px'});
  });
  at(1, function() {
    assert_styles(".test", [
      {'transformOrigin':'53px 53px'},
      {'transformOrigin':'26.5px 53px'},
      {'transformOrigin':'79.5px 53px'},
      {'transformOrigin':'53px 26.5px'},
      {'transformOrigin':'53px 79.5px'},
      {'transformOrigin':'39px 53px'},
      {'transformOrigin':'26.5px 26.5px'},
      {'transformOrigin':'31.8px 51.5px'},
      {'transformOrigin':'31.8px 51.5px 50px'},
      {'transformOrigin':'79.5px 79.5px 50px'},
      {'transformOrigin':'79.5px 40.09px'},
      {'transformOrigin':'79.5px 18.89px -100px'},
    ]);
  });
  at(2, function() {
    assert_styles(".test", [
      {'transformOrigin':'53px 53px'},
      {'transformOrigin':'0px 53px'},
      {'transformOrigin':'106px 53px'},
      {'transformOrigin':'53px 0px'},
      {'transformOrigin':'53px 106px'},
      {'transformOrigin':'25px 53px'},
      {'transformOrigin':'0px 0px'},
      {'transformOrigin':'10.59px 50px'},
      {'transformOrigin':'10.59px 50px 100px'},
      {'transformOrigin':'106px 106px 100px'},
      {'transformOrigin':'106px 27.19px'},
      {'transformOrigin':'106px -15.19px -200px'},
    ]);
  });
}, "Auto generated tests");
