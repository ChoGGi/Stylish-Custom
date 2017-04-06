"use strict";
Components.utils.import("chrome://stylish-custom/content/common.jsm");
//cbCommon.dump();

var scStylesheets = {

  styleList: null,
  init: function()
  {
    if (window.arguments[0] && window.arguments[1] && window.arguments[2]) {
      this.styleList = document.getElementById("styleList");
      this.createStyleSheetList(window.arguments[0]);
      this.setWinTitle();
    } else {
      window.close();
    }
  },

  createStyleSheetList: function(array)
  {
    for (let i = 0; i < array.length; i++) {
      let checkbox = document.createElement("checkbox"),
      split = array[i].split("|||",2);

      checkbox.setAttribute("label",split[0]);
      checkbox.setAttribute("stylenum",i);
      checkbox.value = split[1];
      this.styleList.appendChild(checkbox);
    }
  },

  setWinTitle: function()
  {
    let win = document.getElementById("stylish-custom"),
    title = win.getAttribute("title");
    win.setAttribute("title",title + ": " + window.arguments[2]);
  },

  exit: function()
  {
    let styleList = this.styleList.childNodes,
    styleText = "",
    count = 0;
    //loop through the checkboxes and grab the text
    for (let i = 0; i < styleList.length; i++) {
      let checkbox = styleList[i];
      if (checkbox.getAttribute("checked") === "true") {
        count++;
        styleText = "\n/*----- " +
        scCommon.getMsg("ImportRules") +
        " \"" +
        checkbox.getAttribute("label") +
        "\" -----*/\n" +
        checkbox.value +
        "\n/*----- " +
        scCommon.getMsg("ImportRules") +
        " \"" +
        checkbox.getAttribute("label") +
        "\" -----*/\n" +
        styleText;
      }
    }
    //nothing selected
    if (count === 0)
      return;
    //add an html namespace as i somewhat doubt everybody will (only slightly) and wrap it in an @-moz-doc-domain
    styleText =
      '@namespace url(http://www.w3.org/1999/xhtml);\n@-moz-document domain("' +
      window.arguments[2] + '"){\n' + styleText + "\n}";
    //load it into stylish
    scCommon.addCode(styleText,window.arguments[1]);
  }

};
