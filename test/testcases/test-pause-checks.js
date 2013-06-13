generate_tests_at(0, assert_dom_style, [
    [null,0,'.anim',{'left':'100px'}],
    [null,1,'.anim',{'left':'100px'}],
    [null,2,'.anim',{'left':'0px'}],
    [null,3,'.anim',{'left':'0px'}],
    ]);

//pause
generate_tests_at(1, assert_dom_style, [
    [null,0,'.anim',{'left':'138.46153259277344px'}],
    [null,1,'.anim',{'left':'140px'}],
    [null,2,'.anim',{'left':'0px'}],
    [null,3,'.anim',{'left':'0px'}],
    ]);
generate_tests_at(2, assert_dom_style, [
    [null,0,'.anim',{'left':'138.46153259277344px'}],
    [null,1,'.anim',{'left':'140px'}],
    [null,2,'.anim',{'left':'0px'}],
    [null,3,'.anim',{'left':'0px'}],
    ]);
//unpause
generate_tests_at(3, assert_dom_style, [
    [null,0,'.anim',{'left':'176.92308044433594px'}],
    [null,1,'.anim',{'left':'180px'}],
    [null,2,'.anim',{'left':'0px'}],
    [null,3,'.anim',{'left':'0px'}],
    ]);
//pause
generate_tests_at(4, assert_dom_style, [
    [null,0,'.anim',{'left':'200px'}],
    [null,1,'.anim',{'left':'200px'}],
    [null,2,'.anim',{'left':'116px'}],
    [null,3,'.anim',{'left':'117.39130401611328px'}],
    ]);
generate_tests_at(5, assert_dom_style, [
    [null,0,'.anim',{'left':'200px'}],
    [null,1,'.anim',{'left':'200px'}],
    [null,2,'.anim',{'left':'116px'}],
    [null,3,'.anim',{'left':'117.39130401611328px'}],
    ]);
//unpause
generate_tests_at(6, assert_dom_style, [
    [null,0,'.anim',{'left':'200px'}],
    [null,1,'.anim',{'left':'200px'}],
    [null,2,'.anim',{'left':'156px'}],
    [null,3,'.anim',{'left':'160.86956787109375px'}],
    ]);
generate_tests_at(7, assert_dom_style, [
    [null,0,'.anim',{'left':'200px'}],
    [null,1,'.anim',{'left':'200px'}],
    [null,2,'.anim',{'left':'196px'}],
    [null,3,'.anim',{'left':'200px'}],
    ]);
generate_tests_at(7.1, assert_dom_style, [
    [null,0,'.anim',{'left':'200px'}],
    [null,1,'.anim',{'left':'200px'}],
    [null,2,'.anim',{'left':'200px'}],
    [null,3,'.anim',{'left':'200px'}],
    ]);
