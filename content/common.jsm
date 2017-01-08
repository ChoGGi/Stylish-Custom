"use strict";
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");
const EXPORTED_SYMBOLS = ["scCommon"];
//cbCommon.dump();

var scCommon = {

  prefs: Services.prefs.getBranch("extensions.stylish."),
  prefService: Services.prefs,
  prompt: Services.prompt,
  getWin: Services.wm.getMostRecentWindow,
  appInfo: Services.appinfo,
  service: null,

  tryService: function()
  {
    var service = null;
    try {
      service = Cc["@userstyles.org/style;1"].getService(Ci.stylishStyle);
    } catch (e) {
      this.catchError(e);
      this.dump("Stylish not detected, please install/enable");
    }

    if (service) {
      this.service = service;
      return service;
    }
  },

  dump: function(aString)
  {
    try {
      Services.console.logStringMessage("Stylish-Custom:\n " + aString);
    } catch(e) {
      this.catchError(e);
    }
  },

  catchError: function(e)
  {
    //http://blogger.ziesemer.com/2007/10/javascript-debugging-in-firefox.html
    try {
      if (e.stack)
        Cu.reportError(e.stack);
    } finally {
      //throw e;
      return null;
    }
  },

  applyStyle: function(uri,enable,link)
  {
    //convert a link to a uri
    if (link == true)
      uri = Services.io.newURI(uri,null,null);
    var sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);

    //AGENT_SHEET AUTHOR_SHEET USER_SHEET
    if (enable == true) {
      if (!sss.sheetRegistered(uri,sss.AGENT_SHEET))
        sss.loadAndRegisterSheet(uri,sss.AGENT_SHEET);
    } else {
      if (sss.sheetRegistered(uri,sss.AGENT_SHEET))
        sss.unregisterSheet(uri,sss.AGENT_SHEET);
    }
  },

  regexEscape: function(str)
  {
    //make sure it is a string
    if (typeof str != "string")
      str = str.toString();
    //https://stackoverflow.com/questions/3561493
    //also replaces chars windows filenames dont like  <>:"
    return str.replace(/[-\/\\^$*+?.()|[\]{}<>:"]/g,"\\$&");
  },

  getStyleId: function(doc)
  {
    //return doc.getElementById("stylish").getAttribute("windowtype").replace(/stylishEdit/,"");
    return doc.getElementById("stylish").getAttribute("styleId");
  },

  getMsg: function(aString)
  {
    return Services.strings.createBundle("chrome://stylish-custom/locale/common.properties").GetStringFromName(aString);
  },

  getStyle: function(element,win)
  {
    return win.getComputedStyle(element,null);
  },

  removeChild: function(element)
  {
    if (!element || element.childNodes.length < 1)
      return;
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  },
/*
  not in use?
  createInstance: function(aURL,aInterface)
  {
    try {
      return Cc[aURL].createInstance(Ci[aInterface]);
    } catch(e) {
      this.catchError(e);
      this.prompt.alert(null, "Error", "Error creating instance: " + aURL + ", " + aInterface + "\n" + e);
      return null;
    }
  },
*/
  getMainWindow: function()
  {
    var wm = this.getWin,
    mainWin = wm("navigator:browser");
    if (!mainWin)
      mainWin = wm("mail:3pane");//thunderbird
    return mainWin;
  },

  openChoGGiki: function()
  {
    this.getMainWindow().gBrowser.addTab("https://choggi.org/wiki/stylish-custom");
  },

  //replace edit for stylish menuitem rightclick menu
  toggleStyleMenuOverride: function(which,document)
  {
    if (!document)
      document = this.getMainWindow().document;

    //"Edit" menuitem
    var editContext = document.getElementById("stylish-style-context-edit"),
    //write new style popup
    newStylePop = document.getElementById("stylish-write-style-menu").firstChild;

    if (which == true){
      editContext.removeAttribute("oncommand");
      editContext.addEventListener("command",scCommon.editContextOverrideFunc,false);
      newStylePop.removeAttribute("onpopupshowing");
      newStylePop.addEventListener("popupshowing",scCommon.newStylePopFunc,false);
    } else {
      editContext.removeEventListener("command",scCommon.editContextOverrideFunc);
      editContext.setAttribute("oncommand","stylishOverlay.contextEdit()");
      newStylePop.removeEventListener("popupshowing",scCommon.newStylePopFunc);
      newStylePop.setAttribute("onpopupshowing","stylishOverlay.writeStylePopupShowing(event)");
    }

  },

  newStylePopFunc: function(e)
  {
    e.originalTarget.ownerDocument.defaultView.scOverlay.writeStylePopupShowing(e);
  },

  editContextOverrideFunc: function(event)
  {
    var document = scCommon.getMainWindow().document;
    scCommon.openEditForStyle(document.popupNode.stylishStyle);
  },

  updateAllStyles: function(what)
  {
    var service = scCommon.service;
    service.list(service.CALCULATE_META | service.REGISTER_STYLE_ON_CHANGE,{}).forEach(
      function(style) {
        style.checkForUpdates(null);
        style.applyUpdate(null);
      }
    );
    if (what == "Info")
      this.prompt.alert(null,this.getMsg("StylesUpdated"),this.getMsg("StylesUpdated"));
  },

  tooltipTimer: null,
  tooltipEl: null,
  tooltip: function(msg,that,doc)
  {

    //cancel the timer before we do it again so it stays for the whole second
    if (this.tooltipEl) {
      try {
        this.tooltipEl.hidePopup();
      } catch (e) {
        //throws if popup not showing?
      }
      this.tooltipEl = null;
    }
    if (this.tooltipTimer) {
      this.tooltipTimer.cancel();
      this.tooltipTimer = null;
    }
    //make the tooltip
    this.tooltipEl = doc.getElementById("scTooltip");
    if (!this.tooltipEl)
      return;
    this.tooltipEl.removeAttribute("hidden");
    this.tooltipEl.label = this.getMsg(msg);
    //be nice to makondo and stick it in the middle
    this.tooltipEl.openPopup(doc.getElementById(that),"overlap",doc.defaultView.innerWidth / 2,doc.defaultView.innerHeight / 4);
    //make the timer
    var observer = {
      observe: function()
      {
        scCommon.tooltipEl.label = "";
        scCommon.tooltipEl.setAttribute("hidden",true);
        scCommon.tooltipTimer.cancel();
      }
    };
    this.tooltipTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    //call the timer
    this.tooltipTimer.init(observer,1000,Ci.nsITimer.TYPE_ONE_SHOT);
  },

  openStyleManager: function(win)
  {
    var manageView = this.prefs.getIntPref("custom.manageview");
    if (!win)
      win = this.getMainWindow();

    switch(manageView) {
    default: // info
      var em = this.getWin("stylishCustomInfo");
      if (em)
        em.focus();
      else
        win.openDialog("chrome://stylish-custom/content/info.xul");
        //win.openDialog("chrome://stylish-custom/content/info.xul","","chrome,menubar,extra-chrome,toolbar,dialog=no,resizable");
    break;
    case 3: // sidebar
      this.sidebarToggle(win);
    break;
    case 2: // add-ons window
      this.addonsManagerWindow(win);
    break;
    case 0: // add-ons
      //from Stylish v2.0.4
      if (typeof win.BrowserOpenAddonsMgr !== "undefined")
        win.BrowserOpenAddonsMgr("addons://list/userstyle");
      else if (typeof win.toEM !== "undefined")
        win.toEM("addons://list/userstyle");
      else if (typeof win.openAddonsMgr !== "undefined")
        win.openAddonsMgr("addons://list/userstyle");
      else
        this.addonsManagerWindow(win);
    break;
    }
  },

  sidebarToggle: function(win)
  {
    if (!win)
      win = this.getMainWindow();

    function toggleSB(w)
    {
      if (typeof win.SidebarUI === "undefined"){
        if (w)
          win.toggleSidebar("viewStylishSidebar",true);
        else
          win.toggleSidebar("viewStylishSidebar",false);
      } else {
        if (w)
          win.SidebarUI.toggle("viewStylishSidebar",true);
        else
          win.SidebarUI.toggle("viewStylishSidebar",false);
      }
    }

    //if it's hidden then show it, if something else is in sidebar then switch to sc, else hide it
    var b = win.document.getElementById("sidebar-box");
    if (!b) {
      scCommon.dump("Sidebar is missing on this platform");
      return;
    }
    if (b.getAttribute("src").indexOf("stylish-custom") !== -1 && b.hidden == true)
      toggleSB(true);
    else if (b.getAttribute("src").indexOf("stylish-custom") !== -1 && b.hidden == false)
      toggleSB(null);
    else
      toggleSB(true);
  },

  addonsManagerWindow: function(win)
  {
    if (!win)
      win = this.getMainWindow();

    var addonWin = this.focusAddons();
    if (!addonWin)
      win.openDialog("chrome://mozapps/content/extensions/extensions.xul?NoSidebar","","chrome,menubar,extra-chrome,toolbar,dialog=no,resizable,centerscreen,width=1000,height=500");

    win.setTimeout(function(){
      scCommon.focusAddons(addonWin);
    },500);
  },

  focusAddons: function(em)
  {
    if (!em)
      em = this.getWin("Extension:Manager");
    if (!em)
      em = this.getWin("Addons:Manager");
    if (em) {
      var us = em.document.getElementById("userstyles-view");
      if (!us)
        us = em.document.getElementById("category-userstyle");
      if (us)
        us.click();
      em.focus();
      return em;
    } else
      return null;
  },

  //check if dialog is opened already or open it
  openDialog: function(which,window)
  {
    var whichWin;

    switch(which) {
    case "Options":
      whichWin = this.getWin("stylishCustomOptions");
    break;
    case "Export":
      whichWin = this.getWin("stylishCustomExport");
    break;
    case "Import":
      whichWin = this.getWin("stylishCustomImport");
    break;
    case "Info":
      whichWin = this.getWin("stylishCustomInfo");
    break;
    case "RemoveDupes":
      whichWin = this.getWin("stylishCustomRemoveDupes");
    break;
    }

    if (whichWin) {
      whichWin.focus();
      return;
    }

    if (!window)
      window = this.getMainWindow();
    switch(which) {
    case "Options":
      window.openDialog("chrome://stylish-custom/content/options.xul");
    break;
    case "Export":
      window.openDialog("chrome://stylish-custom/content/export.xul");
    break;
    case "Import":
      window.openDialog("chrome://stylish-custom/content/import.xul");
    break;
    case "Info":
      window.openDialog("chrome://stylish-custom/content/info.xul");
    break;
    case "RemoveDupes":
      window.openDialog("chrome://stylish-custom/content/removedupes.xul");
    break;
    }
  },

  //used for import/export
  pathBrowse: function(which,doc,dialog)
  {
    var locationE = doc.getElementById("Location"),
    winEl;

    if (which == "Export")
      winEl = this.getWin("stylishCustomExport");
    else if (which == "Import")
      winEl = this.getWin("stylishCustomImport");

    //import/export?
    const nsIFilePicker = Ci.nsIFilePicker;
    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

    if (which == "Export")
      fp.init(winEl,this.getMsg("ExportTitle"),nsIFilePicker.modeGetFolder);
    else if (which == "Import")
      fp.init(winEl,this.getMsg("ImportTitle"),nsIFilePicker.modeGetFolder);

    if (fp.show() == nsIFilePicker.returnCancel)
      return;
    locationE.value = fp.file.path;
    if (which == "Export")
      this.prefs.setCharPref("custom.exportpath",fp.file.path);
    else if (which == "Import")
      this.prefs.setCharPref("custom.importpath",fp.file.path);

    this.removeChild(doc.getElementById("StyleList"));
    dialog.init();
    dialog.createStyleList('Refresh');
  },

  selectAllStyles: function(doc)
  {
    var styleListE = doc.getElementById("StyleList");
    if (!styleListE.hasChildNodes())
      return;
    var children = styleListE.childNodes,
    treecell;

    for (var i = 0; i < children.length; i++) {
      treecell = children[i].firstChild.firstChild.nextSibling;
      if (!treecell.hasAttribute("value"))
        treecell.setAttribute("value",true);
      else {
        if (treecell.getAttribute("value") == "true")
          treecell.setAttribute("value",false);
        else
          treecell.setAttribute("value",true);
      }
    }
  },

  createStyleArray: function(treeList,sortBy)
  {
    if (!this.service){
      var win = this.getMainWindow();
      if (typeof win.SidebarUI === "undefined"){
        win.toggleSidebar("viewStylishSidebar");
        win.toggleSidebar("viewStylishSidebar");
      } else {
        win.SidebarUI.toggle("viewStylishSidebar");
        win.SidebarUI.toggle("viewStylishSidebar");
      }
    } else
      scCommon.createStyleArrayForReal(treeList,sortBy);
  },

  //if sidebar is opened after a restart, then sometimes it tries to get stylish.services too soon
  createStyleArrayForReal: function(treeList,sortBy)
  {
    this.service.list(this.service.REGISTER_STYLE_ON_CHANGE,{}).forEach(
      function(style)
      {
        var styleType = style.getMeta("type",{}).toString(),
        styleTags = style.getMeta("tag",{}).toString(),
        styleDomain = style.getMeta("domain",{}).toString(),
        styleUrl = style.getMeta("url",{}).toString(),
        styleUrlPrefix = style.getMeta("url-prefix",{}).toString(),
        styleEnabled = style.enabled.toString();
        treeList.push({name:style.name, code:style.code, original:style, enabled:styleEnabled, id:style.id, type:styleType, tags:styleTags, domain:styleDomain, url:styleUrl, urlprefix:styleUrlPrefix});
      }
    );
    if (typeof sortBy == "undefined") {
      treeList.sort(this.sortByName);
      return;
    }
    sortBy = sortBy.id.toString();

    switch(sortBy) {
    case "NameColumn":
      treeList.sort(this.sortByName);
    break;
    case "EnabledColumn":
      treeList.sort(this.sortByName);
      treeList.sort(this.sortByEnabled);
    break;
    case "UrlColumn":
      treeList.sort(this.sortByName);
      treeList.sort(this.sortByUrl);
      treeList.sort(this.sortByUrlPrefix);
      treeList.sort(this.sortByDomain);
    break;
    case "TagsColumn":
      treeList.sort(this.sortByName);
      treeList.sort(this.sortByTags);
    break;
    case "TypeColumn":
      treeList.sort(this.sortByName);
      treeList.sort(this.sortByType);
    break;
    case "IDColumn":
      treeList.sort(this.sortById);
    break;
    }

  },

  sortByNumbers: function(a,b)
  {
    return a - b;
  },

  //http://www.breakingpar.com/bkp/home.nsf/0/87256B280015193F87256C8D00514FA4
  sortByName: function(a,b)
  {
    var x = a.name.toLowerCase(),
    y = b.name.toLowerCase();
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  },

  sortByEnabled: function(a,b)
  {
    var x = a.enabled.toLowerCase(),
    y = b.enabled.toLowerCase();
    return ((x > y) ? -1 : ((x < y) ? 1 : 0));
  },

  sortById: function(a,b)
  {
    return a.id - b.id;
  },

  sortByType: function(a,b)
  {
    var x = a.type.toLowerCase(),
    y = b.type.toLowerCase();
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  },

  sortByTags: function(a,b)
  {
    var x = a.tags.toLowerCase(),
    y = b.tags.toLowerCase();
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  },

  sortByDomain: function(a,b)
  {
    var x = a.domain.toLowerCase(),
    y = b.domain.toLowerCase();
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  },

  sortByUrl: function(a,b)
  {
    var x = a.url.toLowerCase(),
    y = b.url.toLowerCase();
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  },

  sortByUrlPrefix: function(a,b)
  {
    var x = a.urlprefix.toLowerCase(),
    y = b.urlprefix.toLowerCase();
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  },

  sortByleafName: function(a,b)
  {
    var x = a.leafName.toLowerCase(),
    y = b.leafName.toLowerCase();
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  },

  readFile: function(file,type,type2)
  {
    var XMLHttpRequest = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1","nsIXMLHttpRequest");
    if (type2 !== "web")
      file = "file:///" + file;
    var req = new XMLHttpRequest();
    req.open("GET",file,false);
    if (type2 !== "web")
      file = file.toLowerCase();

    if (type2 == "web" || file.indexOf("css") >= 0)
      req.overrideMimeType("text/css");
    else if (file.indexOf("xml") >= 0)
      req.overrideMimeType("text/xml");

    try {
      req.send(null);
    } catch (e) {
      if (type == "goodbye")
        return null;
      this.catchError(e);
      return null;
    }

    if (type != "Text")
      return req.responseXML;
    else
      return req.responseText;
  },

  newStyle: function(code)
  {
    if (code)
      this.openEdit(scCommon.getWindowName("stylishEdit"), {code: ''});
    else
      this.openEdit(scCommon.getWindowName("stylishEdit"), {code: ''});
  },

  //the below is (mostly) from Stylish v1.4.3/2.0.6
  styleInit: function(styleUrl,idUrl,updateUrl,md5Url,name,code,enabled,origCode,origMd5,backgroundUpdates)
  {
    var style = Cc["@userstyles.org/style;1"].createInstance(Ci.stylishStyle);
    style.mode = style.CALCULATE_META | style.REGISTER_STYLE_ON_CHANGE;

    style.init(styleUrl,idUrl,updateUrl,md5Url,name,code,enabled,origCode,origMd5,backgroundUpdates);
    return style;
  },

	addSite: function(stylishOverlay) {
		stylishOverlay.getFromContent("stylish:page-info", function(message) {
			var code = "@namespace url(" + message.data.namespace + ");\n@-moz-document url-prefix(\"" + message.data.url + "\") {\n\n}";
			scCommon.addCode(code,message.data.url);
		});
	},

	addDomain: function(domain) {
		var code = "@namespace url(http://www.w3.org/1999/xhtml);\n@-moz-document domain(\"" + domain + "\") {\n\n}";
		scCommon.addCode(code,domain);
	},

	addCode: function(code,name,win) {
    if (!win)
      win = scCommon.getWindowName("stylishEdit");
    if (!name)
      name = "";

    var style = scCommon.styleInit(null,null,null,null,name,code,null,null,null);
    scCommon.openEdit(win,{style: style});
	},

  openEdit: function(name,params)
  {
    if (this.focusWindow(name))
      return;
    params.windowType = name;
    //return this.getMainWindow().openDialog("chrome://stylish-custom/content/edit.xul", name, "chrome,resizable,dialog=no,centerscreen", params);

    return this.getMainWindow().openDialog("chrome://stylish-custom/content/edit.xul", name, "chrome,resizable,dialog=no", params);
  },

	openEditForId: function(id) {
		return this.openEdit(this.getWindowName("stylishEdit", id), {id: id},this.getMainWindow());
	},

	openEditForStyle: function(style, win) {
		return this.openEditForId(style.id, win);
	},

  getWindowName: function(prefix, id)
  {
    return (prefix + (id || Math.random())).replace(/\W/g, "");
  },

  focusWindow: function(name)
  {
    //if a window is already open, openDialog will clobber the changes made. check for an open window for this style and focus to it
    if (this.getWin(name)) {
      this.getWin(name).focus();
      return true;
    }
    return false;
  },

  getdataUrl: function(code,name)
  {
    if (!code)
      return null;
    //var nameComment = name ? "/*" + name.replace("*/", "") + "*/" : "";
    var nameComment = name ? "/*" + name.replace(/\*\//g,"").replace(/#/g,"") + "*/" : "";
    // this will strip new lines rather than escape - not what we want
    //return this.ios.newURI("data:text/css," + nameComment + this.code.replace(/\n/g, "%0A"), null, null);
    return Services.io.newURI("data:text/css," + nameComment + encodeURIComponent(code),null,null);
  },

  // Removes whitespace and duplicate tags. Pass in a string and receive an array.
  cleanTags: function(tags)
  {
    tags = tags.split(/[\s,]+/);
    var uniqueTags = [];
    tags.filter(function(tag) {
      return !/^\s*$/.test(tag);
    }).forEach(function(tag) {
      if (!uniqueTags.some(function(utag) {
        return utag.toLowerCase() == tag.toLowerCase();
      })) {
        uniqueTags.push(tag);
      }
    });
    return uniqueTags;
  }

};
