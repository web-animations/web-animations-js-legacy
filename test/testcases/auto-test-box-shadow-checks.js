timing_test(function() {
  at(0, function() {
    assert_styles(".anim", [
      {'boxShadow': ['rgb(0, 0, 255) -20px -20px 0px 0px', '-20px -20px 0px 0px rgb(0, 0, 255)']},
      {'boxShadow': ['rgb(0, 0, 255) -20px -20px 8px 0px inset', 'inset -20px -20px 8px 0px rgb(0, 0, 255)']},
      {'boxShadow': ['rgb(0, 0, 255) 20px 20px 8px 0px inset', 'inset rgb(0, 0, 255) 20px 20px 8px 0px']},
      {'boxShadow':'none'},
    ]);
  });
  at(1, function() {
    assert_styles(".anim", [
      {'boxShadow': ['rgb(0, 32, 191) -10px -10px 3px 2px', '-10px -10px 3px 2px rgb(0, 32, 191)']},
      {'boxShadow': ['rgb(0, 32, 191) -10px -10px 9px 2px inset', 'inset -10px -10px 9px 2px rgb(0, 32, 191)']},
      {'boxShadow': ['rgb(0, 0, 255) 20px 20px 8px 0px inset', 'inset 20px 20px 8px 0px rgb(0, 0, 255)']},
      {'boxShadow':'none'},
    ]);
  });
  at(2, function() {
    assert_styles(".anim", [
      {'boxShadow': ['rgb(0, 64, 128) 0px 0px 6px 4px', '0px 0px 6px 4px rgb(0, 64, 128)']},
      {'boxShadow': ['rgb(0, 64, 128) 0px 0px 10px 4px inset', 'inset 0px 0px 10px 4px rgb(0, 64, 128)']},
      {'boxShadow': ['rgb(0, 128, 0) 20px 20px 12px 8px', '20px 20px 12px 8px rgb(0, 128, 0)']},
      {'boxShadow': ['rgb(0, 128, 0) 20px 20px 12px 8px', '20px 20px 12px 8px rgb(0, 128, 0)']},
    ]);
  });
  at(3, function() {
    assert_styles(".anim", [
      {'boxShadow': ['rgb(0, 96, 64) 10px 10px 9px 6px', '10px 10px 9px 6px rgb(0, 96, 64)']},
      {'boxShadow': ['rgb(0, 96, 64) 10px 10px 11px 6px inset', 'inset 10px 10px 11px 6px rgb(0, 96, 64)']},
      {'boxShadow': ['rgb(0, 128, 0) 20px 20px 12px 8px', '20px 20px 12px 8px rgb(0, 128, 0)']},
      {'boxShadow': ['rgb(0, 128, 0) 20px 20px 12px 8px', '20px 20px 12px 8px rgb(0, 128, 0)']},
    ]);
  });
  at(4, function() {
    assert_styles(".anim", [
      {'boxShadow': ['rgb(0, 128, 0) 20px 20px 12px 8px', '20px 20px 12px 8px rgb(0, 128, 0)']},
      {'boxShadow': ['rgb(0, 128, 0) 20px 20px 12px 8px inset', 'inset 20px 20px 12px 8px rgb(0, 128, 0)']},
      {'boxShadow': ['rgb(0, 128, 0) 20px 20px 12px 8px', '20px 20px 12px 8px rgb(0, 128, 0)']},
      {'boxShadow': ['rgb(0, 128, 0) 20px 20px 12px 8px', '20px 20px 12px 8px rgb(0, 128, 0)']},
    ]);
  });
}, "Auto generated tests");
