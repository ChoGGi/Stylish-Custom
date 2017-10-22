"use strict";
/* jshint ignore:start */
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://stylish-custom/content/common.jsm");
/* jshint ignore:end */
//cbCommon.dump();
//scInfo.stylesTree.treeBoxObject scInfo.stylesTree.contentView scInfo.stylesTree.view

var service,
scInfo = {

  stylesTree: null,
  stylesSort: null,
  selected: null,
  styleAmount: null,
  styleAmountEnabled: null,
  styleAmountDisabled: null,
  styleListE: null,
  mutationOb: null,

  init: function()
  {
    service = scCommon.service;
    this.stylesTree = document.getElementById("style-tree-list");
    this.createStyleList();

    //change the focus
    let observer = {
      observe: function()
      {
        timer.cancel();
        let element = document.getElementById("SearchBox");
        if (element)
          element.focus();
      }
    };
    let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.init(observer,100,Ci.nsITimer.TYPE_ONE_SHOT);

    //update style info when style is saved
    this.mutationOb = new window.MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        let savedStyleID = mutation.target.getAttribute("stylish-custom-id");
        if (savedStyleID &&
            document.getElementById(savedStyleID) &&
            typeof scInfo.stylesTree.contentView !== "undefined") {
          let rowTree = scInfo.stylesTree.contentView
                        .getIndexOfItem(document.getElementById(savedStyleID)),
          row = document.getElementById(savedStyleID).firstChild,
          style = service.find(savedStyleID,service.REGISTER_STYLE_ON_CHANGE);

          for (let i = 0; i < row.children.length; i++) {
            let cell = row.children[i];
            switch (cell.className) {
              case "enabledCell":
                cell.setAttribute("value",style.enabled);
              break;
              case "nameCell":
                  cell.setAttribute("label",style.name);
              break;
              case "urlCell":
                  scCommon.setUrlCell(style,cell);
              break;
              case "tagsCell":
                cell.setAttribute("label",style.getMeta("tag",{}).join(" "));
              break;
              case "typeCell":
                cell.setAttribute("label",style.getMeta("type",{}).join(" "));
              break;
              case "iDCell":
                cell.setAttribute("label",style.id);
              break;
            }
            scInfo.stylesTree.treeBoxObject.invalidateRow(rowTree);
          }
        }
      });
    });
    let win = scCommon.getMainWindow().document.firstElementChild;
    this.mutationOb.observe(
                  win,{attributes:true,attributeFilter:["stylish-custom-id"]});
  },

  createStyleList: function(sortBy)
  {
    //let scrollPos = this.stylesTree.treeBoxObject.getFirstVisibleRow();
    this.styleListE = document.getElementById("StyleList");

    //used to refresh by sorting method
    if (sortBy != "Refresh" && typeof sortBy != "undefined")
      this.stylesSort = sortBy;
    if (sortBy == "Refresh" && this.stylesSort != null)
      sortBy = this.stylesSort;
    else if (sortBy == "Refresh")
      sortBy = undefined;

    //is it a search?
    let searchText = document.getElementById("SearchBox").value,
    doSearch;
    if (searchText != "")
      doSearch = 1;

    // remove all children from element
    scCommon.removeChild(this.styleListE);

    //create the list
    this.styleAmount = 0;
    this.styleAmountEnabled = 0;
    this.styleAmountDisabled = 0;
    let treeList = [];
    scCommon.createStyleArray(treeList,sortBy);

    //populate the list
    for (let i = 0; i < treeList.length; i++) {
      let style = service.find(treeList[i].id,service.REGISTER_STYLE_ON_CHANGE),
      searchType;

      if (doSearch) {
        //what are we searching for?
        searchType = document.getElementById("SearchType").value;
        if (searchType == "name")
          searchType = style.name;
        else if (searchType == "style")
          searchType = style.code;
        else
          searchType = style.getMeta(searchType,{}).toString();

        //skip not found
        if (searchType.toLowerCase().indexOf(searchText.toLowerCase()) == -1)
          continue;
      }

      scCommon.populateTree(style,this,0,null,document,null);
    }

    //which title to use
    let whichTitle = "Styles";
    if (doSearch)
      whichTitle = "StylesFound";

    document.title = scCommon.getMsg("StyleInfo") + " (" +
      scCommon.getMsg(whichTitle) + ":" + this.styleAmount + " " +
      scCommon.getMsg("Enabled") + ":" + this.styleAmountEnabled + " " +
      scCommon.getMsg("Disabled") + ":" + this.styleAmountDisabled + ")";

    /* hides style on palemoon when I'm scolled past the results
    this.stylesTree.treeBoxObject.scrollToRow(scrollPos);
    if (this.selected != null && this.selected != -1)
      this.stylesTree.view.selection.select(this.selected);
    */
  },

  newStyle: function()
  {
    //why do i want to add tab (thunderbird?)
    //maybe for android?
    if (scCommon.getMainWindow().Browser) {
      scCommon.getMainWindow().Browser
                          .addTab("chrome://stylish-custom/content/edit.xul");
      return;
    }
    scCommon.addCode();
  },

  deleteStyle: function()
  {
    let tree = this.stylesTree,
    start = {},
    end = {},
    numRanges = tree.view.selection.getRangeCount(),
    deleteList = [],
    treeChildren,
    treeItem,
    style;

    //create list of style(s) to be deleted
    for (let t = 0; t < numRanges; t++) {
      tree.view.selection.getRangeAt(t,start,end);
      for (let v = start.value; v <= end.value; v++) {
        treeChildren = document.getElementById("StyleList").childNodes;
        treeItem = treeChildren[v];
        style = service.find(treeItem.id,service.REGISTER_STYLE_ON_CHANGE);
        //send styles to array
        deleteList.push({style:style,tree:treeItem});
      }
    }

    let checkmarkAsk = document.getElementById("DeleteStyleAsk").checked;
    if (checkmarkAsk === true) {//ask to delete
      //create a list of names to display
      let listToDelete = [];
      deleteList.forEach(function (item) {
        listToDelete.push(item.style.name);
      });

      let returnValueIDontNeed = {},
      prompt = Services.prompt.select (
                null,scCommon.getMsg("Delete"),scCommon.getMsg("DeleteStyles"),
                listToDelete.length,listToDelete,returnValueIDontNeed
      );

      if (prompt == true) {
        deleteList.forEach(function (item) {
          item.style.delete();
          item.tree.parentNode.removeChild(item.tree);
        });
      }
    } else {//delete without asking
      deleteList.forEach(function (item) {
        item.style.delete();
        item.tree.parentNode.removeChild(item.tree);
      });
    }
  },

  openStyle: function()
  {
    let sel = this.stylesTree.currentIndex;
    if (sel == -1)
      return;
    let treeChildren = document.getElementById("StyleList").childNodes;
    scCommon.openEditForId(treeChildren[sel].id);
  },

  onTreeClicked: function(event)
  {
    let row = { },col = { },child = { };
    this.stylesTree.treeBoxObject
                        .getCellAt(event.clientX,event.clientY,row,col,child);
    if (row.value == -1) {//-1 means nothing selected
      if (event.type != "click")
        this.newStyle();
      return;
    }
    let style = service.find (
                this.stylesTree.view.getItemAtIndex(row.value).id,
                service.CALCULATE_META | service.REGISTER_STYLE_ON_CHANGE
    );
    if (event.type == "click") {
      this.selected = row.value;
      let cellValue = this.stylesTree.view.getCellValue(row.value,col.value);
      //if its blank it isn't the checkbox
      if (cellValue == "")
        return;
      if (cellValue == "true") {
        style.enabled = true;
        this.stylesTree.view
                      .getItemAtIndex(row.value).setAttribute("enabled",true);
      } else {
        this.stylesTree.view
                      .getItemAtIndex(row.value).removeAttribute("enabled");
        style.enabled = false;
      }
      style.save();
      this.updateChangedStyleAttr(style.id);
      return;
    }
    //dblclick
    if (event.button != 2) {//dbl left/middle click to open style
      let sel = this.stylesTree.currentIndex,
      treeChildren = document.getElementById("StyleList").childNodes;
      scCommon.openEditForId(treeChildren[sel].id);
      return;
    }
    //dbl right click to edit the name/tags
    if (this.stylesTree.editingRow != -1 &&
        col.value.id == "NameColumn" ||
        col.value.id == "TagsColumn") {

      while (this.stylesTree.editingRow != -1) {//pass events till user stops editing name
        Services.tm.currentThread.processNextEvent(true);
      }

      //save text
      let cellText = this.stylesTree.view.getCellText(row.value,col.value);
      if (col.value.id == "NameColumn") {
        style.name = cellText;
      } else if (col.value.id == "TagsColumn") {
        style.removeAllMeta("tag");
        if (cellText != "")
          style.addMeta("tag",cellText);
      }
      style.save();
      this.updateChangedStyleAttr(style.id);
    }
  },

  updateChangedStyleAttr: function(id)
  {
    //allows us to update style info in edit dialog
    let win = scCommon.getMainWindow().document.firstElementChild;
    win.setAttribute("stylish-custom-id-edit",id);
  }
};
