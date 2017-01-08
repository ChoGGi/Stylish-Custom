"use strict";
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://stylish-custom/content/common.jsm");
//cbCommon.dump();

var scOptions = {

  mainWin: scCommon.getMainWindow(),

  init: function()
  {
    var win = this.mainWin;
    //since Mozilla removed support for "requires" in install.rdf, this checks if Stylish is enabled
    if (!scCommon.tryService()){
      win.alert("Stylish not detected, please install/enable");
      scCommon.getWin("stylishCustomOptions").close();
      return;
    }

    function set(id,pref,which)
    {
      switch(which) {
      case "s":
        document.getElementById(id).value = scCommon.prefs.getCharPref(pref);
      break;
      case "i":
        document.getElementById(id).value = scCommon.prefs.getIntPref(pref);
      break;
      case "b":
        var idTmp = document.getElementById(id);
        if (scCommon.prefs.getBoolPref(pref) == true)
          idTmp.value = 1;
        else
          idTmp.value = 0;
      break;
      }
    }
    set("AutoImportantText","autoimportant.text","s");
    set("ChangeDomainsText","install.allowedDomains","s");
    set("ChangeFontText","custom.editfont","s");
    set("InsertTextText","custom.inserttext","s");
    set("ExternalEditorText","custom.editor","s");
    set("ChangeGlobalColourText","custom.globalstyle","s");
    set("ChangeSiteColourText","custom.sitestyle","s");
    set("ChangeGlobalSiteColourText","custom.globalsitestyle","s");
    set("ChangeInsertSepText","custom.inserttextsep","s");
    set("ToolbarToggleText","custom.togglebars","s");
    set("reloadStylesText","custom.reloadstyles","s");
    set("reloadStylesKeyText","custom.reloadstyleskey","s");

    set("StyleToggleRadio","custom.styletoggle","i");
    set("ManageRadio","custom.manageview","i");
    set("ExImportRadio","custom.eximportlocation","i");
    set("StyleInfoRadio","custom.infolocation","i");
    set("StyleMenuRadio","custom.stylemenuitem","i");
    set("WhichEditorRadio","custom.editorwhich","i");
    set("EditorTimeText","custom.editortimeout","i");
    set("AppTitleRadio","custom.editorapptitle","i");
    set("StyleMenusRadio","custom.stylemenulocation","i");
    set("MoveErrorBoxRadio","custom.errorboxplacement","i");

    set("StyleMenuOverrideRadio","custom.stylemenuoverride","b");
    set("RemoveCSSRadio","custom.removecss","b");
    set("SearchBarRadio","custom.newsearch","b");
    set("AskToSaveRadio","custom.asktosave","b");
    set("StatusbarRadio","custom.statusbaricon","b");
    set("ToolMenuRadio","custom.toolbar","b");
    set("ToggleIconsRadio","custom.showicons","b");
    set("GetStyleSheetsRadio","custom.stylesheetmenuitem","b");
    //set("ShowAppStylesRadio","custom.showappstyles","b");
    set("SaveTextRadio","custom.searchtextsave","b");

    //get scratchpad height
    document.getElementById("ScratchpadHeightText").inputField.value = scCommon.prefs.getIntPref("custom.scratchpadheight");

    //hide view sidebar option on thunderbird
    if (!win.document.getElementById("sidebar"))
      document.getElementById("ManageRadio").lastChild.style.display = "none";

    //disable remove button if no css files
    var files = Services.dirsvc.get("TmpD",Ci.nsIFile).directoryEntries;
    while (files.hasMoreElements()) {
      var entry = files.getNext();
      entry.QueryInterface(Ci.nsIFile);
      if (entry.leafName.indexOf("Stylish-Custom") != -1 && entry.leafName.indexOf(".css") != -1)
        document.getElementById("RemoveCSS").disabled = false;
    }
  },

  //select an editor
  browse: function()
  {
    const nsIFilePicker = Ci.nsIFilePicker;
    var winEl = scCommon.getWin("stylishCustomOptions"),
    fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

    fp.init(winEl,scCommon.getMsg("BrowseTitle"),nsIFilePicker.modeOpen);
    fp.appendFilters(nsIFilePicker.filterApps);
    if (fp.show() != nsIFilePicker.returnCancel)
      document.getElementById("ExternalEditorText").value = fp.file.path;
  },

  removeStaleCSS: function()
  {
    var files = Services.dirsvc.get("TmpD",Ci.nsIFile).directoryEntries;

    while(files.hasMoreElements()) {
      var entry = files.getNext();
      entry.QueryInterface(Ci.nsIFile);
      if (entry.leafName.indexOf("Stylish-Custom") != -1 && entry.leafName.indexOf(".css") != -1)
        entry.remove(false);
    }
    document.getElementById("RemoveCSS").disabled = true;
  },

  //when you press a radio for statusbar icon
  statusbar: function(view)
  {
    var StatusbarIcon = this.mainWin.document.getElementById("stylish-custom-panel");
    scCommon.prefs.setBoolPref("custom.statusbaricon",view);

    if (view == true)
      StatusbarIcon.style.display = "-moz-box";
    else
      StatusbarIcon.style.display = "none";
  },

  //when you press a radio for tool menu
  toolmenu: function(view)
  {
    var ToolMenu = this.mainWin.document.getElementById("stylish-toolmenu");
    scCommon.prefs.setBoolPref("custom.toolbar",view);

    if (view == true)
      ToolMenu.style.display = "-moz-box";
    else
      ToolMenu.style.display = "none";
  },

  toggleicons: function(view)
  {
    scCommon.prefs.setBoolPref("custom.showicons",view);
    if (view == true)
      scCommon.applyStyle("chrome://stylish-custom/skin/iconsDisabled.css",false,true);
    else
      scCommon.applyStyle("chrome://stylish-custom/skin/iconsDisabled.css",true,true);
  },

  //when you press a radio
  saveText: function(b)
  {
    scCommon.prefs.setBoolPref("custom.searchtextsave",b);
  },
  asktosave: function(b)
  {
    scCommon.prefs.setBoolPref("custom.asktosave",b);
  },
  newsearch: function(b)
  {
    scCommon.prefs.setBoolPref("custom.newsearch",b);
  },
  removeCSSWhich: function(b)
  {
    scCommon.prefs.setBoolPref("custom.removecss",b);
  },
  styleMenuOverride: function(b)
  {
    scCommon.prefs.setBoolPref("custom.stylemenuoverride",b);
    scCommon.toggleStyleMenuOverride(b);
  },

  getStyleSheets: function(b)
  {
    scCommon.prefs.setBoolPref("custom.stylesheetmenuitem",b);
    var getStyleSheets = this.mainWin.document.getElementById("StylishGetStyleSheets");
    if (!getStyleSheets)
      return;

    if (b == true)
      getStyleSheets.style.display = "-moz-box";
    else
      getStyleSheets.style.display = "none";
  },

  whichEditor: function(i)
  {
    scCommon.prefs.setIntPref("custom.editorwhich",i);
  },
  MoveErrorBox: function(i)
  {
    scCommon.prefs.setIntPref("custom.errorboxplacement",i);
  },
  apptitle: function(i)
  {
    scCommon.prefs.setIntPref("custom.editorapptitle",i);
  },
  manage: function(i)
  {
    scCommon.prefs.setIntPref("custom.manageview",i);
  },
  styletoggle: function(i)
  {
    scCommon.prefs.setIntPref("custom.styletoggle",i);
  },
  styleMenu: function(i)
  {
    scCommon.prefs.setIntPref("custom.stylemenuitem",i);
  },

  //when you press a radio for change ex/import location
  exImport: function(i)
  {
    scCommon.prefs.setIntPref("custom.eximportlocation",i);
    var doc = this.mainWin.document,
    StylishImport = doc.getElementById("StylishImport"),
    StylishImportMain = doc.getElementById("StylishImportMain"),
    StylishExport = doc.getElementById("StylishExport"),
    StylishExportMain = doc.getElementById("StylishExportMain");

    if (!StylishImport && !StylishExport)
      return;

    if (i == 1) {
      StylishImport.style.display = "-moz-box";
      StylishExport.style.display = "-moz-box";
      StylishImportMain.style.display = "none";
      StylishExportMain.style.display = "none";
      return;
    }
    StylishImport.style.display = "none";
    StylishExport.style.display = "none";
    StylishImportMain.style.display = "-moz-box";
    StylishExportMain.style.display = "-moz-box";
  },

  styleMenus: function(i)
  {
    scCommon.prefs.setIntPref("custom.stylemenulocation",i);
    var doc = this.mainWin.document,
    StylishAppStyles = doc.getElementById("StylishAppStyles"),
    StylishAppStylesMain = doc.getElementById("StylishAppStylesMain"),
    StylishEnabledStyles = doc.getElementById("StylishEnabledStyles"),
    StylishEnabledStylesMain = doc.getElementById("StylishEnabledStylesMain"),
    StylishDisabledStyles = doc.getElementById("StylishDisabledStyles"),
    StylishDisabledStylesMain = doc.getElementById("StylishDisabledStylesMain");

    if (!StylishAppStyles && !StylishEnabledStyles && !StylishDisabledStyles)
      return;

    if (i == 1) {
      StylishAppStyles.style.display = "-moz-box";
      StylishEnabledStyles.style.display = "-moz-box";
      StylishDisabledStyles.style.display = "-moz-box";
      StylishAppStylesMain.style.display = "none";
      StylishEnabledStylesMain.style.display = "none";
      StylishDisabledStylesMain.style.display = "none";
      return;
    }
    StylishAppStyles.style.display = "none";
    StylishEnabledStyles.style.display = "none";
    StylishDisabledStyles.style.display = "none";
    StylishAppStylesMain.style.display = "-moz-box";
    StylishEnabledStylesMain.style.display = "-moz-box";
    StylishDisabledStylesMain.style.display = "-moz-box";
  },

  styleInfo: function(i)
  {
    scCommon.prefs.setIntPref("custom.infolocation",i);
    var doc = this.mainWin.document,
    StylishInfo = doc.getElementById("StylishInfo"),
    StylishInfoMain = doc.getElementById("StylishInfoMain");
    if (!StylishInfo)
      return;

    if (i == 1) {
      StylishInfo.style.display = "-moz-box";
      StylishInfoMain.style.display = "none";
      return;
    }
    StylishInfo.style.display = "none";
    StylishInfoMain.style.display = "-moz-box";
  },

  //when you press a save button
  saveOption: function(which)
  {
    function setPref(pref,setting)
    {
      scCommon.prefs.setCharPref(pref,document.getElementById(setting).value);
    }

    switch(which) {
    case "AutoImportant":
      setPref("autoimportant.text","AutoImportantText");
    break;
    case "Domains":
      setPref("install.allowedDomains","ChangeDomainsText");
    break;
    case "Font":
      setPref("custom.editfont","ChangeFontText");
    break;
    case "InsertText":
      setPref("custom.inserttext","InsertTextText");
    break;
    case "GlobalColour":
      setPref("custom.globalstyle","ChangeGlobalColourText");
    break;
    case "SiteColour":
      setPref("custom.sitestyle","ChangeSiteColourText");
    break;
    case "GlobalSiteColour":
      setPref("custom.globalsitestyle","ChangeGlobalSiteColourText");
    break;
    case "ExternalEditor":
      setPref("custom.editor","ExternalEditorText");
    break;
    case "ToolbarToggle":
      setPref("custom.togglebars","ToolbarToggleText");
    break;
    case "reloadStyles":
      setPref("custom.reloadstyles","reloadStylesText");
    break;
    case "reloadStylesKey":
      setPref("custom.reloadstyleskey","reloadStylesKeyText");
    break;
    case "InsertSep":
      setPref("custom.inserttextsep","ChangeInsertSepText");
    break;
    case "EditorTime":
      scCommon.prefs.setIntPref("custom.editortimeout",document.getElementById("EditorTimeText").value);
    break;
    case "ScratchpadHeight":
      var height = document.getElementById("ScratchpadHeightText").inputField.value;
      scCommon.prefs.setIntPref("custom.scratchpadheight",height);
    break;
    }
  },

  //text to dom tree
  parseXML: function(fileData)
  {
    var domParser = new DOMParser();
    return domParser.parseFromString(fileData,"text/xml");
  },

  exportSettings: function()
  {
    var winEl = scCommon.getWin("stylishCustomOptions");

    //make a file picker
    const nsIFilePicker = Ci.nsIFilePicker;
    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(winEl,scCommon.getMsg("ExportSettings"),nsIFilePicker.modeSave);
    fp.appendFilter("XML (*.xml)","*.xml");
    if (fp.show() == nsIFilePicker.returnCancel)
      return;
    var file = fp.file,

    //create xml doc
    doc = document.implementation.createDocument("","",null),
    docRoot = doc.createElement("prefs"),
    aPref,
    prefType;

    function createPrefs(prefs,array,path)
    {
      for (var i = 0; i < array.length; i++) {
        prefType = prefs.getPrefType(array[i]);
        switch(prefType) {
        case 32://char
          aPref = doc.createElement("pref");
          aPref.setAttribute("name",path + array[i]);
          aPref.setAttribute("type","char");
          aPref.setAttribute("data",prefs.getCharPref(array[i]));
          docRoot.appendChild(aPref);
        break;
        case 64://int
          aPref = doc.createElement("pref");
          aPref.setAttribute("name",path + array[i]);
          aPref.setAttribute("type","int");
          aPref.setAttribute("data",prefs.getIntPref(array[i]));
          docRoot.appendChild(aPref);
        break;
        case 128://bool
          aPref = doc.createElement("pref");
          aPref.setAttribute("name",path + array[i]);
          aPref.setAttribute("type","bool");
          aPref.setAttribute("data",prefs.getBoolPref(array[i]));
          docRoot.appendChild(aPref);
        break;
        }
      }
    }

    function makePref(prefsText,path)
    {
      var prefs = Services.prefs.getBranch(prefsText),
      array = prefs.getChildList("",{});
      createPrefs(prefs,array,path);
    }
    makePref("extensions.stylish.custom.","custom.");
    makePref("extensions.stylish.autoimportant.","autoimportant.");

    doc.appendChild(docRoot);

    var oFOStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
    oFOStream.init(file,parseInt("0x02",16)|parseInt("0x08",16)|parseInt("0x20",16),parseInt("0664",8),0); // write, create, truncate
    (new XMLSerializer()).serializeToStream(doc,oFOStream,""); // rememeber, doc is the DOM tree
    oFOStream.close();
  },

  importSettings: function()
  {
    //make a file picker
    const nsIFilePicker = Ci.nsIFilePicker;
    var someWin = scCommon.getWin("stylishCustomOptions"),
    fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

    fp.init(someWin,scCommon.getMsg("ImportSettings"),nsIFilePicker.modeOpen);
    fp.appendFilter("XML (*.xml)","*.xml");
    if (fp.show() == nsIFilePicker.returnCancel)
      return;
    var prefsFile;
    if (!scCommon.getWin("main-window"))
      prefsFile = scCommon.readFile(fp.file.path);
    else {//fennec has one window
      var str = {},
      charset = "UTF-8",
      is = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);

      const replacementChar = Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
      is.init(fp.file,charset,0,replacementChar);
      //var tmp = is.readString(-1,str);
      prefsFile = this.parseXML(str.value);
    }

    //loop through the prefs
    var children = prefsFile.firstChild.childNodes;

    for (var i = 0; i < children.length; i++) {
      if (children[i] != "[object Element]" ||
          !children[i].hasAttribute("name"))
        continue;
      var name = children[i].getAttribute("name"),
      //is new settings
      prefs = Services.prefs.getBranch("extensions.stylish.");
      //or old
      if (name.indexOf("custom.") == -1 &&
          name.indexOf("autoimportant.") == -1)
        prefs = Services.prefs.getBranch("extensions.stylish.custom.");
      if (prefs.getPrefType(name) < 1)
        continue;
      var type = children[i].getAttribute("type"),
      data = children[i].getAttribute("data");
      switch(type) {
      case "int":
        prefs.setIntPref(name,data);
      break;
      case "char":
        prefs.setCharPref(name,data);
      break;
      case "bool":
        if (data == "true")
          prefs.setBoolPref(name,true);
        else
          prefs.setBoolPref(name,false);
      break;
      }
    }

  }

};
