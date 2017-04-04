"use strict";
Components.utils.import("chrome://stylish-custom/content/common.jsm");
//cbCommon.dump();

var scStylesheets = {

  styleName: null,

  init: function()
  {
    //hide bottom area
    document.getAnonymousElementByAttribute (
              document.getElementById("stylish-custom"),"anonid","buttons"
    ).style.display = "none";

    if (window.arguments[0] && window.arguments[1]) {
      this.createStyleSheetList(window.arguments[0]);
      this.styleName = window.arguments[1];
    }
  },

  createStyleSheetList: function(array)
  {
    let styleList = document.getElementById("styleList"),
    checkbox,
    split;
    for (let i = 0; i < array.length; i++) {
      checkbox = document.createElement("checkbox");
      split = array[i].split("|||",2);
      checkbox.setAttribute("label",split[0]);
      checkbox.setAttribute("stylenum",i);
      checkbox.value = split[1];
      styleList.appendChild(checkbox);
    }
  },

  exit: function()
  {
    let styleList = document.getElementById("styleList").childNodes,
    styleText = "",
    count = 0;
    //loop through the checkboxes and grab the text
    for (let i = 0; i < styleList.length; i++) {
      let checkbox = styleList[i];
      if (checkbox.getAttribute("checked") == "true") {
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
    if (count == 0)
      return;
    //add an html namespace as i somewhat doubt everybody will (only slightly) and wrap it in an @-moz-doc-domain
    //let domain = window.opener.gBrowser.selectedTab.linkedBrowser.documentURI.host;
    let domain = window.opener.gBrowser.currentURI.host;
    styleText = '@namespace url(http://www.w3.org/1999/xhtml);\n@-moz-document domain("' +
                domain + '"){\n' + styleText + "\n}";
    //load it into stylish
    scCommon.addCode(styleText,this.styleName);
    /*
    let style = scCommon.styleInit(null,null,null,null,this.styleName,styleText,null,null,null),
    winName = scCommon.getWindowName("stylishEdit");
    scCommon.openEdit(winName,{style: style});
    */
  }

};
