"use strict";
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://stylish-custom/content/common.jsm");
//cbCommon.dump();

var service;

var scInfo = {

  stylesTree: null,
  stylesSort: null,
  selected: null,

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
  },

  createStyleList: function(sortBy)
  {
    //let scrollPos = this.stylesTree.treeBoxObject.getFirstVisibleRow();
    let styleListE = document.getElementById("StyleList");

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
    scCommon.removeChild(styleListE);

    //create some vars
    let treeList = [],
    styleAmount = 0,
    styleAmountEnabled = 0,
    styleAmountDisabled = 0;

    //create the list
    scCommon.createStyleArray(treeList,sortBy);

    //populate the list
    let style,searchType,item,row,nameCell,enabledCell,typeCell,tagsCell,iDCell,urlCell,domain,url,urlprefix;
    for (let i = 0; i < treeList.length; i++) {
      style = service.find(treeList[i].id,service.REGISTER_STYLE_ON_CHANGE);

      if (doSearch) {
        //what are we searching for?
        searchType = document.getElementById("SearchType").value;
        if (searchType == "name")
          searchType = style.name;
        else if (searchType == "style")
          searchType = style.code;
        else searchType = style.getMeta(searchType,{}).toString();

        //skip not found
        if (searchType.toLowerCase().indexOf(searchText.toLowerCase()) == -1)
          continue;
      }

      let d = document;
      item = d.createElement("treeitem");
      row = d.createElement("treerow");
      nameCell = d.createElement("treecell");
      enabledCell = d.createElement("treecell");
      typeCell = d.createElement("treecell");
      tagsCell = d.createElement("treecell");
      iDCell = d.createElement("treecell");
      urlCell = d.createElement("treecell");

      styleAmount++;
      if (style.enabled == 1) {
        enabledCell.setAttribute("value",true);
        item.setAttribute("enabled",true);
        styleAmountEnabled++;
      } else
        styleAmountDisabled++;

      item.id = style.id;
      enabledCell.setAttribute("class","enabledCell");
      nameCell.setAttribute("label",style.name);
      nameCell.setAttribute("class","nameCell");
      iDCell.setAttribute("label",style.id);
      iDCell.setAttribute("editable","false");
      iDCell.setAttribute("class","iDCell");
      typeCell.setAttribute("label",style.getMeta("type",{}).join(" "));
      typeCell.setAttribute("editable","false");
      typeCell.setAttribute("class","typeCell");
      tagsCell.setAttribute("label",style.getMeta("tag",{}).join(" "));
      tagsCell.setAttribute("class","tagsCell");
      //make the urls look nice
      urlCell.setAttribute("editable","false");
      urlCell.setAttribute("class","urlCell");
      domain = style.getMeta("domain",{});
      url = style.getMeta("url",{});
      urlprefix = style.getMeta("url-prefix",{});

      if (domain != "" && urlprefix != "" && url != "")
        urlCell.setAttribute("label",domain + "," + urlprefix + "," + url);
      else if (domain != "" && urlprefix != "")
        urlCell.setAttribute("label",domain + "," + urlprefix);
      else if (domain != "" && url != "")
        urlCell.setAttribute("label",domain + "," + url);
      else if (urlprefix != "" && url != "")
        urlCell.setAttribute("label",urlprefix + "," + url);
      else if (domain != "")
        urlCell.setAttribute("label",domain);
      else if (urlprefix != "")
        urlCell.setAttribute("label",urlprefix);
      else if (url != "")
        urlCell.setAttribute("label",url);
      else
        urlCell.setAttribute("label","");

      row.appendChild(enabledCell);
      row.appendChild(nameCell);
      row.appendChild(urlCell);
      row.appendChild(tagsCell);
      row.appendChild(typeCell);
      row.appendChild(iDCell);
      item.appendChild(row);
      styleListE.appendChild(item);
    }
    //which title to use
    let whichTitle = "Styles";
    if (doSearch)
      whichTitle = "StylesFound";

    document.title = scCommon.getMsg("StyleInfo") + " (" +
      scCommon.getMsg(whichTitle) + ":" + styleAmount + " " +
      scCommon.getMsg("Enabled") + ":" + styleAmountEnabled + " " +
      scCommon.getMsg("Disabled") + ":" + styleAmountDisabled + ")";

    /* hides style on palemoon when I'm scolled past the results
    this.stylesTree.treeBoxObject.scrollToRow(scrollPos);
    if (this.selected != null && this.selected != -1)
      this.stylesTree.view.selection.select(this.selected);
    */
  },

  newStyle: function()
  {
    function windowClosed()
    {
      newStyleWin.removeEventListener("unload",windowClosed,false);
      //refresh style list
      scInfo.createStyleList();
    }
    function windowOpened()
    {
      newStyleWin.removeEventListener("load",windowOpened,false);
      //wait for it to close
      newStyleWin.addEventListener("unload",windowClosed,false);
    }

    //why do i want to add tab (thunderbird?)
    //maybe for android?
    if (scCommon.getMainWindow().Browser) {
      scCommon.getMainWindow().Browser.addTab("chrome://stylish-custom/content/edit.xul");
      return;
    }
    let openNewStyle = scCommon.openEdit(scCommon.getWindowName("stylishEdit"),{code: ''}).name,
    newStyleWin = scCommon.getWin(openNewStyle.name);

    //wait for it to open
    newStyleWin.addEventListener("load",windowOpened,false);
  },

  deleteStyle: function()
  {
    let tree = this.stylesTree,
    //sel = tree.currentIndex,
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

      let uselessReturnValueIDontNeed = {},
      prompt = Services.prompt.select(null,scCommon.getMsg("Delete"),scCommon.getMsg("DeleteStyles"),listToDelete.length,listToDelete,uselessReturnValueIDontNeed);

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

  onKeyPress: function(event)
  {
    if (event.charCode != 32)
      return;
    let tree = this.stylesTree.view,
    rangeCount = tree.selection.getRangeCount();
    for (let i = 0; i < rangeCount; i++) {
      let start = {},
      end = {};
      tree.selection.getRangeAt(i,start,end);
      for (let c = start.value; c <= end.value; c++) {
        let treeRow = tree.getItemAtIndex(c).id;
        if (typeof treeRow != "undefined") {
          let style = service.find(treeRow,service.REGISTER_STYLE_ON_CHANGE);
          if (style.enabled == true)
            style.enabled = false;
          else
            style.enabled = true;
          style.save();
          this.createStyleList();
        }
      }
    }
  },

  onTreeClicked: function(event)
  {
    let row = { },col = { },child = { };
    this.stylesTree.treeBoxObject.getCellAt(event.clientX,event.clientY,row,col,child);
    if (row.value == -1) {//-1 means nothing selected
      if (event.type != "click")
        this.newStyle();
      return;
    }
    let style = service.find(this.stylesTree.view.getItemAtIndex(row.value).id,service.CALCULATE_META | service.REGISTER_STYLE_ON_CHANGE);
    if (event.type == "click") {
      this.selected = row.value;
      let cellValue = this.stylesTree.view.getCellValue(row.value,col.value);
      //if its blank it isn't the checkbox
      if (cellValue == "")
        return;
      if (cellValue == "true") {
        style.enabled = true;
        this.stylesTree.view.getItemAtIndex(row.value).setAttribute("enabled",true);
      } else {
        this.stylesTree.view.getItemAtIndex(row.value).removeAttribute("enabled");
        style.enabled = false;
      }
      style.save();
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
    if (this.stylesTree.editingRow != -1 && col.value.id == "NameColumn" || col.value.id == "TagsColumn") {
      this.stylesTree.removeEventListener("keypress",function(event) {scInfo.onKeyPress(event);},false);
      while (this.stylesTree.editingRow != -1) {//pass events till user stops editing name
        Services.tm.currentThread.processNextEvent(true);
      }
      this.stylesTree.addEventListener("keypress",function(event) {scInfo.onKeyPress(event);},false);
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
    }
  }
};
