"use strict";
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("chrome://stylish-custom/content/common.jsm");
//cbCommon.dump();

var styleListE,locationE,styleList,service;

var scExport = {

  stylesTree: null,
  selected: null,
  styleAmount: null,
  styleAmountEnabled: null,
  styleAmountDisabled: null,

  init: function()
  {
    service = scCommon.service;
    styleListE = document.getElementById("StyleList");
    locationE = document.getElementById("Location");
    locationE.value = scCommon.prefs.getCharPref("custom.exportpath");
    var XMLName = document.getElementById("XMLName");
    XMLName.value = scCommon.prefs.getCharPref("custom.xmlname");

    //if we export XML
    if (scCommon.prefs.getIntPref("custom.exporttype") == 1) {
      document.getElementById("ExportXML").checked = true;
      XMLName.disabled = false;
      document.getElementById("GroupXML").disabled = false;
    }

    this.stylesTree = document.getElementById("style-tree-list");
    //create a list
    this.createStyleList();
  },

  createStyleList: function(sortBy)
  {
    //var scrollPos = this.stylesTree.treeBoxObject.getFirstVisibleRow();

    styleList = [];
    this.styleAmount = 0;
    this.styleAmountEnabled = 0;
    this.styleAmountDisabled = 0;

    //used to refresh by sorting method
    if (sortBy != "Refresh" && typeof sortBy != "undefined")
      this.stylesSort = sortBy;
    if (sortBy == "Refresh" && this.stylesSort != null)
      sortBy = this.stylesSort;
    else if (sortBy == "Refresh")
      sortBy = undefined;

    //is it a search?
    var searchText = document.getElementById("SearchBox").value,
    doSearch;
    //if (searchText != "")
    if (searchText != "")
      doSearch = 1;

    //get list of checked styles
    this.storeChecked();

    // remove all children from element
    scCommon.removeChild(styleListE);

    //create the list
    scCommon.createStyleArray(styleList,sortBy);

    //populate the list
    var style;
    for (var i = 0; i < styleList.length; i++) {
      style = service.find(styleList[i].id,service.REGISTER_STYLE_ON_CHANGE);

      if (doSearch) {
        //what are we searching for?
        var searchType = document.getElementById("SearchType").value;
        if (searchType == "name")
          searchType = style.name;
        else if (searchType == "style")
          searchType = style.code;
        else searchType = style.getMeta(searchType,{}).toString();

        //skip not found
        if (searchType.toLowerCase().indexOf(searchText.toLowerCase()) == -1)
          continue;
      }
      var d = document,
      item = d.createElement("treeitem"),
      row = d.createElement("treerow"),
      exportCell = d.createElement("treecell"),
      nameCell = d.createElement("treecell"),
      enabledCell = d.createElement("treecell");

      nameCell.setAttribute("label",styleList[i].name);
      nameCell.setAttribute("styleid",styleList[i].id);
      nameCell.setAttribute("class","nameCell");
      if (style.enabled == 1) {
        this.styleAmountEnabled++;
        enabledCell.setAttribute("value",true);
      } else this.styleAmountDisabled++;

      enabledCell.setAttribute("class","enabledCell");
      exportCell.setAttribute("class","exportCell");
      item.setAttribute("styleId",styleList[i].id);
      item.setAttribute("styleName",styleList[i].name);

      row.appendChild(nameCell);
      row.appendChild(exportCell);
      row.appendChild(enabledCell);
      item.appendChild(row);
      styleListE.appendChild(item);
      this.styleAmount++;
    }
    //which title to use
    var whichTitle = "Styles";
    if (doSearch)
      whichTitle = "StylesFound";

    document.title = scCommon.getMsg("ExportStyles") + " (" +
      scCommon.getMsg(whichTitle) + ":" + this.styleAmount + " " +
      scCommon.getMsg("Enabled") + ":" + this.styleAmountEnabled + " " +
      scCommon.getMsg("Disabled") + ":" + this.styleAmountDisabled + ")";

    this.restoreChecked();
/*
    this.stylesTree.treeBoxObject.scrollToRow(scrollPos);
    if (this.selected != null && this.selected != -1)
      this.stylesTree.view.selection.select(this.selected);
    */
  },

  checkedList: null,
  storeChecked: function()
  {
    var children = styleListE.childNodes;
    //this.checkedList;

    this.checkedList = [];
    for (var i = 0; i < children.length; i++)
      this.checkedList.push({id: children[i].getAttribute("styleId"),enabled: children[i]
        .firstChild.firstChild.nextSibling.getAttribute("value")});
  },

  xmlBrowse: function()
  {
    const nsIFilePicker = Ci.nsIFilePicker;
    //open a file dialog
    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(scCommon.getWin("stylishCustomExport"),scCommon.getMsg("ExportTitleFile"),nsIFilePicker.modeSave);
    //show filepicker and set path
    fp.appendFilter("Stylish Styles (xml|css)","*.xml,*.css");
    if (fp.show() == nsIFilePicker.returnCancel)
      return;
    //update the xml name path
    var name = document.getElementById("XMLName");
    name.value = fp.file.path;
  },

  restoreChecked: function()
  {
    var children = styleListE.childNodes,
    i,j;

    for (i = 0; i < children.length; i++) {
      for (j = 0; j < this.checkedList.length; j++) {
        if (!children[i] || !this.checkedList[j])
          continue;
        if (children[i].getAttribute("styleId") == this.checkedList[j].id)
          children[i].firstChild.firstChild.nextSibling
            .setAttribute("value",this.checkedList[j].enabled);
      }
    }
  },

  onSelect: function(event)
  {
    var row = { },col = { },child = { };
    this.stylesTree.treeBoxObject.getCellAt(event.clientX,event.clientY,row,col,child);
    this.selected = row.value;
  },

  onTreeDblClicked: function(event)
  {
    if (event.button != 2) {//left/middle to open style
      var stylesTree = document.getElementById("style-tree-list"),
      sel = stylesTree.currentIndex,
      treeChildren = document.getElementById("StyleList").childNodes;

      scCommon.openEditForId(treeChildren[sel].getAttribute("styleId"));
    }
  },

  //remove bad chars from xml name

  checkXMLnameColour: null,
  checkXMLname: function(event)
  {
    if (event.which != 47 && event.which != 42 && event.which != 124 && event.which != 60 && event.which != 62 && event.which != 63 && event.which != 34)
      return;
    event.preventDefault();
    var XMLName = document.getElementById("XMLName");
    //let user know
    XMLName = document.getAnonymousElementByAttribute(XMLName,"anonid","input");
    if (this.checkXMLnameColour == null)//store original colour
      this.checkXMLnameColour = scCommon.getStyle(XMLName,window).backgroundColor;

    XMLName.style.backgroundColor = "red";
    var observer = {
      observe: function ()
      {
        XMLName.style.backgroundColor = scExport.checkXMLnameColour;
        timer.cancel();
      }
    };
    var timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.init(observer,250,Ci.nsITimer.TYPE_ONE_SHOT);
  },


  //toggles textboxes/checkmarks
  exportChangedXML: function(which)
  {
    var exportXML = document.getElementById("ExportXML"),
    groupXML = document.getElementById("GroupXML"),
    XMLName = document.getElementById("XMLName"),
    XMLBrowse = document.getElementById("XMLBrowse");

    //save export as option
    if (exportXML.checked == true)
      scCommon.prefs.setIntPref("custom.exporttype",1);
    else
      scCommon.prefs.setIntPref("custom.exporttype",0);

    if (which == "Group") {
      XMLName.disabled = !groupXML.checked;
      XMLBrowse.disabled = !groupXML.checked;
      return;
    }
    groupXML.disabled = !exportXML.checked;
    if (groupXML.checked == true) {
      XMLName.disabled = !exportXML.checked;
      XMLBrowse.disabled = !exportXML.checked;
      return;
    }
    XMLName.disabled = true;
    XMLBrowse.disabled = true;


  },

  exportStyles: function()
  {
    var PickOrUsePath = false,
    fp;

    //saved path
    if (scCommon.prefs.prefHasUserValue("custom.exportpath" ||
        locationE.value != ""))
      PickOrUsePath = "Path";
    else {
      const nsIFilePicker = Ci.nsIFilePicker;
      var win = scCommon.getWin("stylishCustomExport");
      fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
      fp.init(win,scCommon.getMsg("ExportTitle"),nsIFilePicker.modeGetFolder);
      if (fp.show() != nsIFilePicker.returnCancel)
        PickOrUsePath = "FilePicker";
    }

    //no path saved or picked
    if (PickOrUsePath == false)
      return;

    var children = styleListE.childNodes,
    ExportXML = document.getElementById("ExportXML").checked,
    GroupXML = document.getElementById("GroupXML").checked,
    exportList = [],
    file;

    //init the file object
    if (PickOrUsePath == "FilePicker")
      file = fp.file;
    else {
      file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
      file.initWithPath(locationE.value);
    }
    //check if the folder exists or create it
    if (!file.exists() || !file.isDirectory())
      file.create(Ci.nsIFile.DIRECTORY_TYPE,parseInt("0777",8));

    //create the export list
    var styleAmount = 0,
    styleAmountEnabled = 0,
    styleAmountDisabled = 0;

    for (var i = 0; i < children.length; i++) {
      //if not checked or if the ids don't match skip it
      if (children[i].firstChild.firstChild.nextSibling.getAttribute("value") != "true" || children[i].getAttribute("styleId") != styleList[i].id)
        continue;
      styleAmount++;
      if (children[i].firstChild.firstChild.nextSibling.nextSibling.getAttribute("value") == "true")//enabled?
        styleAmountEnabled++;
      else
        styleAmountDisabled++;
      //clean up the name before export
      //var fileName = scCommon.regexEscape(children[i].getAttribute("styleName"));
      var fileName = children[i].getAttribute("styleName").replace(/\\/g,"").replace(/\//g,"").replace(/\?/g,"").replace(/</g,"").replace(/\>/g,"").replace(/\*/g,"").replace(/\:/g,"").replace(/\"/g,"").replace(/\|/g,"");
      if (ExportXML == false || GroupXML == false) {//export as css or un-grouped xml
        //init the file object
        if (PickOrUsePath == "FilePicker")
          file = fp.file;
        else {
          file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
          file.initWithPath(locationE.value);
        }
        //export as css
        if (ExportXML == false) {
          file.append(fileName + ".css");
          this.writeStylesCSS(styleList[i],file);
        //export as xml none grouped
        } else if (GroupXML == false) {
          file.append(fileName + ".xml");
          exportList[exportList.length] = styleList[i];
          this.writeStylesXML(exportList,file,styleAmount,styleAmountEnabled,styleAmountDisabled);
        }
      } else exportList[exportList.length] = styleList[i];
    }
    function regExName(name){
      return name.value.replace(/\\/g,"").replace(/\//g,"").replace(/\?/g,"").replace(/</g,"").replace(/\>/g,"").replace(/\*/g,"").replace(/\:/g,"").replace(/\"/g,"").replace(/\|/g,"");
    }
    //export as grouped xml
    if (ExportXML == true && GroupXML == true) {
      var XMLName = document.getElementById("XMLName");
      //if (XMLName.value == "") {
      if (XMLName.value === "") {
        alert(scCommon.getMsg("NoXMLName"));
        return;
      }
      if (XMLName.value.search(":") !== -1) {//probably a path
        file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
        file.initWithPath(XMLName.value);
        try {
          if (file.exists() == "false" || file.isDirectory() == "false")
            file.create(Ci.nsIFile.NORMAL_FILE_TYPE,parseInt("0777",8));
        } catch(e) {
          scCommon.catchError(e);
        }
      } else {
        if (XMLName.value.search(".xml") === -1)//add .xml to the end
          file.append(regExName(XMLName) + ".xml");
        else
          file.append(regExName(XMLName));
      }
      this.writeStylesXML(exportList,file,styleAmount,styleAmountEnabled,styleAmountDisabled);
    }

    //give a tooltip to say when we're done
    scCommon.tooltip("Finished","StyleList",document);
  },

  writeStylesXML: function(exportList,file,styleAmount,styleAmountEnabled,styleAmountDisabled)
  {
    var overwrite = document.getElementById("overWriteStyles").checked;
    if (file.exists()) {
      if (overwrite == false)
        return;
      else file.remove(false);
    }
    //make dom tree of styles
    var DOMTree = this.createDOMTree(exportList,styleAmount,styleAmountEnabled,styleAmountDisabled),
    //output to file
    oFOStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
    oFOStream.init(file,parseInt("0x02",16)|parseInt("0x08",16)|parseInt("0x20",16),parseInt("0664",8),0); // write, create, truncate
    (new XMLSerializer()).serializeToStream(DOMTree,oFOStream,""); // rememeber, doc is the DOM tree
    oFOStream.close();

  },

  toggleSelected: function()
  {
    if (this.selectedEnabledStyles == false)
      this.selectedEnabledStyles = true;
    else
      this.selectedEnabledStyles = false;
  },

  selectedEnabledStyles: false,
  selectEnabledStyles: function()
  {
    if (this.selectedEnabledStyles == false)
      this.selectedEnabledStyles = true;
    else
      this.selectedEnabledStyles = false;

    var styleListE = document.getElementById("StyleList");
    if (!styleListE.hasChildNodes())
      return;
    var children = styleListE.childNodes,
    treecell;

    for (var i = 0; i < children.length; i++) {
      treecell = children[i].firstChild.firstChild.nextSibling;
      if (!treecell.nextSibling.hasAttribute("value"))
        continue;
      if (treecell.nextSibling.getAttribute("value") != "true")
        continue;
      treecell.setAttribute("value",this.selectedEnabledStyles);
    }
  },

  writeStylesCSS: function(style,file)
  {
    var overwrite = document.getElementById("overWriteStyles").checked;
    if (file.exists()) {
      if (overwrite == false)
        return;
      else file.remove(false);
    }

    var foStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
    foStream.init(file,parseInt("0x02",16)|parseInt("0x08",16)|parseInt("0x20",16),parseInt("0664",8),0); // write, create, truncate
    var converter = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
    converter.init(foStream,"UTF-8",0,0);
    //make sure we get style from db (if it's been changed since window opened)
    var s = service.find(style.id,service.REGISTER_STYLE_ON_CHANGE);
    converter.writeString(s.code);
    converter.close();
    foStream.close();
  },

  //convert a list of styles to an xml doc
  createDOMTree: function(exportList,styleAmount,styleAmountEnabled,styleAmountDisabled)
  {
    var doc = document.implementation.createDocument("","",null),
    styleRoot = doc.createElement("styles"),
    style, aStyleTop, aStyle;

    styleRoot.setAttribute("Amount",styleAmount);
    styleRoot.setAttribute("Enabled",styleAmountEnabled);
    styleRoot.setAttribute("Disabled",styleAmountDisabled);

    function cleanUp(which,name)
    {
      if (typeof which !== "undefined" && which != null)
        aStyle.setAttribute(name,which);
      else
        aStyle.setAttribute(name,"");
    }
    for (var i = 0; i < exportList.length; i++) {
      //make sure we get style from db (if it's been changed since window opened)
      style = service.find(exportList[i].id,service.REGISTER_STYLE_ON_CHANGE);
      //var style = exportList[i],
      aStyleTop = doc.createElement("style");
      aStyle = doc.createElement("info");

      aStyleTop.setAttribute("name",style.name);
      aStyle.setAttribute("enabled",style.enabled);
      aStyle.setAttribute("id",style.id);

      cleanUp(style.url,"styleurl");
      cleanUp(style.updateUrl,"updateurl");
      cleanUp(style.md5Url,"md5url");

      aStyle.setAttribute("tags",style.getMeta("tag",{}).toString());
      aStyle.setAttribute("type",style.getMeta("type",{}).toString());
      aStyle.setAttribute("domain",style.getMeta("domain",{}).toString());
      aStyle.setAttribute("url-prefix",style.getMeta("url-prefix",{}).toString());
      aStyle.setAttribute("url",style.getMeta("url",{}).toString());
      aStyle.setAttribute("code",style.code.replace(/\"/g,"&quot;"));

      aStyleTop.appendChild(aStyle);
      styleRoot.appendChild(aStyleTop);
    }
    doc.appendChild(styleRoot);
    return doc;
  },

  unload: function()
  {
    //save path
    var locValue = document.getElementById("Location").value;
    scCommon.prefs.setCharPref("custom.exportpath",locValue);
    //save xml filename
    var XMLName = document.getElementById("XMLName").value;
    scCommon.prefs.setCharPref("custom.xmlname",XMLName);
  }

};