"use strict";
/* jshint ignore:start */
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("chrome://stylish-custom/content/common.jsm");
/* jshint ignore:end */
//scCommon.dump();

var locationE,treeList,service,
scImport = {

  stylesTree: null,
  selected: null,
  styleListE: null,
  styleAmount: null,

  init: function()
  {
    service = scCommon.service;
    this.styleListE = document.getElementById("StyleList");
    locationE = document.getElementById("Location");
    locationE.value = scCommon.prefs.getCharPref("custom.importpath");

    this.stylesTree = document.getElementById("style-tree-list");
    this.createStyleList();
  },

  createStyleList: function()
  {
    //let scrollPos = this.stylesTree.treeBoxObject.getFirstVisibleRow();
    this.styleAmount = 0;
    treeList = [];

    //remove all children from element
    scCommon.removeChild(this.styleListE);

    //saved path or user choice
    let PickOrUsePath = false,
    fp;
    if (scCommon.prefs.prefHasUserValue("custom.importpath") ||
        locationE.value != "") {//if location entered
      PickOrUsePath = "Path";
    } else {
      let importWin = scCommon.getWin("stylishCustomImport");
      const nsIFilePicker = Ci.nsIFilePicker;
      fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
      fp.init(importWin,scCommon.getMsg("ImportTitle"),
                                                  nsIFilePicker.modeGetFolder);
      if (fp.show() != nsIFilePicker.returnCancel)
        PickOrUsePath = "FilePicker";
    }

    if (PickOrUsePath != false) {
      //saved path or user choice
      let file;
      if (PickOrUsePath == "FilePicker") {
        file = fp.file;
        locationE.value = file.path;
      } else {
        file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
        file.initWithPath(locationE.value);
      }

      //if no files abort
      let entries = file.directoryEntries;
      //make an array of .css/.xml files
      while(entries.hasMoreElements()) {
        let entry = entries.getNext();
        entry.QueryInterface(Ci.nsIFile);
        if (entry.leafName.search(/\.css$/i) != -1 ||
            entry.leafName.search(/\.xml$/i) != -1) {
          treeList.push(entry);
        }
      }
      treeList.sort(scCommon.sortByleafName);

      //populate the list
      for (let i = 0; i < treeList.length; i++) {
        scCommon.populateTree(null,this,1,treeList,document,i);
      }

      document.title = scCommon
                      .getMsg("ImportStyles") + " (" + this.styleAmount + ")";
    } else {
      window.close();
    }
/*
    this.stylesTree.treeBoxObject.scrollToRow(scrollPos);
    if (this.selected != null && this.selected != -1)
      this.stylesTree.view.selection.select(this.selected);
    */
  },

  onSelect: function(event)
  {
    let row = {},col = {},child = {};
    this.stylesTree.treeBoxObject
                        .getCellAt(event.clientX,event.clientY,row,col,child);
    this.selected = row.value;
  },

  openStyle: function(event)
  {
    if (event.button === 2)//left/middle to open style
      return;
    let stylesTree = document.getElementById("style-tree-list"),
    sel = stylesTree.currentIndex,
    treeChildren = document.getElementById("StyleList").childNodes;

    let name = treeChildren[sel].getAttribute("styleNameType"),
    file = new FileUtils.File(locationE.value),
    code;

    file.append(name);
    if (name.toLowerCase().indexOf(".css") !== -1)
      code = scCommon.readFile(file.path,"Text");
    else
      return; //maybe I should make it open the first style in an xml...

    scCommon.addCode(code,name);
  },

  importStyles: function()
  {
    //are there any styles to import
    if (!this.styleListE.hasChildNodes())
      return;
    let importE = document.getElementById("save"),
    styleReg = scCommon.prefsExt.getBoolPref("styleRegistrationEnabled");
    //disable the import button till we finish
    importE.setAttribute("disabled",true);
    //disable style registration (imports faster with styles disabled...)
    if (styleReg == true)
      scCommon.prefsExt.setBoolPref("styleRegistrationEnabled",false);

    let children = this.styleListE.childNodes,
    i1,i2,i3,iT,
    oldStyleList = [];
    service.list(service.REGISTER_STYLE_ON_CHANGE,{}).forEach(function(style) {
        oldStyleList.push(style);
    });

    function importStylesLoop(styleEnabled,styleNameType,styleName)
      {
      let name,enabled,code,styleUrl,updateUrl,md5Url,applyBackgroundUpdates;
      for (i2 = 0; i2 < treeList.length; i2++) {
        if (styleNameType != treeList[i2].leafName)
          continue;

        let overWrite = document.getElementById("overWriteStyles").checked,
        fileData = scCommon.readFile(treeList[i2].path,"Text"),
        style = "";

        //CSS
        if (styleNameType.search(/\.css$/i) >= 0) {
          //overwrite?
          let styleExists = null;
          for (iT = 0; iT < oldStyleList.length; iT++) {
            if (styleName == oldStyleList[iT].name)
              styleExists = oldStyleList[iT].id;
          }

          style = service.find(styleExists,
                  service.CALCULATE_META | service.REGISTER_STYLE_ON_CHANGE
          );
          if (style && overWrite == true) {
            //if there's a style then overwrite
            style.code = fileData;
            style.save();
          } else {
            //else it's a new style
            style = scCommon.styleInit(
                                null,null,null,null,styleName,
                                fileData.replace(/\r/g,""),styleEnabled,null,null
            );
            style.save();
          }
          //i++;
          continue;
        }

        //XML
        fileData = fileData.replace(/\n/g,"ChoGGisezNewLine");
        let domParser = new DOMParser();
        fileData = domParser.parseFromString(fileData,"text/xml")
                  .firstChild.childNodes;
        //fileData = scCommon.parseXML(fileData).firstChild.childNodes;
        //remove text nodes from xml and create style list
        let styles = [];
        for (iT = 0; iT < fileData.length; iT++) {
          if (fileData[iT] == "[object Element]" &&
                                          fileData[iT].hasAttribute("name")) {
            styles.push(fileData[iT]);
          }
        }
        //create styles from xml
        for (i3 = 0; i3 < styles.length; i3++) {
          name = styles[i3].getAttribute("name");
          //re-add line feeds/double quotes
          let styleData = styles[i3].firstChild;
          if (styleData == "[object Text]")
            styleData = styles[i3].firstChild.nextSibling;

          code = styleData.getAttribute("code")
                .replace(/ChoGGisezNewLine/g,"\n")
                .replace(/&quot;/g,"\"");
          if (styleData.getAttribute("enabled") == "false")
            enabled = false;
          else
            enabled = true;
          styleUrl = styleData.getAttribute("styleurl");
          updateUrl = styleData.getAttribute("updateurl");
          md5Url = styleData.getAttribute("md5url");
          applyBackgroundUpdates = styleData
                                    .getAttribute("applyBackgroundUpdates");
          //new style or replace old one
          style = service.find(parseInt(
                  styleData.getAttribute("id")),
                  service.CALCULATE_META | service.REGISTER_STYLE_ON_CHANGE
          );
          if (style && overWrite == true) {
            style.url = styleUrl;
            style.updateUrl = updateUrl;
            style.md5Url = md5Url;
            style.name = name;
            style.originalCode = style.code;
            style.code = code;
            style.enabled = enabled;
            style.applyBackgroundUpdates = applyBackgroundUpdates;
          } else {
            style = scCommon.styleInit(
                          styleUrl,null,updateUrl,md5Url,
                          name,code,enabled,null,null
            );
          }
          //add tags
          style.removeAllMeta("tag");
          style.addMeta("tag",styleData.getAttribute("tags"));
          //and save it
          style.save();
        }
      }
    }

    for (i1 = 0; i1 < children.length; i1++) {

      let StyleListItemImport = children[i1].firstChild.firstChild
                              .nextSibling.getAttribute("value"),
      StyleListItemEnabled = children[i1].firstChild.firstChild
                            .nextSibling.nextSibling.getAttribute("value");

      if (StyleListItemImport !== "true")
        continue;

      let styleNameType = children[i1].getAttribute("styleNameType"),
      styleName = children[i1].getAttribute("styleName");

      if (StyleListItemEnabled == "true")
        importStylesLoop(true,styleNameType,styleName);
      else
        importStylesLoop(false,styleNameType,styleName);
    }

    //turn style reg back on
    if (styleReg == true)
      scCommon.prefsExt.setBoolPref("styleRegistrationEnabled",true);
    //re-enable import button
    importE.removeAttribute("disabled");
    //give a tooltip to say when we're done
    scCommon.tooltip("Finished","StyleList",document);
  },

  //save path
  unload: function()
  {
    let locValue = document.getElementById("Location").value;
    scCommon.prefs.setCharPref("custom.importpath",locValue);
  }

};