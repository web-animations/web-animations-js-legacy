generate_tests_at(0, assert_dom_style, [
    [null,0,'.anim',{'x':'100px','y':'300px','width':'100px'}],
    ]);
generate_tests_at(0.3, assert_dom_style, [
    [null,0,'.anim',{'x':'190px','y':'270px','width':'52px'}],
    ]);
generate_tests_at(0.6, assert_dom_style, [
    [null,0,'.anim',{'x':'280px','y':'240px','width':'26px'}],
    ]);
generate_tests_at(0.8999999999999999, assert_dom_style, [
    [null,0,'.anim',{'x':'369.99999999999994px','y':'210px','width':'44px'}],
    ]);
generate_tests_at(1.2, assert_dom_style, [
    [null,0,'.anim',{'x':'400px','y':'200px','width':'50px'}],
    ]);
