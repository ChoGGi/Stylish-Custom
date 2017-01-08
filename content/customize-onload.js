"use strict";
if (typeof Cc === "undefined") var Cc = Components.classes;
if (typeof Ci === "undefined") var Ci = Components.interfaces;
if (typeof Cu === "undefined") var Cu = Components.utils;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://stylish-custom/content/common.jsm");
//cbCommon.dump();

var scCustomize = {

  //SearchAreaOld: window.arguments[1].document.getElementById("SearchAreaOld"),

  SearchAreaOld: function()
  {
    if (typeof window.arguments[1] != "undefined")
      return window.arguments[1].document.getElementById("SearchAreaOld");
    else return null;
  },

  beforePaint: function()
  {
    function checkToolBox()
    {
      var addE = scCustomize.addElements,
      customizeWindow = document.getElementById("CustomizeToolbarWindow");
      if (customizeWindow)
        addE(customizeWindow);
      else //OSX not ff 3.6+
        addE(document.getElementById("CustomizeToolbarSheet"),true);
    }

    if (window.parent.document.getElementById("stylishCustomToolbox"))//OSX
      checkToolBox();
    else if ("arguments" in window && window.arguments[0] &&
        window.arguments[0].id == "stylishCustomToolbox")//win/lin
      checkToolBox();
    else if (window.frameElement && "toolbox" in window.frameElement &&
        window.frameElement.toolbox.id == "stylishCustomToolbox")//also OSX?
      checkToolBox();
  },

  addElements: function(customizeWindow,osx)
  {
    //add init function
    if (osx == true) {
      customizeWindow.removeAttribute("onload");
      customizeWindow.removeAttribute("onunload");
      /* jshint ignore:start */
      customizeWindow.addEventListener("load",function(){
        "onLoad();" + scCustomize.init(true);
      },false);
      customizeWindow.addEventListener("unload",function(){
        "onUnload();" + scCustomize.unLoad();
      },false);
      /* jshint ignore:end */
    } else
      customizeWindow.id = "CustomizeToolbarWindowStylish";
  },

  init: function(which)
  {
    if (which == true)//for osx ff < v3.6
      InitWithToolbox(window.parent.document.getElementById("stylishCustomToolbox"));

    //persistent window position
    if (document.getElementById("CustomizeToolbarWindowStylish") &&
        "arguments" in window) {//not OSX (it uses a popup with no arguments)
      var xy = scCommon.prefs.getCharPref("custom.customizexy").split(",");
      window.moveTo(xy[0],xy[1]);
    }

    //no large icons so hide the checkbox
    document.getElementById("smallicons").style.display = "none";

    function eventlisteners(customizeWindow)
    {
      //addEventListener for dragndrop
      customizeWindow.addEventListener("drag",scCustomize.loadToolTips,true);
      //load tooltips
      scCustomize.loadToolTips();
      //and since we have the id then we'll change the title too
      customizeWindow.setAttribute("title",scCommon.getMsg("CustomizeToolbar"));
    }
    var customizeWindow = document.getElementById("CustomizeToolbarWindowStylish");
    if (customizeWindow)
      eventlisteners(customizeWindow);
    else
      eventlisteners(document.getElementById("CustomizeToolbarSheet"));

    //which search to use (findbar has a tendency to **** up so just show oldsearchbar)
    var searchCustomize = document.getElementById("SearchAreaOld");
    if (searchCustomize && searchCustomize.style)
      searchCustomize.style.display = "-moz-box";
    if (scCustomize.SearchAreaOld.style)
      scCustomize.SearchAreaOld.style.display = "-moz-box";
  },

  unLoad: function()
  {
    function setScreenPos(idTmp)
    {
      var oldPos = scCommon.prefs.getCharPref("custom.customizexy").split(","),
      x = idTmp.boxObject.screenX-8,
      y = idTmp.boxObject.screenY-30;

      if (oldPos[0] != x && oldPos[1] != y)
        scCommon.prefs.setCharPref("custom.customizexy",x + "," + y);
    }

    function eventlisteners(el) {
      el.removeEventListener("drag",scCustomize.loadToolTips,true);
    }
    var customizeWindow = document.getElementById("CustomizeToolbarWindowStylish");
    if (customizeWindow) {
      //remove eventlisteners
      eventlisteners(customizeWindow);
      //and save window position
      setScreenPos(customizeWindow);
    } else //just remove eventlisteners for OSX
      eventlisteners(document.getElementById("CustomizeToolbarSheet"));
  },

  loadToolTips: function()
  {
    function set(msg,el,type)
    {
      el = document.getElementById(el);
      if (!el)
        return;
      //add class for css rules
      el.setAttribute("class","stylishCustomPalette");
      //spacers don't need a tooltip or label
      if (msg == false)
        return;
      msg = Services.strings.createBundle("chrome://stylish-custom/locale/tooltips.properties").GetStringFromName(msg);
      //try to change labels first
      if (typeof type != "undefined") {
        el.label = msg;
        return;
      }
      el.tooltipText = msg;
    }
    function show(id,label)
    {
      var element = document.getElementById(id);
      if (element) {
        element.style.display = "-moz-box";
        if (label) {
          element.setAttribute("label",label);
          element.parentElement.setAttribute("title",label);
        }
      }
    }
    //a couple labels
    set("Bottom_SaveLabel","Bottom_Save",0);
    set("Bottom_SaveMenuLabel","Bottom_SaveButton",0);
    set("Bottom_SaveButtonLabel","Bottom_SaveButton",0);
    //so we can have hover effect without disturbing other customize windows
    set(false,"wrapper-separator");
    set(false,"wrapper-spring");
    set(false,"wrapper-spacer");
    set(false,"instructions");
    //and the tooltips
    set("InsertMenu","wrapper-InsertMenu");
    set("itsalltext","wrapper-itsalltext");
    set("ExternalEdit","wrapper-ExternalEdit");
    set("SearchToggleItem","wrapper-SearchToggleItem");
    set("wrap-linesItem","wrapper-wrap-linesItem");
    set("userstyles-page","wrapper-userstyles-page");
    set("AutoImportantItem","wrapper-AutoImportantItem");
    set("ImportantButton","wrapper-ImportantButton");
    set("MergeLines","wrapper-MergeLines");
    set("CommentText","wrapper-CommentText");
    set("NameArea","wrapper-NameArea");
    set("SearchArea","wrapper-SearchArea");
    set("TagsArea","wrapper-TagsArea");
    set("UpdateUrlArea","wrapper-UpdateUrlArea");
    set("Bottom_SwitchToInstall","wrapper-Bottom_SwitchToInstall");
    set("Bottom_InsertText","wrapper-Bottom_InsertText");
    set("Bottom_SaveEnabled","wrapper-Bottom_SaveEnabled");
    set("Bottom_SaveDisabled","wrapper-Bottom_SaveDisabled");
    set("Bottom_Save","wrapper-Bottom_Save");
    set("Bottom_SaveClose","wrapper-Bottom_SaveClose");
    set("Bottom_UndoLastSave","wrapper-Bottom_UndoLastSave");
    set("Bottom_UndoAllSaves","wrapper-Bottom_UndoAllSaves");
    set("Bottom_SaveMenu","wrapper-Bottom_SaveMenu");
    set("Bottom_SaveButton","wrapper-Bottom_SaveButton");
    set("Bottom_CloseStyle","wrapper-Bottom_CloseStyle");
    set("PreviewStyles","wrapper-PreviewStyles");
    set("ToggleEnabledItem","wrapper-ToggleEnabledItem");
    set("UpdateCheckItem","wrapper-UpdateCheckItem");
    set("CommentGroup","wrapper-CommentGroup");
    set("ClearSearch","wrapper-ClearSearch");
    set("ScratchPadItem","wrapper-ScratchPadItem");
    set("ClearScratchPad","wrapper-ClearScratchPad");
    set("CustomizeToolbars","wrapper-CustomizeToolbars");
    set("LineNumberItem","wrapper-LineNumberItem");
    set("LineNumberSearchItem","wrapper-LineNumberSearchItem");
    set("ToggleScratchPad","wrapper-ToggleScratchPad");
    set("ExportStyle","wrapper-ExportStyle");
    set("CloneStyle","wrapper-CloneStyle");
    set("Bracket","wrapper-Bracket");
    set("CurlyBracket","wrapper-CurlyBracket");
    set("ID","wrapper-ID");
    set("Class","wrapper-Class");
    set("Undo","wrapper-Undo");
    set("Redo","wrapper-Redo");
    set("ToggleBars","wrapper-ToggleBars");
    set("StyleId","wrapper-StyleIdItem");
    set("RemoveXUL","wrapper-RemoveXUL");
    set("RainbowPicker","wrapper-RainbowPicker");

    //show the buttons for customize
    show("RainbowPicker");
    show("Bottom_SwitchToInstall");
    show("itsalltext",scCommon.getMsg("ExternalEditIAT"));
    show("ExternalEdit",scCommon.getMsg("ExternalEditSC"));

    //thank you findbar for being a hunk of ****
    if (scCustomize.SearchAreaOld.style)
      scCustomize.SearchAreaOld.style.display = "-moz-box";
  }
};
scCustomize.beforePaint();
