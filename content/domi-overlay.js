"use strict";
//the below is from Stylish v1.4.3/2.0.4, so different license applies
/* jshint ignore:start */
if (typeof (Cu) === "undefined")
  var Cu = Components.utils;
if (typeof (Cc) === "undefined")
  var Cc = Components.classes;
Cu.import("chrome://stylish-custom/content/common.jsm");
/* jshint ignore:end */
//scCommon.dump();

var scDomi = {

  init: function()
  {
    document.getElementById("ppDOMContext")
            .addEventListener("popupshowing",scDomi.nodePopupShowing,false);
  },

  nodePopupShowing: function()
  {
    document.getElementById("copy-selector2").disabled =
                                    !(viewer.selectedNode instanceof Element);
  },

  showSelectors: function(event)
  {
    let selectors = this.generateSelectors(viewer.selectedNode),
    popup = event.target;
    selectors.forEach(function(selector)
    {
      scDomi.addSelectorMenuItem(popup,selector);
    });
  },

  addSelectorMenuItem: function(popup,selector)
  {
    let menuitem = document.createElement("menuitem");
    popup.appendChild(menuitem);
    menuitem.setAttribute("label",selector);
    menuitem.addEventListener("command",function(event) {
      scDomi.copySelectorToClipboard(event);
    },false);
  },

  copySelectorToClipboard: function(event)
  {
    Cc["@mozilla.org/widget/clipboardhelper;1"]
      .getService(Components.interfaces.nsIClipboardHelper)
      .copyString(event.target.getAttribute("label"));
  },

  generateSelectors: function(node)
  {
    if (!(node instanceof Element))
      return;

    let selectors = [];
    //element selector
    selectors.push(node.nodeName + ",");
    //id selector
    if (node.hasAttribute("id"))
      selectors.push("#" + node.getAttribute("id") + ",");
    //class selector
    if (node.hasAttribute("class")) {
      let classes = node.getAttribute("class").split(/\s+/);
      selectors.push("." + classes.join(".") + ",");
    }
    //attribute selectors. it's pointless to create a complicated attribute selector including an id or only a class
    if (node.attributes.length > 1 || (
                                      node.attributes.length == 1 &&
                                      node.attributes[0].name != "id" &&
                                      node.attributes[0].name != "class")) {
      let selector = node.nodeName;
      for (let i = 0; i < node.attributes.length; i++) {
        if (node.attributes[i].name != "id")
          selector += "[" + node.attributes[i].name +
                                      "=\"" + node.attributes[i].value + "\"]";
      }
      selectors.push(selector + ",");
    }
    //position selector - worthless if we have an id
    if (!node.hasAttribute("id") && node != node.ownerDocument.documentElement)
      selectors.push(stylishCommon.getPositionalSelector(node) + ",");

    return selectors;
  }

};

window.addEventListener("load",function load()
{
  window.removeEventListener("load",load,false);
  scDomi.init();
},false);
