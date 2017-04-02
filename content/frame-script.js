"use strict";
//content.console.log("XXX");

//builds an array of head elements either "style" or "link"ed css files

let headChildren = content.document.head.childNodes,
styleArray = [],
child;

for (let i = 0; i < headChildren.length; i++) {
  child = headChildren[i];
  switch (child.tagName) {
    case "STYLE":
      styleArray.push({num:i,type:0,data:child.textContent});
    break;
    case "LINK":
      if (child.getAttribute("rel") == "stylesheet" || child.getAttribute("type") == "text/css") {
        styleArray.push({num:i,type:1,data:child.href});
      }
    break;
  }
}

sendAsyncMessage("stylishCustom:callback", {
  domain: content.document.domain,
  url: content.document.location.href,
  array: styleArray
});

