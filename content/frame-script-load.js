"use strict";
//content.console.log("XXX");

//find out how to make this fire only once per page load
addEventListener("DOMContentLoaded", function (event) {
  sendAsyncMessage("stylishCustom:pageload",content.document.location.href);
}, false);
