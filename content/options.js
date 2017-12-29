"use strict";
/* jshint ignore:start */
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://stylish-custom/content/common.jsm");
/* jshint ignore:end */
//cbCommon.dump();

var scOptions = {

  mainWin: scCommon.getMainWindow(),

  init: function()
  {
    let win = this.mainWin;
    //since Mozilla removed support for "requires" in install.rdf, this checks if Stylish is enabled
    if (!scCommon.tryService()){
      win.alert("Stylish not detected, please install/enable");
      scCommon.getWin("stylishCustomOptions").close();
      return;
    }

    function set(id,pref,which)
    {
      switch (which) {
        case "s":
          document.getElementById(id).value = scCommon.prefs.getCharPref(pref);
        break;
        case "i":
          document.getElementById(id).value = scCommon.prefs.getIntPref(pref);
        break;
        case "b":
          let idTmp = document.getElementById(id);
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
    set("NewStyleRadio","custom.newstylelocation","i");

    set("StyleMenuOverrideRadio","custom.stylemenuoverride","b");
    set("RemoveCSSRadio","custom.removecss","b");
    set("SearchBarRadio","custom.newsearch","b");
    set("AskToSaveRadio","custom.asktosave","b");
    set("ToolMenuRadio","custom.toolbar","b");
    set("ToggleIconsRadio","custom.showicons","b");
    set("GetStyleSheetsRadio","custom.stylesheetmenuitem","b");
    //set("ShowAppStylesRadio","custom.showappstyles","b");
    set("SaveTextRadio","custom.searchtextsave","b");

    //get scratchpad height
    document.getElementById("ScratchpadHeightText").inputField.value =
                          scCommon.prefs.getIntPref("custom.scratchpadheight");

    //hide view sidebar option on thunderbird
    if (!win.document.getElementById("sidebar"))
      document.getElementById("ManageRadio").lastChild.style.display = "none";

    //disable remove button if no css files
    let files = Services.dirsvc.get("TmpD",Ci.nsIFile).directoryEntries;
    while (files.hasMoreElements()) {
      let entry = files.getNext();
      entry.QueryInterface(Ci.nsIFile);
      if (entry.leafName.indexOf("Stylish-Custom") != -1 &&
          entry.leafName.indexOf(".css") != -1) {
        document.getElementById("RemoveCSS").disabled = false;
      }
    }
  },

  //select an editor
  browse: function()
  {
    const nsIFilePicker = Ci.nsIFilePicker;
    let winEl = scCommon.getWin("stylishCustomOptions"),
    fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

    fp.init(winEl,scCommon.getMsg("BrowseTitle"),nsIFilePicker.modeOpen);
    fp.appendFilters(nsIFilePicker.filterApps);
    if (fp.show() != nsIFilePicker.returnCancel)
      document.getElementById("ExternalEditorText").value = fp.file.path;
  },

  //remove Stylish-Custom*.css from TEMP directory
  removeStaleCSS: function()
  {
    let files = Services.dirsvc.get("TmpD",Ci.nsIFile).directoryEntries;

    while(files.hasMoreElements()) {
      let entry = files.getNext();
      entry.QueryInterface(Ci.nsIFile);
      if (entry.leafName.indexOf("Stylish-Custom") != -1 &&
          entry.leafName.indexOf(".css") != -1) {
        entry.remove(false);
      }
    }
    document.getElementById("RemoveCSS").disabled = true;
  },

  //when you press a radio for change ex/import location
  exImport: function(i)
  {
    scCommon.prefs.setIntPref("custom.eximportlocation",i);
    let doc = this.mainWin.document,
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
    let doc = this.mainWin.document,
    AppStyles = doc.getElementById("StylishAppStyles"),
    EnabledStyles = doc.getElementById("StylishEnabledStyles"),
    DisabledStyles = doc.getElementById("StylishDisabledStyles"),
    AppStylesMain = doc.getElementById("StylishAppStylesMain"),
    EnabledStylesMain = doc.getElementById("StylishEnabledStylesMain"),
    DisabledStylesMain = doc.getElementById("StylishDisabledStylesMain");

    if (!AppStyles && !EnabledStyles && !DisabledStyles)
      return;

    if (i == 1) {
      AppStyles.style.display = "-moz-box";
      EnabledStyles.style.display = "-moz-box";
      DisabledStyles.style.display = "-moz-box";
      AppStylesMain.style.display = "none";
      EnabledStylesMain.style.display = "none";
      DisabledStylesMain.style.display = "none";
      return;
    }
    AppStyles.style.display = "none";
    EnabledStyles.style.display = "none";
    DisabledStyles.style.display = "none";
    AppStylesMain.style.display = "-moz-box";
    EnabledStylesMain.style.display = "-moz-box";
    DisabledStylesMain.style.display = "-moz-box";
  },

  styleInfo: function(i)
  {
    scCommon.prefs.setIntPref("custom.infolocation",i);
    let doc = this.mainWin.document,
    menuitem = doc.getElementById("StylishInfo"),
    menuitemMain = doc.getElementById("StylishInfoMain");
    if (!menuitem)
      return;

    if (i == 1) {
      menuitem.style.display = "-moz-box";
      menuitemMain.style.display = "none";
      return;
    }
    menuitem.style.display = "none";
    menuitemMain.style.display = "-moz-box";
  },

  newStyle: function(i)
  {
    scCommon.prefs.setIntPref("custom.newstylelocation",i);
    let doc = this.mainWin.document,
    menuitem = doc.getElementById("StylishNewStyle"),
    menuitemMain = doc.getElementById("StylishNewStyleMain");

    if (!menuitem)
      return;

    if (i == 1) {
      menuitem.style.display = "-moz-box";
      menuitemMain.style.display = "none";
      return;
    }
    menuitem.style.display = "none";
    menuitemMain.style.display = "-moz-box";
  },

  //when you press a radio
  savePref: function(pref,value)
  {
    function toggleView(which)
    {
      let el = scOptions.mainWin
              .document.getElementById(which);
      if (!el)
        return;

      if (value == true)
        el.style.display = "-moz-box";
      else
        el.style.display = "none";
    }
    switch (typeof (value)) {
      case "boolean":
        scCommon.prefs.setBoolPref("custom." + pref,value);
        switch (pref) {
          case "stylemenuoverride":
            scCommon.toggleStyleMenuOverride(value);
          break;
          case "toolbar":
            toggleView("stylish-toolmenu");
          break;
          case "stylesheetmenuitem":
            toggleView("StylishGetStyleSheets");
          break;
          case "showicons":
            if (value == true) {
              scCommon.applyStyle(
                  "chrome://stylish-custom/skin/iconsDisabled.css",false,true);
            } else {
              scCommon.applyStyle(
                  "chrome://stylish-custom/skin/iconsDisabled.css",true,true);
            }
          break;
        }
      break;
      case "number":
        scCommon.prefs.setIntPref("custom." + pref,value);
      break;
    }
  },

  //when you press a save button
  saveOption: function(which)
  {
    function setPref(pref,setting)
    {
      scCommon.prefs.setCharPref(pref,document.getElementById(setting).value);
    }

    switch (which) {
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
        scCommon.prefs.setIntPref("custom.editortimeout",
                              document.getElementById("EditorTimeText").value);
      break;
      case "ScratchpadHeight":
        let height = document.getElementById("ScratchpadHeightText")
                                            .inputField.value;
        scCommon.prefs.setIntPref("custom.scratchpadheight",height);
      break;
    }
  },

  //text to dom tree
  parseXML: function(fileData)
  {
    let domParser = new DOMParser();
    return domParser.parseFromString(fileData,"text/xml");
  },

  exportSettings: function()
  {
    let winEl = scCommon.getWin("stylishCustomOptions");

    //make a file picker
    const nsIFilePicker = Ci.nsIFilePicker;
    let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(winEl,scCommon.getMsg("ExportSettings"),nsIFilePicker.modeSave);
    fp.appendFilter("XML (*.xml)","*.xml");
    if (fp.show() == nsIFilePicker.returnCancel)
      return;
    let file = fp.file,

    //create xml doc
    doc = document.implementation.createDocument("","",null),
    docRoot = doc.createElement("prefs"),
    aPref,
    prefType;

    function createPrefs(prefs,array,path)
    {
      for (let i = 0; i < array.length; i++) {
        prefType = prefs.getPrefType(array[i]);
        switch (prefType) {
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
      let prefs = Services.prefs.getBranch(prefsText),
      array = prefs.getChildList("",{});
      createPrefs(prefs,array,path);
    }
    makePref("extensions.stylish.custom.","custom.");
    makePref("extensions.stylish.autoimportant.","autoimportant.");

    doc.appendChild(docRoot);

    let oFOStream = Cc["@mozilla.org/network/file-output-stream;1"]
                    .createInstance(Ci.nsIFileOutputStream);
    oFOStream.init(file,
                  parseInt("0x02",16)|
                  parseInt("0x08",16)|
                  parseInt("0x20",16),
                  parseInt("0664",8),0
    ); // write, create, truncate
    (new XMLSerializer()).serializeToStream(doc,oFOStream,"");//doc is the DOM tree
    oFOStream.close();
  },

  importSettings: function()
  {
    //make a file picker
    const nsIFilePicker = Ci.nsIFilePicker;
    let someWin = scCommon.getWin("stylishCustomOptions"),
    fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

    fp.init(someWin,scCommon.getMsg("ImportSettings"),nsIFilePicker.modeOpen);
    fp.appendFilter("XML (*.xml)","*.xml");
    if (fp.show() == nsIFilePicker.returnCancel)
      return;
    let prefsFile;
    if (!scCommon.getWin("main-window"))
      prefsFile = scCommon.readFile(fp.file.path);
    else {//fennec has one window
      let str = {},
      charset = "UTF-8",
      is = Cc["@mozilla.org/intl/converter-input-stream;1"]
            .createInstance(Ci.nsIConverterInputStream);

      const replacementChar = Ci.nsIConverterInputStream
                                .DEFAULT_REPLACEMENT_CHARACTER;
      is.init(fp.file,charset,0,replacementChar);
      //let tmp = is.readString(-1,str);
      prefsFile = this.parseXML(str.value);
    }

    //loop through the prefs
    let children = prefsFile.firstChild.childNodes;

    for (let i = 0; i < children.length; i++) {
      if (children[i] != "[object Element]" ||
          !children[i].hasAttribute("name"))
        continue;
      let name = children[i].getAttribute("name"),
      //is new settings
      prefs = Services.prefs.getBranch("extensions.stylish.");
      //or old
      if (name.indexOf("custom.") == -1 &&
          name.indexOf("autoimportant.") == -1)
        prefs = Services.prefs.getBranch("extensions.stylish.custom.");
      if (prefs.getPrefType(name) < 1)
        continue;
      let type = children[i].getAttribute("type"),
      data = children[i].getAttribute("data");
      switch (type) {
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
