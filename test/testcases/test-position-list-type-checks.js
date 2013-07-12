timing_test(function() {
  at(0, function() {
    assert_styles(".anim", [
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
      {'backgroundPosition':'0% 0%'},
    ]);
  });
  // TODO: Generate more inbetween values to compare against.
  at(2, function() {
    assert_styles(".anim", [
      {'backgroundPosition':'0% 50%'},
      {'backgroundPosition':'50% 50%'},
      {'backgroundPosition':'100% 50%'},
      {'backgroundPosition':'50% 0%'},
      {'backgroundPosition':'50% 100%'},
      {'backgroundPosition':'10px 50%'},
      {'backgroundPosition':'20% 50%'},
      {'backgroundPosition':'0% 50%'},
      {'backgroundPosition':'50% 50%'},
      {'backgroundPosition':'100% 100%'},
      {'backgroundPosition':'100% 160px'},
      {'backgroundPosition':'10px 100%'},
      {'backgroundPosition':'10px 40px'},
      {'backgroundPosition':'left bottom 160px'},
      {'backgroundPosition':'50% 20%'},
      {'backgroundPosition':'100% 10px'},
      {'backgroundPosition':'100% 20%'},
      {'backgroundPosition':'20% 100%'},
      {'backgroundPosition':'10px 100%'},
      {'backgroundPosition':'left 40px bottom 160px)'},
      {'backgroundPosition':'20% 20%'},
    ]);
  });
}, "Auto generated tests");
