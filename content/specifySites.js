"use strict";
//the below is (mostly) from Stylish v0.5.9, so different license applies
/* jshint ignore:start */
const Cu = Components.utils;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://stylish-custom/content/common.jsm");
/* jshint ignore:end */
//cbCommon.dump();

var scSpecifySites = {

  urlE: null,
  siteListE: null,
  addE: null,
  siteListTreeE: null,

  init: function()
  {
    this.urlE = document.getElementById("url");
    this.siteListE = document.getElementById("site-list");
    this.addE = document.getElementById("add");
    this.siteListTreeE = document.getElementById("site-list-tree");

    this.urlE.focus();
  },

  addSpecifySiteEntry: function()
  {
    let typeGroup = document.getElementById("type").selectedItem,
    url = this.urlE.value,
    uri,ios;

    if (url.length == 0)
      return;
    switch (typeGroup.value) {
      case "url":
        //Make a URI. This will throw if it's not valid
        try {
          ios = Services.io;
          uri = ios.newURI(url,"UTF-8",null);
        } catch(e) {
          try {
            //maybe someone forgot to put the protocol in. let's assume they meant http://
            uri = ios.newURI("http://" + url,"UTF-8",null);
          } catch(e) {
            //I give up
            alert("urlNotValid");
            return;
          }
        }
        url = uri.spec;
      break;
      case "url-prefix":
        //not really any way to validate this other than making sure the protocol is there
        if (url.indexOf("://") == -1)
          url = "http://" + url;
      break;
      case "regexp":
        //validate? Pah!
        url = '"' + url + '"';
      break;
      case "domain":
        //The user might have mistakenly included the protocol. Let's strip it.
        let position = url.indexOf("://");
        if (position > -1)
          url = url.substring(position + 3,url.length);
      break;
      default:
        alert("Unrecognized site entry type '" + typeGroup.value + "'");
        return;
      //break;
    }

    //add it to the list
    let d = document,
    item = d.createElement("treeitem"),
    row = d.createElement("treerow"),
    typeCell = d.createElement("treecell"),
    siteCell = d.createElement("treecell");

    typeCell.setAttribute("label",typeGroup.label);
    typeCell.setAttribute("value",typeGroup.value);
    siteCell.setAttribute("label",url);
    row.appendChild(typeCell);
    row.appendChild(siteCell);
    item.appendChild(row);
    this.siteListE.appendChild(item);

    this.urlE.value = "";
    this.urlE.focus();
    this.addE.disabled = true;
  },

  close: function()
  {
    let data = [],currentRow;
    for (let i = 0; i < this.siteListE.childNodes.length; i++) {
      currentRow = this.siteListE.childNodes[i].firstChild;
      data[i] = {
        type: currentRow.firstChild.getAttribute("value"),
        site: currentRow.childNodes[1].getAttribute("label")
      };
    }
    window.arguments[0](data);
  },

  urlKeyPress: function(aEvent)
  {
    if (aEvent.keyCode == 13) {
      this.addSpecifySiteEntry();
      aEvent.preventDefault();
    }
  },

  urlInput: function()
  {
    this.addE.disabled = !(this.urlE.value);
  },

  siteListKeyPress: function(aEvent)
  {
    //delete
    if (aEvent.keyCode == 46)
      this.deleteSiteList();
  },

  deleteSiteList: function()
  {
    let itemsToRemove = this.getSelectedStyles();

    for (let i = 0; i < itemsToRemove.length; i++) {
      itemsToRemove[i].parentNode.removeChild(itemsToRemove[i]);
    }
  },

  changeSelection: function()
  {
    document.getElementById("delete").disabled =
                                        (this.getSelectedStyles().length == 0);
  },

  getSelectedStyles: function()
  {
    let selectedItems = [],
    rangeCount = this.siteListTreeE.view.selection.getRangeCount();

    for (let i = 0; i < rangeCount; i++) {
      let start = {};
      let end = {};
      this.siteListTreeE.view.selection.getRangeAt(i,start,end);
      for (let c = start.value; c <= end.value; c++) {
        selectedItems[selectedItems.length] =
                                    this.siteListTreeE.view.getItemAtIndex(c);
      }
    }
    return selectedItems;
  }

};