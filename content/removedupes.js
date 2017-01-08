"use strict";
Components.utils.import("chrome://stylish-custom/content/common.jsm");
//cbCommon.dump();

var scRemovedupes = {

stylesTree: null,
stylesSort: null,
selected: null,

  init: function()
  {
    this.stylesTree = document.getElementById("style-tree-list");
    this.createStyleList();
  },

  createStyleList: function(sortBy)
  {
    //var scrollPos = this.stylesTree.treeBoxObject.getFirstVisibleRow();
    var service = scCommon.service,
    styleListE = document.getElementById("StyleList");

    //used to refresh by sorting method
    if (sortBy != "Refresh" && typeof sortBy != "undefined")
      this.stylesSort = sortBy;
    if (sortBy == "Refresh" && this.stylesSort != null)
      sortBy = this.stylesSort;
    else if (sortBy == "Refresh")
      sortBy = undefined;

    // remove all children from element
    scCommon.removeChild(styleListE);

    //create some vars
    var treeList = [],
    styleAmount = 0;

    //create the list
    scCommon.createStyleArray(treeList,sortBy);
    //remove non dupes
    treeList = this.compareStyles(treeList);

    //populate the list
    var d = document,style,item,row,nameCell,iDCell,removeCell;
    for (var i = 0; i < treeList.length; i++) {
      style = service.find(treeList[i].id,service.REGISTER_STYLE_ON_CHANGE);

      item = d.createElement("treeitem");
      row = d.createElement("treerow");
      nameCell = d.createElement("treecell");
      iDCell = d.createElement("treecell");
      removeCell = d.createElement("treecell");

      styleAmount++;
      item.id = style.id;
      item.value = false;
      iDCell.setAttribute("label",style.id);
      iDCell.setAttribute("class","iDCell");
      iDCell.setAttribute("editable","false");
      nameCell.setAttribute("label",style.name);
      nameCell.setAttribute("class","nameCell");
      nameCell.setAttribute("editable","false");
      removeCell.setAttribute("class","removeCell");

      row.appendChild(nameCell);
      row.appendChild(iDCell);
      row.appendChild(removeCell);
      item.appendChild(row);
      styleListE.appendChild(item);
    }
    document.title = scCommon.getMsg("RemoveDupes") + " (" + scCommon.getMsg("Styles") + ": " + styleAmount + ")";
/*
    this.stylesTree.treeBoxObject.scrollToRow(scrollPos);
    if (this.selected != null && this.selected != -1)
      this.stylesTree.view.selection.select(this.selected
    */
  },

  removeStyles: function(which)
  {
    var tree = this.stylesTree,
    service = scCommon.service,
    treeChildren = document.getElementById("StyleList").childNodes,
    style;
    if (which == "Ask") {
      var sel = tree.currentIndex;
      if (sel == -1)
        return;
      style = service.find(treeChildren[sel].id,service.REGISTER_STYLE_ON_CHANGE);
      stylishCommon.deleteWithPrompt(style);
    } else {
      for (var i = 0; i < treeChildren.length; i++) {
        style = service.find(treeChildren[i].id,service.REGISTER_STYLE_ON_CHANGE);
        if (style && treeChildren[i].value == true)
          style.delete();
      }
    }
    this.createStyleList();
  },

  compareStyles: function(styleList)
  {
    var newList = [];
    for (var i = 0; i < styleList.length; i++) {
      for (var j = 0; j < styleList.length; j++) {
        if (styleList[i].name != styleList[j].name || styleList[i].id == styleList[j].id)
          continue;
        newList.push(styleList[j]);
      }
    }
    return this.removeDupesFromArray(newList);
  },

  //http://www.developersnippets.com/2008/10/30/remove-duplicates-from-array-using-javascript/
  removeDupesFromArray: function(array)
  {
    //Adds new uniqueArr values to temp array
    function uniqueArr(a)
    {
      //var temp = new Array();
      var temp = [];
      for (var i = 0; i < a.length; i++) {
        if (!contains(temp,a[i])) {
          temp.length+=1;
          temp[temp.length-1]=a[i];
        }
      }
      return temp;
    }
    //Will check for the Uniqueness
    function contains(a,e)
    {
      for (var j = 0; j < a.length; j++) {
        if (a[j] == e)
          return true;
      }
      return false;
    }
    return uniqueArr(array);
  },

  //refresh the info dialog
  onExit: function()
  {
    var infoWin = scCommon.getWin("stylishCustomInfo");
    if (infoWin)
      infoWin.scInfo.createStyleList('Refresh');
  },

  openStyle: function()
  {
    var sel = this.stylesTree.currentIndex;
    if (sel == -1)
      return;
    var treeChildren = document.getElementById("StyleList").childNodes;
    scCommon.openEditForId(treeChildren[sel].id);
  },

  onTreeClicked: function(event)
  {
    var cellValue,row = {},col = {},child = {};
    this.stylesTree.treeBoxObject.getCellAt(event.clientX,event.clientY,row,col,child);

    var service = scCommon.service,
    treeChildren,
    style = service.find(this.stylesTree.view.getItemAtIndex(row.value).id,service.CALCULATE_META | service.REGISTER_STYLE_ON_CHANGE);

    if (event.type == "click") {
      this.selected = row.value;
      cellValue = this.stylesTree.view.getCellValue(row.value,col.value);
      if (cellValue == "")//if its blank it isn't the checkbox
        return;
      treeChildren = document.getElementById("StyleList").childNodes;
      if (cellValue == "true")
        treeChildren[row.value].value = true;
      else
        treeChildren[row.value].value = false;
    }

    cellValue = this.stylesTree.view.getCellValue(row.value,col.value);
    if (row.value == -1 || cellValue != "")//nothing selected | we won't want the checkbox
      return;
    style = service.find(this.stylesTree.view.getItemAtIndex(row.value).id,service.CALCULATE_META | service.REGISTER_STYLE_ON_CHANGE);
    var sel = this.stylesTree.currentIndex;
    treeChildren = document.getElementById("StyleList").childNodes;
    scCommon.openEditForId(treeChildren[sel].id);
  }
};
