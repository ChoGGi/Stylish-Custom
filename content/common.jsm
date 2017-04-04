"use strict";
/* jshint ignore:start */
const {classes: Cc,Constructor: CCon, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");
const EXPORTED_SYMBOLS = ["scCommon"];
/* jshint ignore:end */
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
    let service = null;
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
    let sss = Cc["@mozilla.org/content/style-sheet-service;1"]
            .getService(Ci.nsIStyleSheetService);

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

  getMsg: function(aString)
  {
    return Services.strings
              .createBundle("chrome://stylish-custom/locale/common.properties")
              .GetStringFromName(aString);
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

  getMainWindow: function()
  {
    let wm = this.getWin,
    mainWin = wm("navigator:browser");
    if (!mainWin)
      mainWin = wm("mail:3pane");//thunderbird
    return mainWin;
  },

  openChoGGiki: function()
  {
    this.getMainWindow().gBrowser
                        .addTab("https://choggi.org/wiki/stylish-custom");
  },

  //replace edit for stylish menuitem rightclick menu
  toggleStyleMenuOverride: function(which,document)
  {
    if (!document)
      document = this.getMainWindow().document;

    //"Edit" menuitem
    let editContext = document.getElementById("stylish-style-context-edit"),
    //write new style popup
    newStylePop = document.getElementById("stylish-write-style-menu").firstChild;

    if (which == true){
      editContext.removeAttribute("oncommand");
      editContext.addEventListener("command",scCommon.editContextOverrideFunc,false);
      newStylePop.removeAttribute("onpopupshowing");
      newStylePop.addEventListener("popupshowing",scCommon.newStylePopFunc,false);
    } else {
      editContext.removeEventListener("command",scCommon.editContextOverrideFunc);
      //Note to reviewer: Fails if I use addEventListener (or I'm just doing it wrong)
      editContext.setAttribute("oncommand","stylishOverlay.contextEdit()");
      newStylePop.removeEventListener("popupshowing",scCommon.newStylePopFunc);
      //Note to reviewer: Fails if I use addEventListener (or I'm just doing it wrong)
      newStylePop.setAttribute("onpopupshowing",
                              "stylishOverlay.writeStylePopupShowing(event)");
    }

  },

  newStylePopFunc: function(e)
  {
    e.originalTarget.ownerDocument.defaultView.scOverlay.writeStylePopupShowing(e);
  },

  editContextOverrideFunc: function(event)
  {
    let document = scCommon.getMainWindow().document;
    scCommon.openEditForStyle(document.popupNode.stylishStyle);
  },

  updateAllStyles: function(what)
  {
    let service = scCommon.service;
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
    this.tooltipEl.openPopup(doc.getElementById(that),"overlap",
                            doc.defaultView.innerWidth / 2,
                            doc.defaultView.innerHeight / 4
    );
    //make the timer
    let observer = {
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
    let manageView = this.prefs.getIntPref("custom.manageview");
    if (!win)
      win = this.getMainWindow();

    switch(manageView) {
    default: // info
      let em = this.getWin("stylishCustomInfo");
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
    let b = win.document.getElementById("sidebar-box");
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

    let addonWin = this.focusAddons();
    if (!addonWin)
      win.openDialog(
      "chrome://mozapps/content/extensions/extensions.xul?NoSidebar","",
      "chrome,menubar,extra-chrome,toolbar,dialog=no,resizable,centerscreen,width=1000,height=500"
    );

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
      let us = em.document.getElementById("userstyles-view");
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
    let whichWin;

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
    let locationE = doc.getElementById("Location"),
    winEl;

    if (which == "Export")
      winEl = this.getWin("stylishCustomExport");
    else if (which == "Import")
      winEl = this.getWin("stylishCustomImport");

    //import/export?
    const nsIFilePicker = Ci.nsIFilePicker;
    let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

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
    let styleListE = doc.getElementById("StyleList");
    if (!styleListE.hasChildNodes())
      return;
    let children = styleListE.childNodes,
    treecell;

    for (let i = 0; i < children.length; i++) {
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
      let win = this.getMainWindow();
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
        let styleType = style.getMeta("type",{}).toString(),
        styleTags = style.getMeta("tag",{}).toString(),
        styleDomain = style.getMeta("domain",{}).toString(),
        styleUrl = style.getMeta("url",{}).toString(),
        styleUrlPrefix = style.getMeta("url-prefix",{}).toString(),
        styleEnabled = style.enabled.toString();
        treeList.push({name:style.name, code:style.code, original:style,
            enabled:styleEnabled, id:style.id, type:styleType, tags:styleTags,
            domain:styleDomain, url:styleUrl, urlprefix:styleUrlPrefix});
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
    let x = a.name.toLowerCase(),
    y = b.name.toLowerCase();
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  },

  sortByEnabled: function(a,b)
  {
    let x = a.enabled.toLowerCase(),
    y = b.enabled.toLowerCase();
    return ((x > y) ? -1 : ((x < y) ? 1 : 0));
  },

  sortById: function(a,b)
  {
    return a.id - b.id;
  },

  sortByType: function(a,b)
  {
    let x = a.type.toLowerCase(),
    y = b.type.toLowerCase();
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  },

  sortByTags: function(a,b)
  {
    let x = a.tags.toLowerCase(),
    y = b.tags.toLowerCase();
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  },

  sortByDomain: function(a,b)
  {
    let x = a.domain.toLowerCase(),
    y = b.domain.toLowerCase();
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  },

  sortByUrl: function(a,b)
  {
    let x = a.url.toLowerCase(),
    y = b.url.toLowerCase();
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  },

  sortByUrlPrefix: function(a,b)
  {
    let x = a.urlprefix.toLowerCase(),
    y = b.urlprefix.toLowerCase();
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  },

  sortByleafName: function(a,b)
  {
    let x = a.leafName.toLowerCase(),
    y = b.leafName.toLowerCase();
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  },

  readFile: function(file,type,type2)
  {
    let XMLHttpRequest = CCon("@mozilla.org/xmlextras/xmlhttprequest;1",
                              "nsIXMLHttpRequest");
    if (type2 !== "web")
      file = "file:///" + file;
    let req = new XMLHttpRequest();
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
      this.openEdit(scCommon.getWindowName("stylishEdit"), {code: code});
    else
      this.openEdit(scCommon.getWindowName("stylishEdit"), {code: ''});
  },

  //the below is (mostly) from Stylish v1.4.3/2.0.6
  styleInit: function(styleUrl,idUrl,updateUrl,md5Url,
                      name,code,enabled,origCode,origMd5,backgroundUpdates)
  {
    let style = Cc["@userstyles.org/style;1"].createInstance(Ci.stylishStyle);
    style.mode = style.CALCULATE_META | style.REGISTER_STYLE_ON_CHANGE;

    style.init(styleUrl,idUrl,updateUrl,md5Url,name,
              code,enabled,origCode,origMd5,backgroundUpdates);
    return style;
  },

	addSite: function(stylishOverlay) {
		stylishOverlay.getFromContent("stylish:page-info", function(message) {
			let code = "@namespace url(" + message.data.namespace +
          ");\n@-moz-document url-prefix(\"" + message.data.url + "\") {\n\n}";
			scCommon.addCode(code,message.data.url);
		});
	},

	addDomain: function(domain) {
		let code = "@namespace url(http://www.w3.org/1999/xhtml);\n@-moz-document domain(\"" +
                domain + "\") {\n\n}";
		scCommon.addCode(code,domain);
	},

	addCode: function(code,name,win) {
    if (!win)
      win = scCommon.getWindowName("stylishEdit");
    if (!name)
      name = "";

    let style = scCommon.styleInit(null,null,null,null,name,code,null,null,null);
    scCommon.openEdit(win,{style: style});
	},

  openEdit: function(name,params)
  {
    if (this.focusWindow(name))
      return;
    params.windowType = name;
    //return this.getMainWindow().openDialog("chrome://stylish-custom/content/edit.xul", name, "chrome,resizable,dialog=no,centerscreen", params);

    return this.getMainWindow().openDialog(
                              "chrome://stylish-custom/content/edit.xul",name,
                              "chrome,resizable,dialog=no",params
    );
  },

	openEditForId: function(id) {
		return this.openEdit(
          this.getWindowName("stylishEdit", id), {id: id},this.getMainWindow()
    );
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
    //let nameComment = name ? "/*" + name.replace("*/", "") + "*/" : "";
    let nameComment = name ? "/*" + name.replace(/\*\//g,"").replace(/#/g,"") + "*/" : "";
    // this will strip new lines rather than escape - not what we want
    //return this.ios.newURI("data:text/css," + nameComment + this.code.replace(/\n/g, "%0A"), null, null);
    return Services.io.newURI("data:text/css," + nameComment +
                                          encodeURIComponent(code),null,null);
  },

  // Removes whitespace and duplicate tags. Pass in a string and receive an array.
  cleanTags: function(tags)
  {
    tags = tags.split(/[\s,]+/);
    let uniqueTags = [];
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
  },

  //type=0=info 1=import 2=export 3=remdupes
  //creates tree lists for the above dialogs
  populateTree: function(style,tree,type,list,d,i)
  {
    let item = d.createElement("treeitem"),
    row = d.createElement("treerow"),
    nameCell = d.createElement("treecell"),
    enabledCell = d.createElement("treecell"),
    enableCell = d.createElement("treecell"),
    exportCell = d.createElement("treecell"),
    importCell = d.createElement("treecell"),
    removeCell = d.createElement("treecell"),
    typeCell = d.createElement("treecell"),
    tagsCell = d.createElement("treecell"),
    iDCell = d.createElement("treecell"),
    urlCell = d.createElement("treecell");

    nameCell.setAttribute("class","nameCell");

    if (style){
      if (style.enabled == 1) {
        enabledCell.setAttribute("value",true);
        tree.styleAmountEnabled++;
        if (type === 0)
          item.setAttribute("enabled",true);
      } else {
        tree.styleAmountDisabled++;
      }
    }

    if (type === 0 || type === 2)
      enabledCell.setAttribute("class","enabledCell");

    if (type === 0 || type === 3) {
      item.id = style.id;
      nameCell.setAttribute("label",style.name);
      iDCell.setAttribute("label",style.id);
      iDCell.setAttribute("class","iDCell");
      iDCell.setAttribute("editable","false");
    }

    if (type === 0) {
      typeCell.setAttribute("label",style.getMeta("type",{}).join(" "));
      typeCell.setAttribute("editable","false");
      typeCell.setAttribute("class","typeCell");
      tagsCell.setAttribute("label",style.getMeta("tag",{}).join(" "));
      tagsCell.setAttribute("class","tagsCell");
      //make the urls look nice
      urlCell.setAttribute("editable","false");
      urlCell.setAttribute("class","urlCell");

      scCommon.setUrlCell(style,urlCell);

      row.appendChild(enabledCell);
      row.appendChild(nameCell);
      row.appendChild(urlCell);
      row.appendChild(tagsCell);
      row.appendChild(typeCell);
      row.appendChild(iDCell);
    } else if (type === 1) {
      let styleName = list[i].leafName.replace(/\.css$/i,"").replace(/\.xml$/i,"");
      nameCell.setAttribute("label",styleName);

      enableCell.setAttribute("value",true);
      enableCell.setAttribute("class","enableCell");
      if (list[i].leafName.search(/\.xml$/i) >= 0)
        typeCell.setAttribute("label","xml");
      else if (list[i].leafName.search(/\.css$/i) >= 0)
        typeCell.setAttribute("label","css");
      typeCell.setAttribute("class","typeCell");
      importCell.setAttribute("class","importCell");
      item.setAttribute("styleName",styleName);
      item.setAttribute("styleNameType",list[i].leafName);

      row.appendChild(nameCell);
      row.appendChild(importCell);
      row.appendChild(enableCell);
      row.appendChild(typeCell);
    } else if (type === 2) {
      nameCell.setAttribute("label",list[i].name);
      nameCell.setAttribute("styleid",list[i].id);
      exportCell.setAttribute("class","exportCell");
      item.setAttribute("styleId",list[i].id);
      item.setAttribute("styleName",list[i].name);
      nameCell.setAttribute("stylename",list[i].leafName);

      row.appendChild(nameCell);
      row.appendChild(exportCell);
      row.appendChild(enabledCell);
    } else if (type === 3) {
      item.value = false;

      nameCell.setAttribute("editable","false");
      removeCell.setAttribute("class","removeCell");

      row.appendChild(nameCell);
      row.appendChild(iDCell);
      row.appendChild(removeCell);
    }

    item.appendChild(row);
    tree.styleListE.appendChild(item);
    tree.styleAmount++;
  },

  setUrlCell: function(style,urlCell)
  {
    let domain = style.getMeta("domain",{}),
    url = style.getMeta("url",{}),
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
  }

};
