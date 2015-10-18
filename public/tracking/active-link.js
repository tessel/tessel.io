$(document).ready(function () {
  console.log("currpath", location.pathname);
  if (location.pathname != "/docs")
    $("a[href='" + location.pathname + "']").addClass("currentlink");
});
