check(document.querySelector("#a"), {backgroundColor: "green"}, 2, "Is green");
check(document.querySelector("#a"), {backgroundColor: "red", top: "50px"}, 0, "Is red");
check(document.querySelector("#b"), {backgroundColor: "lightsteelblue"}, 0, "Is lightsteelblue");
