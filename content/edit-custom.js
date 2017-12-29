"use strict";
/*global initialCode:true */
/* jshint ignore:start */
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("chrome://stylish-custom/content/common.jsm");
/* jshint ignore:end */
//cbCommon.dump();

var scEdit = {

  beforePaint: function()
  {
    //remove findbar if it isn't being used
    if (scCommon.prefs.getBoolPref("custom.newsearch") == false) {
      let findbar = document.getElementById("findbar");
      if (findbar)
        findbar.parentNode.removeChild(findbar);
    }
  },

  styleId: null,
  mutationOb: null,
  init: function()
  {

    let service = scCommon.service;
    this.styleId = document.getElementById("stylish").getAttribute("styleId");

    //move error box below the save/close buttons
    if (scCommon.prefs.getIntPref("custom.errorboxplacement") == 1) {
      //clone and remove old error area
      let toolbox = document.getElementById("stylishCustomToolbox"),
      errorsArea = document.getElementById("errorsArea"),
      clonedErrorArea = errorsArea.cloneNode(true);
      toolbox.appendChild(clonedErrorArea);

      errorsArea.parentNode.removeChild(errorsArea);
    }

    //set height of scratchpad
    let scratchPad = document.getElementById("ScratchPad");
    if (scratchPad) {
      let height = scCommon.prefs.getIntPref("custom.scratchpadheight");
      scratchPad.setAttribute("rows",height);
    }

    //move the cloned dialog down a bit
    if ("arguments" in window &&
        typeof (window.arguments[1]) != "undefined" &&
        window.arguments[1] == "Cloned") {
      window.moveTo(window.arguments[4],window.arguments[3]+30);
      //window.moveBy(0,30);
    }

    //auto-update the titlebar with the name
    if (nameE) {
      nameE.addEventListener("input",function() {
        scEdit.updateTitlebar(this.inputField.value);
      },false);
    }

    //make sure bottom bar isn't hidden if others are, or else it's annoying to restore a working GUI
    function e(id)
      {
      if (document.getElementById(id).getAttribute("collapsed") == "true")
        return true;
      }
    if (e("InsertToolbar") &&
        e("PageToolbar") &&
        e("NameToolbar") &&
        e("TextToolbar") &&
        e("BottomToolbar")) {
      document.getElementById("BottomToolbar").setAttribute("collapsed",false);
      }

    //get key / enabled status from prefs
    let ImportantKey = prefs.getCharPref("autoimportant.key"),
    ImportantStatus = prefs.getBoolPref("autoimportant.enabled"),
    importantText = document.getElementById("ImportantText"),
    importantEnabled = document.getElementById("ImportantEnabled");

    //add char from keycode to textbox
    if (importantText)
      importantText.value = String.fromCharCode(ImportantKey);

    //change enabled status
    if (importantEnabled)
      importantEnabled.checked = ImportantStatus;

    if (ImportantStatus) {
      scEdit.insertImportantEvent = function(event)
      {
        if (event.which == ImportantKey) {
          event.preventDefault();
          scEdit.insertImportant();
        }
      };
      codeE.addEventListener("keypress",scEdit.insertImportantEvent,false);
    }

    //change font for edit area
    let editfont = scCommon.prefs.getCharPref("custom.editfont").split(":");
    if (editfont[2]) {
      codeE.style.fontFamily = editfont[0];
      codeE.style.fontSize = editfont[1];
      codeE.style.color = editfont[2];
      if (scratchPad) {
        scratchPad.style.fontFamily = editfont[0];
        scratchPad.style.fontSize = editfont[1];
        scratchPad.style.color = editfont[2];
      }
    }

    //set the update check status
    let updateURL = null,
    updateCheck = document.getElementById("UpdateCheck");

    if (updateCheck) {
      if (!updateURL)
        updateURL = document.getElementById("update-url");
      //if (updateURL.value && updateURL.value != "") {
      if (updateURL.value && updateURL.value != "") {
        if (updateURL.value.search(/ChoGGiSezNOUPDATE/) != -1)
          updateCheck.removeAttribute("checked");
        else
          updateCheck.checked = true;
      } else {
        updateCheck.style.display = "none";
      }
    }

    //for switch to install
    let style;
    let toggleE = document.getElementById("ToggleEnabled");

    if (this.styleId)
      style = service.find(this.styleId,service.REGISTER_STYLE_ON_CHANGE);

    //for switch to install
    if (!style)
      style = Cc["@userstyles.org/style;1"].createInstance(Ci.stylishStyle);

    if (style.id == "0") {
      if (toggleE)
        toggleE.checked = true;
      let bottom_SwitchToInstall = document
                                  .getElementById("Bottom_SwitchToInstall");
      if (bottom_SwitchToInstall) {
        if (style.url != null)
          bottom_SwitchToInstall.style.display = "-moz-box";
      }
    } else if (style.id) {
      this.updateStyleId(style.id);
    }

    //set enable checkbox
    if (toggleE) {
      if (style.enabled == true)
        toggleE.checked = true;
      if ("arguments" in window && typeof (window.arguments[2]) != "undefined" &&
          window.arguments[2] == false) {//cloned disabled style
        toggleE.checked = false;
      }
    }

    //toggle rainbow picker menuitem/button
    scEdit.toggleRainbow();

    //some stuff needs a delay
    let observer = {
      observe: function()
      {

        //toggle scratchpad
        let ScratchPadSplitter = document.getElementById("ScratchPadSplitter"),
        showPad = scCommon.prefs.getBoolPref("custom.editorscratchpad");
        if (scratchPad) {
          scratchPad.setAttribute("collapsed",showPad);
          if (showPad == true)
            ScratchPadSplitter.setAttribute("state","collapsed");
          else
            ScratchPadSplitter.setAttribute("state","open");
        }

        //change focus/move caret to start of code
        if (document.getElementById("internal-code")) {
          //change focus to edit area instead of search checkbox
          codeE.focus();
          //put caret at the start
          codeE.setSelectionRange(0);
        }

        //add app name to title
        let whichTitle = scCommon.prefs.getIntPref("custom.editorapptitle");
        function setTitle(appName)
        {
          let nameEl = document.getElementById("name");
          if (nameEl && whichTitle == 0)
            document.title = nameEl.inputField.value;
          else if (!nameEl && whichTitle == 0)
            document.title = "";
          else if (nameEl)
            document.title = appName + " : " + nameEl.inputField.value;
          else
            document.title = appName + " :";
        }
        function setName(window,appInitials)
        {
          if (scCommon.getWin(window)) {
            if (whichTitle == 2)
              setTitle(Services.appinfo.name);
            else if (whichTitle < 2)
              setTitle(appInitials);
          }
        }
        setName("navigator:browser","Fx");
        setName("mail:3pane","Tb");
        if (style.id == 0) {//new style
          if (document.title.indexOf(":") == -1)
            document.title = "!: " + document.title;
          else
            document.title = "!" + document.title;
        }

        //add items to insert menu
        scEdit.populateInsertTextMenu();
        //get original code for cancel button
        scEdit.styleCodeOriginal = codeE.value;
        //check if IAT addon is enabled
        scEdit.toggleIAT();

      }
    };
    let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.init(observer,100,Ci.nsITimer.TYPE_ONE_SHOT);

    //needed a longer delay for new findbar under palemoon
    let observer2 = {
      observe: function()
      {
        function setSearchText(findbar,text)
        {
          //check if user removed search box
          if (findbar) {
            findbar.style.display = "-moz-box";
            if (findbar.hasAttribute("browserid")) {
              //new search
              findbar.getElement("findbar-textbox").value = text;
              findbar._findField.value = text;
              if (text != "") {
                findbar.getElement("find-next")
                                      .setAttribute("disabled",false);
                findbar.getElement("find-previous")
                                      .setAttribute("disabled",false);
              }
            } else {
              //old search
              findbar.value = text;
            }
          }
        }

        let newSearch = scCommon.prefs.getBoolPref("custom.newsearch"),
        saveSearch = scCommon.prefs.getBoolPref("custom.searchtextsave");
        //which search box to use
        let whichSearch;
        if (newSearch == true)
          whichSearch = document.getElementById("findbar");
        else
          whichSearch = document.getElementById("SearchBox");
        //saved text?
        if (saveSearch == true)
          setSearchText(whichSearch,scCommon.prefs.getCharPref("custom.searchtext"));
        else
          setSearchText(whichSearch,"");
      }
    };
    let timer2 = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer2.init(observer2,500,Ci.nsITimer.TYPE_ONE_SHOT);

    //update style info when style is saved
    this.mutationOb = new window.MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        let savedStyleID = mutation.target
                          .getAttribute("stylish-custom-id-edit");
        if (savedStyleID == scEdit.styleId) {
          let style = service.find(
                      savedStyleID,service.REGISTER_STYLE_ON_CHANGE);
          document.getElementById("ToggleEnabled").checked = style.enabled;
          document.getElementById("name").value = style.name;
          document.getElementById("tags").value = style
                                                  .getMeta("tag",{}).join(" ");
        }
      });
    });
    let win = scCommon.getMainWindow().document.firstElementChild;
    this.mutationOb.observe(
              win,{attributes:true,attributeFilter:["stylish-custom-id-edit"]});

    //picking a seachbox (findbar has a tendency to **** up so sticking this at the end)
    let searchAreaOld = document.getElementById("SearchAreaOld"),
    findbar = document.getElementById("findbar");

    if (scCommon.prefs.getBoolPref("custom.newsearch") == false) {
      if (searchAreaOld)
        searchAreaOld.style.display = "-moz-box";
      if (findbar)
        findbar.style.display = "none";
    } else {
      if (findbar) {
        findbar.removeAttribute("hidden");
        codeE.fastFind = finder;
        findbar.open();
      }
    }
  },

  toggleRainbow: function()
  {
    //check if rainbowpicker is enabled
    AddonManager.getAddonByID(
                "{9c1acee4-c567-4e71-8d1b-edf314afef97}",function(addon)
    {
      let rain1 = document.getElementById("pick-color-rainbowpicker"),
      rain2 = document.getElementById("RainbowPicker");

      if (addon && addon.isActive == true) {
        if (rain1) {
          rain1.setAttribute("installed",1);
          rain1.style.display = "-moz-box";
        }
        if (rain2) {
          rain2.setAttribute("installed",1);
          rain2.style.display = "-moz-box";
        }
      } else {
        if (rain1)
          rain1.style.display = "none";
        if (rain2)
          rain2.style.display = "none";
      }
    });
  },

  toggleIAT: function()
  {
    AddonManager.getAddonByID("itsalltext@docwhat.gerf.org",function(addon)
    {
      let externalEdit = document.getElementById("ExternalEdit"),
      itsalltext = document.getElementById("itsalltext");
      if (addon && addon.isActive == false) {//not enabled, so hide IAT
        scEdit.externalEditButton(externalEdit);
        if (itsalltext)
          itsalltext.style.display = "none";
      } else {//go by pref
        if (scCommon.prefs.getIntPref("custom.editorwhich") == 1) {//ExternalEdit
          scEdit.externalEditButton(externalEdit);
          if (itsalltext)
            itsalltext.style.display = "none";
        } else {//IAT
          if (itsalltext)
            itsalltext.label = scCommon.getMsg("ExternalEditIAT2");
          if (externalEdit)
            externalEdit.style.display = "none";
        }
      }
    });
  },

  openFile: function(file)
  {
    if (typeof (FileUtils.File) !== "undefined")
      return new FileUtils.File(file);
    else {
      let temp = Cc["@mozilla.org/file/local;1"]
                .createInstance(Ci.nsILocalFile);
      temp.initWithPath(file);
      return temp;
    }
  },

  externalEditButton: function(button)
  {
    if (!button)
      return;
    let fileName = scCommon.prefs.getCharPref("custom.editor");

    //if no editor path then hide
    //if (fileName == "") {
    if (fileName == "") {
      button.style.display = "none";
      return;
    }

    if (fileName.indexOf("\\") != -1)
      fileName = fileName.split("\\");
    else if (fileName.indexOf("/") != -1)
      fileName = fileName.split("/");

    //get name for button
    fileName = fileName[fileName.length-1].replace(/^(.*)\..*$/g,"$1");
    button.label = fileName;
  },

  //for checking css file
  intervalID: null,
  lastModified: null,
  //for opening css file
  cssFile: null,
  args: null,
  proc: null,
  isOSX: null,

  externalEdit: function(button)
  {
    //rightclick means stop checking file
    if (button == 2) {
      this.checkFileStop(false);
      return;
    }
    if (this.intervalID)
      this.intervalID.cancel();
    //set interval to check for changes
    this.intervalID = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    function timer()
    {
      let observer = {
        observe: function()
        {
          scEdit.checkFile(scEdit.cssFile);
        }
      };
      scEdit.intervalID.init (
        observer,scCommon.prefs.getIntPref("custom.editortimeout"),
        Ci.nsITimer.TYPE_REPEATING_SLACK
      );
    }
    let editorPath = scCommon.prefs.getCharPref("custom.editor");
    //for OSX and .app: use /usr/bin/open -a /path/to/some.app
    if (Services.appinfo.OS == "Darwin" &&
        editorPath.slice(editorPath.length-4) == ".app") {
      scEdit.isOSX = true;
    }
    if (this.cssFile) {//file already opened
      //update the file first
      this.checkFile(this.cssFile);
      //open file in editor
      this.proc.runAsync(this.args,this.args.length);
      //set the interval
      timer();
      return;
    }
    if (editorPath == "") {//no editor
      alert(scCommon.getMsg("InvalidEditor"));
      return;
    }
    // get temp directory and create new file
    let cssFile = Services.dirsvc.get("TmpD",Ci.nsIFile);
    cssFile.append("Stylish-Custom.css");
    cssFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE,parseInt("0666",8));

    //if it's a new style
    if (style.code == "")
      style.code = codeE.value;

    //write style to css file
    let foStream = Cc["@mozilla.org/network/file-output-stream;1"]
                  .createInstance(Ci.nsIFileOutputStream),
    converter = Cc["@mozilla.org/intl/converter-output-stream;1"]
                  .createInstance(Ci.nsIConverterOutputStream);

    foStream.init(cssFile,
                  parseInt("0x02",16)|
                  parseInt("0x08",16)|
                  parseInt("0x20",16),
                  parseInt("0664",8),0
    ); // write, create, truncate
    converter.init(foStream,"UTF-8",0,0);
    converter.writeString(style.code);
    converter.close();
    foStream.close();

    this.cssFile = cssFile;
    this.lastModified = cssFile.lastModifiedTimeOfLink;

    //open file in editor
    let exe;
    if (scEdit.isOSX) {
      this.args=[];
      this.args.push("-a");
      this.args.push(editorPath);
      this.args.push(cssFile.path);
      exe = scEdit.openFile("/usr/bin/open");
    } else {
      this.args=[cssFile.path];
      exe = scEdit.openFile(editorPath);
    }

    exe.followLinks = true;
    //Note to reviewer: used to monitor an opened css file in temp dir, and update style code accordingly.
    this.proc = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
    //scEdit.proc

    try {
      this.proc.init(exe);
    } catch (e) {
      scCommon.catchError(e);
      this.cssFile = null;
      return;
    }
    this.proc.runAsync(this.args,this.args.length);
    timer();
  },

  checkFile: function(cssFile)
  {
    if (cssFile.lastModifiedTimeOfLink <= this.lastModified)
      return;

    this.beforeChange();

    let file = scEdit.openFile(cssFile.path),
    data,
    callback; //needed for old fox
    NetUtil.asyncFetch(file, function(inputStream, status) {
      if (!Components.isSuccessCode(status)) {
        // Handle error!
        return;
      }
      try {
        data = NetUtil
              .readInputStreamToString(inputStream,inputStream.available());
      } catch (e) {
        data = "";//if css file is blank throws error on old fox, so passing along "blank"
      }
      codeE.value = data;
      //update last modified
      scEdit.lastModified = cssFile.lastModifiedTimeOfLink;
      //let user know
      scCommon.tooltip("CodeUpdated",codeE,document);
      //update preview with new code
      scEdit.togglePreview();
    },callback);

    this.afterChange();
/*
    let str = {},
    is = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
    const replacementChar = Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
    is.init(cssFile,"UTF-8",0,replacementChar);
    let tmp = is.readString(-1,str);
*/
  },

  checkFileStop: function(which)
  {
    if (this.intervalID)
      this.intervalID.cancel(); //stops file read timer
    //if we want to stop checking, but not delete
    if (which != false) {
      if (this.cssFile)
        this.cssFile.remove(false); //delete old file
    }
  },

  toolbarName: null,
  toolbarUrl: null,
  toolbarTags: null,
  toolbarAutoimportant: null,
  toolbarSearch: null,
  toolbarSearch2: null,
  toolbarSearch3: null,
  toolbarReplace: null,

  toolbarSearchToggle: null,
  toolbarWrapLines: null,
  toolbarImportantEnabled: null,
  toolbarToggleEnabled: null,
  toolbarUpdateCheck: null,
  toolbarScratchPad: null,

  customizeSheet: false,

  customizeToolbar: function()
  {

    //disable customize cmd
    document.getElementById("cmd_CustomizeToolbars")
            .setAttribute("disabled","true");

    //remove fake elements (so they don't interfere {see edit-onload})
    //scCommon.removeChild(document.getElementById("RemovedItems"));

    //store some values
    function storeValue(el)
    {
      el = document.getElementById(el);
      if (el)
        return el.value;
    }
    this.toolbarName = storeValue("name");
    this.toolbarUrl = storeValue("update-url");
    this.toolbarTags = storeValue("tags");
    this.toolbarAutoimportant = storeValue("ImportantText");
    this.toolbarReplace = storeValue("ReplaceBox");
    this.toolbarSearch = storeValue("SearchBox");
    this.toolbarScratchPad = storeValue("ScratchPad");

    //store some checks
    function storeCheck(el)
    {
      el = document.getElementById(el);
      if (el)
        return el.checked;
    }
    this.toolbarSearchToggle = storeCheck("SearchToggle");
    this.toolbarWrapLines = storeCheck("wrap-lines");
    this.toolbarImportantEnabled = storeCheck("ImportantEnabled");
    this.toolbarToggleEnabled = storeCheck("ToggleEnabled");
    this.toolbarUpdateCheck = storeCheck("UpdateCheck");

    let findbar = document.getElementById("findbar");
    if (findbar) {
      this.toolbarSearch2 = findbar.getElement("findbar-textbox").value;
      if (findbar.getElement("find-label")) //why did it now decide to be null?
        this.toolbarSearch3 = findbar.getElement("find-label").value;
    }

    //unhide some buttons
    function unhide(name)
    {
      let tmpEl = document.getElementById(name);
      if (tmpEl)
        tmpEl.style.display = "-moz-box";
    }
    unhide("Bottom_SwitchToInstall");
    unhide("itsalltext");
    unhide("ExternalEdit");
    unhide("RainbowPicker");

    let stylishElem = document.getElementById("stylish");

    //addEventListener for dragndrop
    stylishElem.addEventListener("drag",scEdit.refreshToolStuff,true);
    //addEventListener for dragndrop out
    stylishElem.addEventListener("mouseout",scEdit.refreshToolStuffMouse,false);
    //call it once for initial stuff
    this.refreshToolStuff();

    if (Services.prefs.prefHasUserValue("toolbar.customization.usesheet")) {
      this.customizeSheet = Services.prefs
                            .getBoolPref("toolbar.customization.usesheet");
    }

    //customize "done" function
    let toolbox = document.getElementById("stylishCustomToolbox");
    toolbox.customizeDone = scEdit.customizeToolbarDone;

    function getHeight(id)
    {
      let num = scCommon
          .getStyle(document.getElementById(id),window).height.replace(/px$/,"");
      return Number(num);
    }

    let customizeURL = "chrome://global/content/customizeToolbar.xul";
    if (Services.appinfo.OS != "Darwin") //WIN
      window.openDialog (
            customizeURL,null,
            "chrome,titlebar,toolbar,location,resizable,dependent",
            toolbox,window
    );
    else { //OSX
      let sheetFrame = document.getElementById("customizeToolbarSheetIFrame"),
      sheetWidth,
      height;

      sheetFrame.hidden = false;
      sheetFrame.toolbox = toolbox;

      // The document might not have been loaded yet, if this is the first time.
      // If it is already loaded, reload it so that the onload initialization code re-runs.
      if (sheetFrame.getAttribute("src") == customizeURL)
        sheetFrame.contentWindow.location.reload();
      else
        sheetFrame.setAttribute("src",customizeURL);

      // XXXmano: there's apparently no better way to get this when the iframe is hidden
      sheetWidth = sheetFrame.style.width.match(/([0-9]+)px/)[1];

      // (popup height + height of top toolbars) - (code + bottom)
      height = 414.5 + getHeight("stylishCustomToolbox") -
                      getHeight("CodeToolbar") -
                      getHeight("BottomToolbar");
      //open 'er up
      document.getElementById("customizeToolbarSheetPopup").openPopup (
            toolbox,"before_start",(window.innerWidth - sheetWidth) / 2,height
      );
    }

    //findbar has a tendency to disappear, so we'll just show old searchbar to give user something to move around
    let searchAreaOld = document.getElementById("SearchAreaOld");
    if (searchAreaOld)
      searchAreaOld.style.display = "-moz-box";
  },



  //called when you click done or close the customize window
  //customizeToolbarDone: function(toolbarChanged)
  customizeToolbarDone: function()
  {
    let service = scCommon.service,
    styleId = scEdit.styleId,
    style = service.find(styleId,service.REGISTER_STYLE_ON_CHANGE);
    //let removedE = document.getElementById("RemovedItems");

    if (Services.appinfo.OS == "Darwin") {
      document.getElementById("customizeToolbarSheetIFrame").hidden = true;
      document.getElementById("customizeToolbarSheetPopup").hidePopup();
    }

    //restore text/so on
    function restoreText(el,value,type)
    {
      el = document.getElementById(el);
      if (el) {
        if (value)
          el.value = value;
        else if (style)
          el.value = type;
      }
    }
    restoreText("name",scEdit.toolbarName,style.name);
    restoreText("update-url",scEdit.toolbarUrl,style.updateUrl);
    restoreText("tags",scEdit.toolbarTags,style.getMeta("tag",{}).join(" "));

    function restoreValue(el,value)
    {
      el = document.getElementById(el);
      if (el) {
        if (value)
          el.value = value;
      }
    }
    restoreValue("SearchBox",scEdit.toolbarSearch);
    restoreValue("ScratchPad",scEdit.toolbarScratchPad);
    restoreValue("ReplaceBox",scEdit.toolbarReplace);

    let importantText = document.getElementById("ImportantText");
    if (importantText) {
      if (scEdit.toolbarAutoimportant) {
        importantText.value = scEdit.toolbarAutoimportant;
      } else {
        importantText.value = String
            .fromCharCode(scCommon.prefs.getCharPref("autoimportant.key"));
      }
    }

    //checkboxes
    let searchToggle = document.getElementById("SearchToggle");
    if (searchToggle) {
      if (scEdit.toolbarSearchToggle)
        searchToggle.checked = scEdit.toolbarSearchToggle;
      else {
        let replaceArea = document.getElementById("ReplaceArea");
        if (replaceArea && replaceArea.style.display == "none")
          searchToggle.checked = false;
      }
    }

    function restoreCheck(el,value,pref)
    {
      el = document.getElementById(el);
      if (el) {
        if (value)
          el.checked = value;
        else
          el.checked = scCommon.prefs.getBoolPref(pref);
      }
    }
    restoreCheck("wrap-lines",scEdit.toolbarWrapLines,"wrap_lines");
    restoreCheck("ImportantEnabled",
                scEdit.toolbarImportantEnabled,"autoimportant.enabled");

    let toggleEnabled = document.getElementById("ToggleEnabled");
    if (toggleEnabled) {
      if (scEdit.toolbarToggleEnabled)
        toggleEnabled.checked = scEdit.toolbarToggleEnabled;
      else if (style)
        toggleEnabled.checked = style.enabled;
    }

    let updateCheck = document.getElementById("UpdateCheck");
    if (updateCheck) {
      if (scEdit.toolbarUpdateCheck)
        updateCheck.checked = scEdit.toolbarUpdateCheck;
      else if (updateCheck && updateUrlE.value) {
        //if (updateUrlE.value != "") {
        if (updateUrlE.value != "") {
          if (updateUrlE.value.search(/ChoGGiSezNOUPDATE/) != -1)
            updateCheck.checked = false;
          else
            updateCheck.checked = true;
        }
        else
          updateCheck.style.display = "none";
      }
    }

    //which external editor
    scEdit.toggleIAT();
    //toggle rainbow picker menuitem/button
    scEdit.toggleRainbow();

    //for switch to install
    //from Stylish v1.0.2
    let bottomSwitchToInstall = document.getElementById("Bottom_SwitchToInstall");
    if (bottomSwitchToInstall) {
      if (document.getElementById("stylish").getAttribute("windowtype")
                                                          .search(/tp/) > 0) {
        bottomSwitchToInstall.style.display = "-moz-box";//new style
      } else {
        bottomSwitchToInstall.style.display = "none";//old style
      }
    }

    scEdit.populateInsertTextMenu();

    //enable customize cmd
    document.getElementById("cmd_CustomizeToolbars")
              .removeAttribute("disabled");

    //removeEventListener for dragndrop
    document.getElementById("stylish")
              .removeEventListener("drag",scEdit.refreshToolStuff,true);

    // XXX Shouldn't have to do this, but I do
    if (!scEdit.customizeSheet)
      window.focus();

    if (scCommon.prefs.getBoolPref("custom.newsearch") == false)
      return;

    //hide old search because we have to use it instead of findbar (findbar likes to randomly hide itself)
    //still don't know why hidden=false on findbar hides it or why something keeps adding it to findbar
    let searchAreaOld = document.getElementById("SearchAreaOld");
    if (searchAreaOld)
      searchAreaOld.style.display = "none";

    let findbar = document.getElementById("findbar");
    // findbar has a tendency to **** up so sticking this at the end
    if (!findbar)
      return;
    if (scEdit.toolbarSearch2)
      findbar.getElement("findbar-textbox").value = scEdit.toolbarSearch2;
    if (scEdit.toolbarSearch3)
      findbar.getElement("find-label").value = scEdit.toolbarSearch3;

    findbar.style.display = "-moz-box";
    findbar.removeAttribute("hidden");

    if (findbar.getAttribute("browserid") != "internal-code")
      return;
    codeE.fastFind = finder;
    findbar.open();

  },

  //build popup menuitems
  customizeToolbarPopup: function(aEvent)
  {
    let toolbox = document.getElementById("stylishCustomToolbox"),
    popup = aEvent.target;

    // Empty the menu
    for (let i = popup.childNodes.length-1; i >= 0; --i) {
      let deadItem = popup.childNodes[i];
      if (deadItem.hasAttribute("toolbarindex"))
        popup.removeChild(deadItem);
    }

    //push menuitems to an array
    let array = [],
    toolbar;
    for (let i = 0; i < toolbox.childNodes.length; ++i) {
      toolbar = toolbox.childNodes[i];
      //if (toolbar.id == "NameToolbar")
        //continue;
      let toolbarName = toolbar.getAttribute("toolbarname"),
      type = toolbar.getAttribute("type");

      //let toolbarId = toolbar.getAttribute("id");
      if (toolbarName && type != "menubar")
        array.push({bar:toolbar,idx:i});
      //not sure why this is here...
      //toolbar = toolbar.nextSibling;
    }
    //build new menu
    while (array.length != 0) {
      toolbar = array.pop();
      let menuitem = document.createElement("menuitem");
      menuitem.setAttribute("toolbarindex",toolbar.idx);
      menuitem.setAttribute("type","checkbox");
      menuitem.setAttribute("label",toolbar.bar.getAttribute("toolbarname"));
      menuitem.setAttribute("accesskey",toolbar.bar.getAttribute("accesskey"));
      //menuitem.setAttribute("checked",toolbar.getAttribute("collapsed") != "true");
      menuitem.setAttribute("checked",
                              toolbar.bar.getAttribute("collapsed") != "true");
      popup.insertBefore(menuitem,popup.firstChild);
      //popup.appendChild(menuitem);

      menuitem.addEventListener("command",scEdit.onViewToolbarCommand,false);
    }


  },

  onViewToolbarCommand: function(aEvent)
  {
    let toolbox = document.getElementById("stylishCustomToolbox"),
    index = aEvent.originalTarget.getAttribute("toolbarindex"),
    toolbar = toolbox.childNodes[index];

    //toolbar.collapsed = aEvent.originalTarget.getAttribute("checked") != "true";
    toolbar.collapsed = aEvent.originalTarget.getAttribute("checked") != "true";
    document.persist(toolbar.id,"collapsed");
  },

  refreshToolStuffMouse: function()
  {
    let e = scEdit;
    document.getElementById("stylish")
      .removeEventListener("mouseout",e.refreshToolStuffMouse,false);
    //removeEventListener for dragndrop out
    e.refreshToolStuff();
  },

  refreshToolStuff: function()
  {
    //show the buttons for customize
    let bottom_SwitchToInstall = document
                                .getElementById("Bottom_SwitchToInstall");

    if (bottom_SwitchToInstall)
      bottom_SwitchToInstall.style.display = "-moz-box";

    function unhideLabel(name1,name2)
    {
      let name1Element = document.getElementById(name1);
      if (name1Element) {
        name1Element.style.display = "-moz-box";
        name1Element.label = scCommon.getMsg(name2);
      }
    }
    unhideLabel("itsalltext","ExternalEditIAT");
    unhideLabel("ExternalEdit","ExternalEditSC");

    let findbar = document.getElementById("findbar");
    if (findbar) {
      if (findbar.getElement("find-label")) //why did it now decide to be null?
        findbar.getElement("find-label")
                .setAttribute("value",scEdit.toolbarSearch3);
    }
  },

  updateTitlebar: function(name)
  {
    let changeTitle = scCommon.prefs.getIntPref("custom.editorapptitle");

    function title(window,appName)
    {
      if (!scCommon.getWin(window))
        return;
      switch (changeTitle) {
        case 0:
          document.title = name;
        break;
        case 1:
          document.title = appName + " : " + name;
        break;
        case 2:
          document.title = Services.appinfo.name + " : " + name;
        break;
      }
    }
    title("navigator:browser","Fx");
    title("mail:3pane","Tb");
    if (style.id == 0) {//new style
      if (document.title.indexOf(":") == -1)
        document.title = "!: " + document.title;
      else
        document.title = "!" + document.title;
    }
  },

  populateInsertTextMenu: function()
  {
    let textList = prefs.getCharPref("custom.inserttext");

    //create insert text menu
    //if (textList == "") {
    if (textList == "") {
      let insertText = document.getElementById("insertText");
      if (insertText)
        insertText.style.display = "none";
      let Bottom_InsertText = document.getElementById("Bottom_InsertText");
      if (Bottom_InsertText)
        Bottom_InsertText.style.display = "none";
      return;
    }
    textList = textList.split(scCommon.prefs
                              .getCharPref("custom.inserttextsep"));
    let popup = document.getElementById("insertTextPopup");
    if (!popup)
      return;

    //remove old menuitems
    scCommon.removeChild(popup);
    //add new
    for (let i = 0; i < textList.length; i++) {
      let menuitem = document.createElement("menuitem");
      popup.appendChild(menuitem);
      textList[i] = textList[i].replace(/\\\,/g,"\,");
      menuitem.setAttribute("label",textList[i]);
      menuitem.setAttribute("tooltiptext",textList[i]);
    }

    function addMenuitem()
    {
      return function(event) {
        scEdit.insertText(this.getAttribute("label"),event);
      };
    }
    function addListeners(tmpPopup)
    {
      for (let i = 0; i < tmpPopup.childNodes.length; ++i) {
        let menuitemClickEvent = addMenuitem();
        tmpPopup.childNodes[i]
                .addEventListener("click",menuitemClickEvent,false);
      }
    }

    //clone it so mouse over works (instead of having to click to open)
    let menu = document.getElementById("insertText"),
    menuBottom = document.getElementById("Bottom_InsertText");
    if (menu) {
      //clear old insert menuitems
      scCommon.removeChild(menu);
      //clone the menu
      menu.appendChild(popup.cloneNode(true));
      //cloneNode doesn't clone event listeners, so added below
      popup.id = "insertTextPopup2";
      popup = document.getElementById("insertTextPopup");
      popup.id = "insertTextPopup1";
      if (menuBottom)
        menuBottom.setAttribute("popup","insertTextPopup2");
      popup = null;

      addListeners(document.getElementById("insertTextPopup1"));
      if (menuBottom)
        addListeners(document.getElementById("insertTextPopup2"));
    } else if (!menu) {
      addListeners(popup);
    } else if (!menuBottom) {
      addListeners(popup);
    } else if (menuBottom) {
      addListeners(popup);
    }
  },

  insertText: function(text,event)
  {

    this.beforeChange();

    insertCodeAtCaret(text);
    let evt = document.createEvent("KeyboardEvent");
    evt.initKeyEvent("keypress",false,false,null,false,false,false,false,25,0);
    codeE.inputField.dispatchEvent(evt);
    evt = document.createEvent("KeyboardEvent");
    evt.initKeyEvent("keypress",false,false,null,false,false,false,false,27,0);
    codeE.inputField.dispatchEvent(evt);

    this.afterChange();

    //middle/right clicking doesn't hide the insert menu
    if (event.button == 0)
      return;
    //prevent customize menu from opening
    event.preventDefault();
    //close popupmenu
    document.getElementById("InsertMenuPopup").hidePopup();
    document.getElementById("insertTextPopup").hidePopup();
  },

  insertStuff: function(which)
  {
    this.beforeChange();

    switch (which) {
      case 0:
        insertCodeAtStart(CSSHTMLNS);
      break;
      case 1:
        insertCodeAtStart(CSSXULNS);
      break;
      case 2:
        insertChromePath();
      break;
      case 3:
        insertDataURI();
      break;
    }

    this.afterChange();
  },

  undo: function(which)
  {
    //save scroll position
    this.beforeChange();
    //don't ask to undo
    if (scCommon.prefs.getBoolPref("custom.asktorevert") == false) {
      this.revertStyle(which);
      this.afterChange();
      return;
    }
    //ask to undo
    let check = {value: false},
    result = Services.prompt.confirmCheck (
              window,nameE.value,scCommon.getMsg("RevertPrompt"
    ),scCommon.getMsg("DontAskAgain"),check);

    if (result == false)
      return;
    if (check.value == true)
      scCommon.prefs.setBoolPref("custom.asktorevert",false);
    this.revertStyle(which);
    //restore scroll position
    this.afterChange();
  },

  styleCodeLast: null,
  styleCodeOriginal: null,

  revertStyle: function(which)
  {
    if (which != "UndoLast") {
      if (this.styleCodeOriginal != null)
        codeE.value = this.styleCodeOriginal;
      return;
    }
    if (this.styleCodeLast != null)
      codeE.value = this.styleCodeLast;
  },

  codeElKeyDown: function(key,that)
  {
    if (key == 37 || key == 38 || key == 39 || key == 40)
      this.lineNumber(that);
    if (key == 114)
      scEdit.findNext();
  },

  lineNumber: function(that)
  {
    //delay it for 50ms
    let observer = {
      observe: function()
      {
        timer.cancel();
        //do stuff
        let lineNumber = document.getElementById("LineNumber");
        if (!lineNumber)
          return;
        //get text from start to caret position
        let text = that.value.slice(0,that.selectionEnd),
        //split with new lines
        lines = text.split("\n");
        //add a 0 line
        lines.splice(0,0,0);
        //add values to textbox
        lineNumber.value = lines.length-1 + ":" + lines[lines.length-1].length;
      }
    };
    let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.init(observer,50,Ci.nsITimer.TYPE_ONE_SHOT);
  },

  lineNumberSearchChoice: function(button,num)
  {
    if (button == 0) {//left click
      this.lineNumberSearch(num,13);
    } else {
      let lineNumberSearch = document.getElementById("LineNumberSearch");
      if (!lineNumberSearch)
        return;
      lineNumberSearch.inputField.value = "";
    }
  },

  lineNumberSearchDrag: function(that,event)
  {
    //get text from drag event
    let text = event.dataTransfer.getData("text/plain");
    //call the search function
    this.lineNumberSearch(text,13);
    //remove old value from search box
    that.value = "";
  },

  lineNumberSearchType: function(num,event)
  {
    if (event.keyCode == 13) {
      this.lineNumberSearch(num,13);
      return;
    }
    if (event.ctrlKey == true && event.keyCode == 86) {//ctrl+v
      num = document.getElementById("LineNumberSearch");
      if (num)
        this.lineNumberSearch(num.inputField.value,13);
    }
  },

  lineNumberSearch: function(num,key)
  {
    if (key != 13)
      return;
    if (num == 0) {
      codeE.inputField.scrollTop = 0;
      return;
    }
    let lines = codeE.value.split("\n");//split with new lines

    //add an item to the start of the array (we want to start with 1)
    lines.splice(0,0,0);
    //if we're using columns as well
    let col = null,row = null;
    if (num.indexOf(":") != -1) {
      num = num.split(":");
      row = num[0];
      col = num[1];
    } else
      row = num;

    //which line to scroll to
    let end = "",start = "",newLines,lastLine;
    for (let i = 1; i < lines.length; i++) {
      end += lines[i];
      start += lines[i];
      //skip last line for selection start num
      if (i == row && row != 1) {
        newLines = i;
        start = start.slice(0,-lines[newLines--].length);
        lastLine = lines[i].length;
      }
      //just get the lines we need
      if (i >= row)
        break;
    }

    //need to focus on code area to highlight
    codeE.focus();
    if (row == 1) {//first line
      codeE.setSelectionRange(0,end.length);
    } else if (start == "") {//it'll select too much if there's nothing on the line
      codeE.setSelectionRange(end.length+newLines,end.length+newLines);
    } else {//if we have text on the line
      if (col) {
        codeE.setSelectionRange(start.length+newLines,
                                end.length+newLines-lastLine+col++);
      } else {
        codeE.setSelectionRange(start.length+newLines,end.length+newLines+1);
      }
    }

    //scroll to line (16 pixels a line...)
    if (newLines > 4) {
      newLines = newLines-4;
      codeE.inputField.scrollTop = newLines*16;
    } else {
      codeE.inputField.scrollTop = 0;
    }
  },

  //toggle update checkbox
  updateUrlCheck: function()
  {
    let updateCheck = document.getElementById("UpdateCheck");
    if (!updateCheck)
      return;

    if (updateUrlE.value == "") {
      updateCheck.style.display = "none";
      return;
    }

    if (updateUrlE.value.search(/ChoGGiSezNOUPDATE/) == -1)
      updateCheck.checked = true;
    else
      updateCheck.checked = false;

    updateCheck.style.display = "-moz-box";
  },

  //toggle update check
  updateCheckToggle: function()
  {
    if (updateUrlE.value.search(/ChoGGiSezNOUPDATE/) == -1)
      updateUrlE.value = "ChoGGiSezNOUPDATE" + updateUrlE.value;
    else
      updateUrlE.value = updateUrlE.value.replace(/ChoGGiSezNOUPDATE/,"");
  },

  //page button
  pageStyleId: null,
  pageStyleUrl: null,
  userstylesPage: function(event)
  {
    let mainWin = scCommon.getMainWindow(),
    content = mainWin.document.getElementById("content");

    if (!content)
      return;

    let appContent = mainWin.document.getElementById("appcontent");
    if (!appContent)// songbird
      appContent = mainWin.document.getElementById("frame_main_pane");

    function pageListen(newStyle)
    {
      scEdit.pageStyleId = document.getElementById("stylish")
                          .getAttribute("windowtype");
      if (newStyle != true) {
        scEdit.pageStyleUrl = styleUrl + "/edit";
        content.addTab(styleUrl + "/edit");
      } else
        content.addTab("http://userstyles.org/styles/new");
      appContent.removeEventListener("DOMContentLoaded",scEdit.onPageLoad,true);
      appContent.addEventListener("DOMContentLoaded",scEdit.onPageLoad,true);
    }

    if (!updateUrlE.value) {//new style
      pageListen(true);
      return;
    }

    let styleUrl = updateUrlE.value
      //so we can get to the /edit page
      .replace(/\.css$/i,"")
      //used to stop styles from updating
      .replace(/(ChoGGiSezNOUPDATE)/,"")
      //good question
      .replace(/raw\//,"")
      //added to new styles?
      .replace(/\/about-firefox\?r\=.*$/,"");
    switch (event.button) {
      case 0: //left
        content.addTab(styleUrl);
      break;
      case 1: //middle
        content.addTab(styleUrl + "/edit");
      break;
      case 2: //right
        pageListen();
        //alert(styleUrl);
      break;
    }
  },

  //used for adding style code to /edit page
  onPageLoad: function(event)
  {
    if (typeof (scCommon) == "undefined")
      return;

    let mainWin = scCommon.getMainWindow(),
    appContent = mainWin.document.getElementById("appcontent");

    if (!appContent)
      appContent = mainWin.document.getElementById("frame_main_pane");//songbird
    function removeEvent()
    {
      appContent.removeEventListener("DOMContentLoaded",scEdit.onPageLoad,true);
    }

    //check if the edit window was closed
    let editWin = scCommon.getWin(scEdit.pageStyleId);
    if (!editWin) {
      removeEvent();
      return;
    }

    let doc = event.originalTarget,// doc is document that triggered "onload" event
    //check that we're on the right page
    oldStyle = doc.location.href.indexOf(scEdit.pageStyleUrl),
    newStyle = doc.location.href.indexOf("userstyles.org/styles/new");

    if (newStyle != -1 && oldStyle != -1 || newStyle == -1 &&
        oldStyle == -1 || !newStyle && !oldStyle)
      return;

    //get the name/code
    let code = editWin.document.getElementById("internal-code").value,
    name = editWin.document.getElementById("name").value,
    //get elements on the page
    cssEl = doc.getElementById("css"),
    nameEl = doc.getElementById("style_short_description");

    //check for css element and add style code
    //if (cssEl && code != "")
    if (cssEl && code != "")
      cssEl.value = code;

    //if it's a new style then also add the name
    //if (newStyle != -1 && name != "" && nameEl)
    if (newStyle != -1 && name != "" && nameEl)
      nameEl.value = name;

    //remove event listener
    removeEvent();
  },

  //for auto!important checkbox
  changeImportantEnabled: function(checked)
  {
    scCommon.prefs.setBoolPref("autoimportant.enabled",checked);

    if (!checked)
      return;
    this.insertImportantEvent = function(event)
    {
      if (event.which == scCommon.prefs.getCharPref("autoimportant.key")) {
        event.preventDefault();
        scEdit.insertImportant();
      }
    };
    codeE.addEventListener("keypress",this.insertImportantEvent,false);
  },

  //for auto!important textbox
  getKeyCode: function(eventkey)
  {

    if (eventkey == 8 || eventkey == 32 || eventkey == 0) {
      alert(scCommon.getMsg("InvalidKey"));
      return;
    }
    scCommon.prefs.setCharPref("autoimportant.key",eventkey);
    codeE.removeEventListener("keypress",scEdit.insertImportantEvent,false);
    this.insertImportantEvent = function(event)
    {
      if (event.which == eventkey) {
        event.preventDefault();
        scEdit.insertImportant();
      }
    };
    codeE.addEventListener("keypress",this.insertImportantEvent,false);
  },

  insertImportantEvent: null,
  //when you press auto!important key in edit style area
  insertImportant: function()
  {
    this.beforeChange();

    //insert Important
    insertCodeAtCaret(scCommon.prefs.getCharPref("autoimportant.text"));
    //send right arrow to move caret to the end of inserted text
    let evt = document.createEvent("KeyboardEvent");
    evt.initKeyEvent("keypress",true,true,null,false,false,false,false,39,0);
    codeE.inputField.dispatchEvent(evt);

    this.afterChange();
  },

  styleBox: null,
  styleScroll: null,

  //preserve scroll position (stylish v0.5.9)
  beforeChange: function()
  {
    this.styleBox = codeE.inputField;
    this.styleScroll = [this.styleBox.scrollTop,this.styleBox.scrollLeft];
  },

  //restore scroll position
  afterChange: function()
  {
    this.styleBox.scrollTop = this.styleScroll[0];
    this.styleBox.scrollLeft = this.styleScroll[1];
  },

  oldPreview: null,
  togglePreview: function(which)
  {
    let unPreview = document.getElementById("DisablePreview");
    if (!unPreview)
      return;

    let errorsArea = document.getElementById("errorsArea"),
    styleReg = scCommon.prefs.getBoolPref("styleRegistrationEnabled"),
    uri;

    if (styleReg == false) {
      if (this.oldPreview)
        scCommon.applyStyle(this.oldPreview,false);
      uri = scCommon.getdataUrl(codeE.inputField.value,nameE.inputField.value);
      this.oldPreview = uri;
    }

    if (which == "UnPreview") { //turn off preview

      if (styleReg == false)
        scCommon.applyStyle(uri,false);

      unPreview.style.display = "none";
      errorsArea.style.display = "none";
      dialogClosing();
      //style.setPreview(false);
    } else { //apply preview
      //check if "turn all styles off" is enabled
      if (styleReg == false)//so we can still preview with all styles turned off
        scCommon.applyStyle(uri,true);
      //show unpreview button
      unPreview.style.display = "-moz-box";
      //preview stuff from stylish
      style.name = nameE.value;
      if (codeE.value != initialCode) {
        style.code = codeE.value;
        // once the user has changed once, they've committed to changing so we'll forget the initial
        initialCode = null;
      }
      checkForErrors();
      //needs to be unpreviewed for some reason...
      style.setPreview(false);
      style.setPreview(true);

      //for setting height of error box
      //1ms delay
      let observer = {
        observe: function()
        {
          let errorMaxH = errorsArea.maxHeight,
          ErrorsLength = document.getElementById("errors").children.length;
          if (ErrorsLength == 0) {
              errorsArea.style.display = "none";
              return;
            }
          switch (ErrorsLength) {
            case 1:
              errorMaxH = 16;
            break;
            case 2:
              errorMaxH = 32;
            break;
            case 3:
              errorMaxH = 48;
            break;
            case 4:
              errorMaxH = 64;
            break;
          }
          if (ErrorsLength > 5)
            errorMaxH = 80;
          errorsArea.style.display = "-moz-box";
          timer.cancel();
        }
      };
      let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      timer.init(observer,1,Ci.nsITimer.TYPE_ONE_SHOT);
    }
  },

  searchToggle: function(checked,which)
  {
    let replaceArea = document.getElementById("ReplaceArea");
    if (!replaceArea)
      return;
    let searchToggle = document.getElementById("SearchToggle"),
    searchArea;

    if (scCommon.prefs.getBoolPref("custom.newsearch") == true) {
      searchArea = document.getElementById("findbar");
      if (!searchArea)//stylish 1.0.5 or less has no new search so we'll use old search
        searchArea = document.getElementById("SearchAreaOld");
    } else
      searchArea = document.getElementById("SearchAreaOld");

    if (searchToggle) {
      //for ctrl+f
      //if (which != "")
      if (which != "")
        searchToggle.checked = checked;

      if (checked) {
        searchToggle.label = scCommon.getMsg("Search");
        searchArea.style.display = "-moz-box";
        replaceArea.style.display = "none";
      } else {
        searchToggle.label = scCommon.getMsg("Replace");
        searchArea.style.display = "none";
        replaceArea.style.display = "-moz-box";
      }
    }

  replaceArea.focus();
  },

  exportStyle: function()
  {
    const nsIFilePicker = Ci.nsIFilePicker;
    let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

    fp.init(window,scCommon.getMsg("ExportTitle"),nsIFilePicker.modeSave);
    //show filepicker and set path
    fp.defaultString = style.name + ".css";
    fp.appendFilters(nsIFilePicker.filterAll);
    if (fp.show() == nsIFilePicker.returnCancel)
      return;
    let foStream = Cc["@mozilla.org/network/file-output-stream;1"]
                  .createInstance(Ci.nsIFileOutputStream),
    converter = Cc["@mozilla.org/intl/converter-output-stream;1"]
                .createInstance(Ci.nsIConverterOutputStream);

    //init the file stream
    foStream.init(fp.file,
                  parseInt("0x02",16)|
                  parseInt("0x08",16)|
                  parseInt("0x20",16),
                  parseInt("0664",8),0
    ); // write, create, truncate

    converter.init(foStream,"UTF-8",0,0);
    //write it to disk
    converter.writeString(codeE.value);
    //close the file
    converter.close();
    foStream.close();
  },

  toggleScratchPad: function()
  {
    let scratchPad = document.getElementById("ScratchPadToolbar");
    if (!scratchPad)
      return;
    if (scratchPad.getAttribute("collapsed") == "true")
      scratchPad.setAttribute("collapsed",false);
    else
      scratchPad.setAttribute("collapsed",true);
  },

  clearSearch: function(which)
  {
    //scratchPad button
    if (which == 1) {
      let scratchPad = document.getElementById("ScratchPad");
      if (scratchPad)
        scratchPad.value = "";
      return;
    }

    //have to focus on input and fire delete to reset colours
    function fireKeyEvent(input)
    {
      input.value = "temp";
      input.focus();
      let evt = document.createEvent("KeyboardEvent");
      evt.initKeyEvent("keypress",false,false,null,true,false,false,false,8,0);
      input.inputField.dispatchEvent(evt);
      input.value = "";
    }

    let searchBox = document.getElementById("SearchBox"),
    findbar = document.getElementById("findbar");

    if (searchBox && searchBox.style.display != "none" &&
        typeof (searchBox.inputField) != "undefined")
      fireKeyEvent(searchBox);

    if (findbar && findbar.style.display != "none") {
      let findbarTextbox = findbar.getElement("findbar-textbox");
      if (!findbarTextbox.inputField)
        return;
      fireKeyEvent(findbarTextbox);
    }

  },

  //for replacing text
  replaceText: function(what)
  {
    let replaceBox = document.getElementById("ReplaceBox"),
    findbar = document.getElementById("findbar"),
    searchBox,
    selected,
    styleCode;

    if (scCommon.prefs.getBoolPref("custom.newsearch") == true && findbar)
      searchBox = findbar.getElement("findbar-textbox");
    else
      searchBox = document.getElementById("SearchBox");
    //check if searchbox is blank
    if (searchBox.value == "")
      return;
    //get caret position
    let caretPosition = codeE.selectionEnd,
    regex,
    selectionEnd;
    //no text selected
    if (codeE.selectionStart-codeE.selectionEnd == 0) {
      selected = false;
      styleCode = codeE.value;
      if (what == "ReplaceOnce") {
        //get text before caret
        let styleCodeBefore = styleCode.substr(0,caretPosition);
        //get text after caret
        styleCode = styleCode.substr(caretPosition);
        //used to move caret to after replaced text
        caretPosition = styleCode.toLowerCase().indexOf (
                        searchBox.value.toLowerCase()
        )+styleCodeBefore.length+replaceBox.textLength;
        //replace search text
        styleCode = styleCode.replace(searchBox.value,replaceBox.value);
        //restore the before caret text
        styleCode = styleCodeBefore + styleCode;
      } else if (what == "ReplaceAll") {
        regex = new RegExp(searchBox.value,"ig");
        styleCode = styleCode.replace(regex,replaceBox.value);
        caretPosition = styleCode.length;
       }
      codeE.value = styleCode;
    //text selected
    } else if (codeE.selectionStart-codeE.selectionEnd < 0) {
      selected = true;
      styleCode = codeE.value
                        .substring(codeE.selectionStart,codeE.selectionEnd);
      if (what == "ReplaceOnce")
        styleCode = styleCode.replace(searchBox.value,replaceBox.value);
      else if (what == "ReplaceAll") {
        regex = new RegExp(searchBox.value,"ig");
        styleCode = styleCode.replace(regex,replaceBox.value);
      }
      selectionEnd = codeE.selectionStart+styleCode.length;
      codeE.value = codeE.value.substring(0,codeE.selectionStart) + styleCode +
                  codeE.value.substring(codeE.selectionEnd,codeE.value.length);
    }

    codeE.focus();
    let evt = document.createEvent("KeyboardEvent");
    evt.initKeyEvent("keypress",false,false,null,false,false,false,false,39,0);
    codeE.inputField.dispatchEvent(evt);
    if (selected == false)
      codeE.setSelectionRange(caretPosition,caretPosition);
    else if (selected == true)
      codeE.setSelectionRange(selectionEnd-styleCode.length,selectionEnd);
  },

  //http://userstyles.org/forum/comments.php?DiscussionID=426
  //thanks Mikado
  styleSearchField: function(notfound)
  {
    let searchBox = document.getElementById("SearchBox");
    if (!searchBox)
      return;

    this.searchToggle(true,"Search");
    searchBox.focus();
    searchBox.style.backgroundColor = (notfound ? "red" : null);
    searchBox.inputField.style.backgroundColor = (notfound ? "red" : null);
    searchBox.inputField.style.color = (notfound ? "#fff" : null);
  },

  findNext: function()
  {
    let searchArea = document.getElementById("SearchAreaOld");
    if (!searchArea)
      return;

    if (searchArea.style.display == "none") {
      searchArea = document.getElementById("findbar");
      if (searchArea) {
        searchArea.onFindAgainCommand(false);
        return;
      }
    }

    let searchBox = document.getElementById("SearchBox");
    if (searchBox.value == "") {
      this.searchToggle(true,"Search");
      searchBox.focus();
    } else {
      let code = codeE.value,
      searchText = searchBox.value,
      //check for search terms from caret position
      found = code.toLowerCase()
                  .indexOf(searchText.toLowerCase(),codeE.selectionEnd);
      //if not found search from the start
      if (found == -1)
        found = code.toLowerCase().indexOf(searchText.toLowerCase());
      //if it's found then highlight
      if (found != -1) {
        codeE.focus();
        codeE.setSelectionRange(found,found+searchText.length-1);
        let evt = document.createEvent("KeyboardEvent");
        evt.initKeyEvent("keypress",
                          false,false,null,false,false,true,false,39,0);
        codeE.inputField.dispatchEvent(evt);
      } else {
      //else change searchbox colour
        this.styleSearchField(found);
      }
    }
  },

  checkSearchBox: function()
  {
    let searchBox = document.getElementById("SearchBox");
    if (!searchBox)
      return;

    if (searchBox.value == "")
      searchBox.focus();
    else
      this.findNext();
  },

  ToggleBars: function()
  {
    //get the list of bars to toggle
    let barList = scCommon.prefs.getCharPref("custom.togglebars").split(",");
    //loop the bars
    for (let i = 0; i < barList.length; i++) {
      let name = document.getElementById(barList[i]);
      if (name.getAttribute("collapsed") == "true")
        name.setAttribute("collapsed",false);
      else
        name.setAttribute("collapsed",true);
    }
  },

  //adds/removes /**/ to/from selected text or merges multiple lines
  editText: function(which)
  {
    this.beforeChange();

    let selTxt = codeE.value.substring(codeE.selectionStart,codeE.selectionEnd);

    switch (which) {
      case "Merge":
        //merge lines of text
        selTxt = selTxt.replace(/\u000A/g,"").replace(/\u000D/g,"");
      break;
      case "Comment":
        //adds/removes /**/
        if (selTxt.search(/^[\s]*\/\*[\s\S]*\*\/[\s]*$/))
          selTxt = "/*" + selTxt + "*/";
        else
          selTxt = selTxt.replace(/^([\s]*)\/\*([\s\S]*)\*\/([\s]*)$/gm,"$1$2$3");
      break;
      case "CommentGroup":
        // /*comments*/ a group of text and removes /*comments*/ form within it
        selTxt = this.commentGroup(selTxt,scCommon);
        if (!selTxt)//commentGroup: style doesn't exist
          return;
      break;
      case "Class":
        // [class="example"] to .example or reversed
        if (selTxt.search(/^[\s]*\[class[\S]*\"\][\s]*$/i))
          selTxt = selTxt.replace(/^([\s]*)\.([\S]*)([\s]*)$/igm,"$1[class=\"$2\"]$3");
        else
          selTxt = selTxt.replace(/^([\s]*)\[class=\"([\S]*)\"\]([\s]*)$/igm,"$1.$2$3");
      break;
      case "ID":
        // [id="example"] to #example or reversed
        if (selTxt.indexOf("[id") != -1 || selTxt.indexOf("#") != -1) {
          if (selTxt.search(/^[\s]*\[id[\S]*\"\][\s]*$/i))
            selTxt = selTxt.replace(/^([\s]*)\#([\S]*)([\s]*)$/igm,"$1[id=\"$2\"]$3");
          else
            selTxt = selTxt.replace(/^([\s]*)\[id=\"([\S]*)\"\]([\s]*)$/igm,"$1#$2$3");
        } else if (selTxt.indexOf("[@id") != -1 &&
                  selTxt.search(/^[\s]*\[@id[\S]*\"\][\s]*$/i) != -1) {
          selTxt = selTxt.replace(/^([\s]*)\[@id=\"([\S]*)\"\]([\s]*)$/igm,"$1#$2$3");
        } else if (selTxt.indexOf("//*[@id") != -1 &&
                  selTxt.search(/^[\s]*\/\/\*\[@id[\S]*\"\][\s]*$/i) != -1) {
          selTxt = selTxt
                    .replace(/^([\s]*)\/\/\*\[@id=\"([\S]*)\"\]([\s]*)$/igm,"$1#$2$3");
        }
      break;
      case "Bracket":
        //adds/removes []
        if (selTxt.search(/^[\s]*\[[\s\S]*\][\s]*$/))
          selTxt = "[" + selTxt + "]";
        else
          selTxt = selTxt.replace(/^([\s]*)\[([\s\S]*)\]([\s]*)$/gm,"$1$2$3");
      break;
      case "CurlyBracket":
        //adds/removes {}
        if (selTxt.search(/^[\s]*\{[\s\S]*\}[\s]*$/))
          selTxt = "{" + selTxt + "}";
        else
          selTxt = selTxt.replace(/^([\s]*)\{([\s\S]*)\}([\s]*)$/gm,"$1$2$3");
      break;
      case "RemoveXUL":
        //removes xul:
        codeE.value = codeE.value.replace(/xul\:/ig,"");
      break;
    }

    let selectionEnd = codeE.selectionStart+selTxt.length;
    codeE.value = codeE.value.substring(0,codeE.selectionStart) + selTxt +
                  codeE.value.substring(codeE.selectionEnd,codeE.value.length);
    codeE.focus();

    let evt = document.createEvent("KeyboardEvent");
    evt.initKeyEvent("keypress",false,false,null,false,false,false,false,39,0);
    codeE.inputField.dispatchEvent(evt);
    codeE.setSelectionRange(selectionEnd-selTxt.length,selectionEnd);

    this.afterChange();
  },

  commentGroup: function(selectedText,com)
  {
    //new style
    if (!style) {
      alert(com.getMsg("NeedToSave"));
      return null;
    }
    //we don't want to change the code, just meta
    style.mode = style.CALCULATE_META;
    let comment,
    commentId,
    comments;

    function listComments(commentId)
    {
      let commentArray = [],
      rightComment;
      //get list of comments
      comments = style.getMeta("scComment",{}).join("|nsChoGGiSezSplit|");
      //split them then loop through them
      comments = comments.split("|nsChoGGiSezSplit|");
      for (let i = 0; i < comments.length; i++) {
        //if the comment is blank
        if (comments[i] == "")
          continue;
        //if we don't have an id & if it isn't the right id
        if (typeof (commentId) !== "undefined" &&
                    comments[i].indexOf(commentId) == -1) {
          continue;
        }
        comment = comments[i].split("@nsChoGGiSezSplit@");
        for (let j = 0; j < comment.length; j++) {
          if (rightComment == true) {
            //push it to the array
            commentArray.push({id:comment[j-1],comment:comment[j]});
            rightComment = "";
          }
          if (comment[j] > 0)
            rightComment = true;
        }
      }
      return commentArray;
    }
    //remove any surrounding line breaks/spaces (so it makes less metadata)
    selectedText = selectedText.replace(/^[\n\r\u2028\u2029 ]*/,"")
                              .replace(/[\n\r\u2028\u2029 ]*$/,"");
    if (selectedText.search(/^[\n\r\u2028\u2029 ]*\/\* scComment/) == -1) {//new comment
      comments = listComments();
      commentId = null;
      for (let i = 0; i < comments.length; i++) {
        if (comments[i].comment == selectedText) {
          commentId = comments[i].id;
          break;
        }
      }
      if (!commentId) {//if it's null add a new comment id
        //get randnum for id
        commentId = Math.random().toString().replace(/^0\./,"");
        //add the comment to meta
        comment = commentId + "@nsChoGGiSezSplit@" + selectedText;
        style.addMeta("scComment",comment);
        style.save();
      }
      //replace comments
      selectedText = selectedText.replace(/\*\//gm,"").replace(/\/\*/gm,"") + "*/";
      //add text to to selected text
      selectedText = "/* scComment" + commentId + "\n" + selectedText;
      //not sure if i need to change back the mode but
      style.mode = style.CALCULATE_META | style.REGISTER_STYLE_ON_CHANGE;
      return selectedText;
    }
    //not a new comment
    //get id from text
    commentId = selectedText
                  .split("\n")[0].replace(/^[\n\r\u2028\u2029 ]*\/\* scComment/,"");
    //get comment from meta
    comments = listComments(commentId);
    //is it the right comment?
    if (comments[0].id == commentId)//change selected text to comment
      selectedText = comments[0].comment;
    //not sure if i need to change back the mode but
    style.mode = style.CALCULATE_META | style.REGISTER_STYLE_ON_CHANGE;
    return selectedText;
  },

  whichSearchBox: function()
  {
    let searchArea = document.getElementById("SearchAreaOld");
    if (!searchArea)
      return;

    scEdit.searchToggle(true,"Search");

    if (searchArea.style.display == "none") {
      searchArea = document.getElementById("findbar");
      if (searchArea) {
        searchArea.getElement("findbar-textbox").focus();
        return;
      }
    }
    searchArea.focus();
    scEdit.styleSearchField();
  },

  //for new save & close button
  checkIfSaved: function(which)
  {
    if (which == "Close")
      this.addNewLine();
    if (this.save() && which == "Close") {
      this.unLoad();
      window.close();
    }
  },

  toggleSaveClose: function(which)
  {
    this.addNewLine();
    if (this.save(which)) {
      this.unLoad();
      window.close();
    }
  },


  switchToInstall: function()
  {
    Services.prefs.setBoolPref("extensions.stylish.editOnInstall",false);
    style.name = nameE.value;
    if (codeE.value != initialCode)
      style.code = codeE.value;
    stylishCommon.openInstall({style: style,installPingURL: installPingURL});

    //do the closing stuff
    this.unLoad();
    window.close();
  },

  //below here is from Stylish 0.5.9 (edited)
  makeImportant: function()
  {
    //preserve scroll position
    let box = codeE.inputField,
    scroll = [box.scrollTop,box.scrollLeft],
    code = codeE.value,
    declarationBlocks = code.match(/\{[^\{\}]*[\}]/g),
    declarations = [],
    replacements = [];

    //change ;base64 to __base64__ so we don't match it on the ; when we split declarations
    code = code.replace(/;base64/g,"__base64__");
    if (declarationBlocks == null)
      return;
    declarationBlocks.forEach(function (declarationBlock)
    {
      declarations = declarations.concat(declarationBlock.split(/;/));
    });
    //make sure everything is really a declarationand make sure it's not already !important
    declarations = declarations.filter(function (declaration)
    {
      return /[A-Za-z0-9-]+\s*:\s*[^};]+/.test(declaration) &&
                      !/!\s*important/.test(declaration);
    });
    //strip out any extra stuff like brackets and whitespace
    declarations = declarations.map(function (declaration)
    {
      return declaration.match(/[A-Za-z0-9-]+\s*:\s*[^};]+/)[0].replace(/\s+$/,"");
    });
    //replace them with "hashes" to avoid a problem with multiple identical name/value pairs
    declarations.forEach(function (declaration)
    {
      let replacement = {hash: Math.random(),value: declaration};
      replacements.push(replacement);
      code = code.replace(replacement.value,replacement.hash);
    });
    replacements.forEach(function (replacement)
    {
      code = code.replace(replacement.hash,replacement.value + "!important");
    });

    //quick fix for !important !important
    code = code.replace(/!important !important/g,"!important");
    //put ;base64 back
    code = code.replace(/__base64__/g,";base64");
    codeE.value = code;

    //restore scroll position
    box.scrollTop = scroll[0];
    box.scrollLeft = scroll[1];
  },

  colorChosen: false,
  chooseColor: function(event)
  {
    this.colorChosen = true;
    let parent = event.target.parentNode;

    while (parent != null) {
      switch (parent.nodeName) {
        case "menupopup":
          parent.hidePopup();
        break;
        case "button":
          parent.open = false;
        break;
      }
      parent = parent.parentNode;
    }

    let observer = {
      observe: function()
      {
        scEdit.insertColor();
        timer.cancel();
      }
    };
    let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.init(observer,1,Ci.nsITimer.TYPE_ONE_SHOT);
  },

  insertColor: function()
  {
    let e = scEdit;
    if (e.colorChosen) {
      e.beforeChange();

      codeE.focus();
      insertCodeAtCaret(document.getElementById("normal-colorpicker").color);
      let evt = document.createEvent("KeyboardEvent");
      evt.initKeyEvent("keypress",
                        false,false,null,false,false,false,false,25,0);
      codeE.inputField.dispatchEvent(evt);
      evt = document.createEvent("KeyboardEvent");
      evt.initKeyEvent("keypress",
                        false,false,null,false,false,false,false,27,0);
      codeE.inputField.dispatchEvent(evt);
      codeE.setSelectionRange(codeE.selectionStart-7,codeE.selectionStart);
      e.colorChosen = false;

      e.afterChange();
    }
  },

  rainbowPickerJustChanged: false,
  insertRainbowPickerColor: function(event)
  {
    let e = scEdit;
    e.beforeChange();

    //rainbowpicker does it twice...
    if (e.rainbowPickerJustChanged)
      return;
    e.rainbowPickerJustChanged = true;

    let observer = {
      observe: function()
      {
        e.rainbowPickerJustChanged = false;
        timer.cancel();
      }
    };
    let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.init(observer,100,Ci.nsITimer.TYPE_ONE_SHOT);

    codeE.focus();
    insertCodeAtCaret(event.target.color);
    let evt = document.createEvent("KeyboardEvent");
    evt.initKeyEvent("keypress",false,false,null,false,false,false,false,25,0);
    codeE.inputField.dispatchEvent(evt);
    evt = document.createEvent("KeyboardEvent");
    evt.initKeyEvent("keypress",false,false,null,false,false,false,false,27,0);
    codeE.inputField.dispatchEvent(evt);
    codeE.setSelectionRange(codeE.selectionStart-7,codeE.selectionStart);

    e.afterChange();
  },

  openSitesDialog: function()
  {
    window.openDialog("chrome://stylish-custom/content/specifySites.xul",
            "stylishSpecifySites","chrome,modal,resizable,centerscreen",
            this.applySpecifySite);
  },

  //Process the return from the specify site dialog
  applySpecifySite: function(data)
  {
    if (data.length == 0)
      return;

    let selector = "",
    newValue,
    newCaretPosition;
    for (let i = 0; i < data.length; i++) {
      //if (selector != "")
      if (selector != "")
        selector += ", ";
      selector += data[i].type + "(" + data[i].site + ")";
    }
    selector = "@-moz-document " + selector + "{\n";
    if (codeE.selectionStart != codeE.selectionEnd) {
      //there's a selection, so let's cram the selection inside
      let selection = codeE.value
                          .substring(codeE.selectionStart,codeE.selectionEnd);
      //if there's stuff before the selection, include whitespace
      if (codeE.selectionStart > 0)
        newValue = codeE.value.substring(0,codeE.selectionStart) + "\n";
      newValue += selector;
      newCaretPosition = newValue.length;
      newValue += selection + "\n}";
      //if there's stuff after the selection, include whitespace
      if (codeE.selectionEnd < codeE.value.length) {
        newValue += "\n" + codeE.value
                            .substring(codeE.selectionEnd,codeE.value.length);
      }
    } else {
      //there's no selection, just put it at the end
      //if there's stuff in the textbox, add some whitespace
      if (codeE.value.length > 0) {
        newValue = codeE.value + "\n" + selector;
        newCaretPosition = newValue.length;
        newValue += "\n}";
      } else {
        newValue = selector;
        newCaretPosition = newValue.length;
        newValue += "\n}";
      }
    }

    codeE.value = newValue;
    codeE.focus();
    codeE.setSelectionRange(newCaretPosition,newCaretPosition);
  },

  addNewLine: function()
  {
    //add a newline so it saves it (else it doesn't save the original code)
    let newLine = codeE.value.slice(codeE.value.length-2);
    if (newLine != "\n\n")
      codeE.value = codeE.value + "\n";
    else
      codeE.value = codeE.value.slice(0,codeE.value.length-2) + "\n";
  },

  errorCodeCopy: function(that)
  {
    let scratchPad = document.getElementById("ScratchPad");
    if (!scratchPad)
      return;
    scratchPad.value = scratchPad.value + "\n" + that.textContent;
    scCommon.tooltip("ErrorCodeCopied",codeE,document);
  },

  saveSearchText: function(prefs)
  {
    //which search box to use
    let searchBox;
    if (prefs.getBoolPref("custom.newsearch") == true)
      searchBox = document.getElementById("findbar");
    else
      searchBox = document.getElementById("SearchBox");
    //if user removed
    if (!searchBox)
      return;
    if (searchBox.hasAttribute("browserid"))//new search
      prefs.setCharPref("custom.searchtext",searchBox
                                          .getElement("findbar-textbox").value);
    else //old search
      prefs.setCharPref("custom.searchtext",searchBox.value);
  },

  cloneStyle: function()
  {
    let clone = scCommon.styleInit(null,null,null,null,nameE.value + " " +
            scCommon.getMsg("Cloned"),codeE.value,style.enabled,null,null,null),
    //from Stylish 1.*
    params = {style: clone},
    name = scCommon.getWindowName("stylishEdit");
    params.windowType = name;

    //open the edit dialog
    window.openDialog("chrome://stylish-custom/content/edit.xul",name,
                    "chrome,resizable,dialog=no",params,"Cloned",style.enabled,
                    window.screenY,window.screenX);
  },

  //set style id button text
  updateStyleId: function(id) {
    let styleBut = document.getElementById("StyleId");
    if (!styleBut)
      return;
    if (id)
      styleBut.inputField.value = id;
    else
      styleBut.inputField.value = this.styleId;
  },

  //save() function from Stylish (changed a bit)
  save: function(which)
  {
    style.name = nameE.value;
    if (!style.name) {
      alert(strings.getString("missingname"));
      return false;
    }
    let code = codeE.value;
    if (!code) {
      alert(strings.getString("missingcode"));
      return false;
    }
    //if they only save it might as well throw in the error display
    checkForErrors();

    //for revert last
    this.styleCodeLast = code;

    let newStyle,
    uniqueTags;

    if (!style.id) {
      // new styles start out enabled
      style.enabled = true;
      //to remove the ! from the title
      newStyle = 1;
    } else if (!style.enabled) {
      // turn off preview for previously saved disabled styles to avoid flicker
      style.setPreview(false);
    }

    //for save as disabled/enabled
    if (which == 0 || which == 1) {
      if (which == 0)
        style.enabled = false;
      else
        style.enabled = true;
    } else {
      //see what the checkbox says about enabled
      let toggleE = document.getElementById("ToggleEnabled");
      if (toggleE) {
        if (toggleE.checked == true)
          style.enabled = true;
        else
          style.enabled = false;
      }
    }

    if (code != initialCode) {
      style.code = code;
      initialCode = style.code;
    } else {
      style.revert();
      // we don't want to change the code, but we want to undo any preview
    }

    style.removeAllMeta("tag");

    //added for customize
    if (typeof (tagsE.value) !== "undefined") {
      if (scCommon.cleanTags) {
        scCommon.cleanTags(tagsE.value).forEach(function(v) {
          style.addMeta("tag",v);
        });
      } else {
        let tags = tagsE.value.split(/[\s,]+/);
        // tags should be unique and not just whitespace
        uniqueTags = [];

        tags.filter(function(tag)
        {
          return !/^\s*$/.test(tag);
        }).forEach(function(tag)
        {
          if (!uniqueTags.some(function(utag) {
            return utag.toLowerCase() == tag.toLowerCase();
          })) {uniqueTags.push(tag);}
        });
      }
    }

    if (typeof (updateUrlE.value) !== "undefined")
      style.updateUrl = updateUrlE.value;
    if (typeof (tagsE.value) != "undefined" && !scCommon.cleanTags)
      uniqueTags.forEach(function(v) {style.addMeta("tag",v);});

    newStyle = !style.id;

    style.save();

    if (style.id != 0) {
      //update styleId button
      this.styleId = style.id;
      this.updateStyleId();

      //to remove ! from new styles
      if (newStyle == 1)
        document.title = document.title.substring(1);

      //update stylishid attrib for info window
      let win = scCommon.getMainWindow().document.firstElementChild;
      win.setAttribute("stylish-custom-id",style.id);
    }

    return true;
  },

  onExit: function()
  {
    //save search text
    if (scCommon.prefs.getBoolPref("custom.searchtextsave") == true)
      this.saveSearchText(scCommon.prefs);
    //stop external file check
    this.checkFileStop();
    //stylish unload
    dialogClosing();
  },

  unLoad: function()
  {
    //turn off the sc preview for when "turn all styles off" is enabled
    if (this.oldPreview)
      scCommon.applyStyle(this.oldPreview,false);
    //save scratchpad view
    let scratchPad = document.getElementById("ScratchPad");
    if (scratchPad && scratchPad.getAttribute("collapsed") == "true")
      scCommon.prefs.setBoolPref("custom.editorscratchpad",true);
    else
      scCommon.prefs.setBoolPref("custom.editorscratchpad",false);

    //don't ask to save | not changed
    if (scCommon.prefs.getBoolPref("custom.asktosave") == false ||
                                      codeE.value == style.code) {
      return true;
    }
    //default the checkbox to false
    let check = {value: false},
    result = Services.prompt.confirmCheck (
            window,nameE.value,scCommon.getMsg("CloseStyle"),
            scCommon.getMsg("SaveStyle"),check
    );
    if (result == false)//cancel so don't close it
      return false;
    if (check.value == false)//close it
      return true;
    //do some stuff before exit
    this.addNewLine();
    this.onExit();
    //save and close
    if (this.save())//is it saved?
      return true;
    else//don't close it
      return false;
  }
};

//before XUL paint
scEdit.beforePaint();

/*
//before load
window.addEventListener("DOMContentLoaded",function load()
{
  window.removeEventListener("DOMContentLoaded",load,false);
  scEdit.DOMContentLoaded();
},false);

//load
window.addEventListener("load",function load()
{
  window.removeEventListener("load",load,false);
  scEdit.init();
},false);
*/
