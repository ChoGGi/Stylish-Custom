"use strict";
/* jshint ignore:start */
if (typeof Cu === "undefined") var Cu = Components.utils;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://stylish-custom/content/common.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
/* jshint ignore:end */
//scCommon.dump("XXX");

var scOverlay = {

  startup: null,

  init: function()
  {
    //run once ("load" is firing twice on TB for some reason)
    if (!this.startup)
      this.startup = true;
    else
      return;

    function dBox(name,enabled)
    {
      let id = document.getElementById(name);
      if (id)
        id.setAttribute("hidden",enabled);
    }

    //since Mozilla removed support for "requires" in install.rdf, this checks if Stylish is enabled
    let service = scCommon.tryService();
    if (!service) {
      //Stylish not installed
      dBox("stylish-toolmenu",true);
      dBox("stylish-custom-toolbar-button",true);
      dBox("stylish-custom-toolbar-manage",true);
      dBox("stylish-custom-popup",true);
      dBox("StylishGetStyleSheets",true);
      return;
    }

    //remove comments
    service.list(service.CALCULATE_META,{}).forEach(
      function(style)
      {
        if (style.getMeta("scComment",{}) != "") {
          style.removeAllMeta("scComment");
          style.save();
        }
      }
    );

    if (scCommon.prefs.getBoolPref("custom.removecss") == true) {
      //remove stale css files
      let file,files = Services.dirsvc.get("TmpD",Ci.nsIFile).directoryEntries;

      while (files.hasMoreElements()) {
        file = files.getNext();
        file.QueryInterface(Ci.nsIFile);
        try {
          if (file.isFile() &&
              file.leafName.indexOf("Stylish-Custom") != -1 &&
              file.leafName.search(/\.css$/i) != -1)
            file.remove(false);
        } catch(e) {/*fails on locked files, or at least pagefile.sys on windows*/}
      }
    }

    //display statusbar icon?
    if (scCommon.prefs.getBoolPref("custom.statusbaricon") == true)
      dBox("stylish-custom-panel",false);

    //display tools menupopup
    if (scCommon.prefs.getBoolPref("custom.toolbar") == true)
      dBox("stylish-toolmenu",false);

    //hide/show menuitems
    if (scCommon.prefs.getIntPref("custom.eximportlocation") == 1) {
      dBox("StylishExport",false);
      dBox("StylishImport",false);
      dBox("StylishExportMain",true);
      dBox("StylishImportMain",true);
    }

    if (scCommon.prefs.getIntPref("custom.stylemenulocation") == 1) {
      dBox("StylishAppStyles",false);
      dBox("StylishEnabledStyles",false);
      dBox("StylishDisabledStyles",false);
      dBox("StylishAppStylesMain",true);
      dBox("StylishEnabledStylesMain",true);
      dBox("StylishDisabledStylesMain",true);
    }

    if (scCommon.prefs.getIntPref("custom.infolocation") == 1) {
      dBox("StylishInfo",false);
      dBox("StylishInfoMain",true);
    }

    if (scCommon.prefs.getIntPref("custom.newstylelocation") == 1) {
      dBox("StylishNewStyle",false);
      dBox("StylishNewStyleMain",true);
    }

    //load a style sheet to fix the style for nasa night launch / ft deepdark
    let selectedSkin = Services.prefs.getCharPref("general.skins.selectedSkin"),
    darkStyle = Services.prefs.getBoolPref("extensions.stylish.custom.dark");
    if (darkStyle == true || selectedSkin == "nasanightlaunch" ||
                            selectedSkin == "nightlaunchnext" ||
                            selectedSkin == "ftdeepdark") {
      scCommon.applyStyle("chrome://stylish-custom/skin/dark.css",true,true);
    }

    //from stylish v1.0.6 (for toggling styles)
    let browser = document.getElementById("appcontent"); // browser
    if (!browser)
      browser = document.getElementById("frame_main_pane"); // songbird
    if (browser)
      browser.addEventListener("DOMContentLoaded",scOverlay.onPageLoad,true);

    //change stylish manage to be able to open style info
    let manage = document.getElementById("stylish-manage");
    if (manage) {
      manage.removeAttribute("oncommand");
      manage.addEventListener("command",function(event) {
        scOverlay.clickHandler(event);
      },false);
    }

    //only show get stylesheets menuitem for main context
    let contentAreaMenu = document.getElementById("contentAreaContextMenu");
    if (contentAreaMenu) {
      contentAreaMenu.addEventListener("popupshowing",function() {
        scOverlay.styleSheetsMenu();
      },false);
    }
    if (scCommon.prefs.getBoolPref("custom.stylesheetmenuitem") == false)
      document.getElementById("StylishGetStyleSheets").hidden = true;

    //set the key for reloading styles
    let reloadStyles = document.getElementById("key_stylishCustom-reloadStyles"),
    reloadKey = scCommon.prefs.getCharPref("custom.reloadstyleskey");
    if (reloadStyles && reloadKey != "")
      reloadStyles.setAttribute("key",reloadKey);

    //should we hide the icons
    if (scCommon.prefs.getBoolPref("custom.showicons") == false)
      scCommon.applyStyle("chrome://stylish-custom/skin/iconsDisabled.css",true,true);

    //replace S menuitems for SC menuitems
    if (scCommon.prefs.getBoolPref("custom.stylemenuoverride") == true)
      scCommon.toggleStyleMenuOverride(true,document);

    //for toggling styles
    //should i add an option to do it for new page loads as well as tab switching?
    try {
      gBrowser.tabContainer.addEventListener("TabSelect",scOverlay.onPageLoad,false);
    } catch(e) {/*don't care if it fails, probably just means fennec or Thunderbird*/}

    //e10s toggling styles
    if (window.messageManager) {
      window.messageManager
        .loadFrameScript("chrome://stylish-custom/content/frame-script-load.js",true);
      window.messageManager
        .addMessageListener("stylishCustom:pageload",scOverlay.onPageLoadE10s);
    }

  },

  styleSheetsMenu: function()
  {
    let hidden = gContextMenu.onLink ||
                gContextMenu.isTextSelected ||
                gContextMenu.onImage ||
                gContextMenu.onTextInput;
    document.getElementById("StylishGetStyleSheets").hidden = hidden;
  },

  domain: null,
  getStyleSheets: function()
  {
    let doc,
    e10s,
    styleText = "",
    styleArray = [],
    styleName,
    activeURL = document.getElementById("urlbar").value;

    //are we using multiprocess fox (e10s)?
    doc = gBrowser.contentDocument;
    try {
      styleName = doc.URL;
      //if it's an about: page just use the URL
      if (!gBrowser.contentDocument.domain)
        this.domain = styleName;
      else
        this.domain = gBrowser.contentDocument.domain;
    } catch (e) {
      e10s = true;
    }

    //load styles from e10s
    function e10sData(message)
    {
      if (activeURL === message.data.url) {
        scOverlay.domain = message.data.domain;
        doc = message.data;
        while (doc.array.length != 0) {
          let style = doc.array.pop();
          if (style.type === 0) {
            //inline styles
            styleArray.push(scCommon.getMsg("InlineStyleSheet") + ": " +
                            style.num + "|||" + style.data);
            styleText = styleText + style.data;
          } else if (style.type === 1) {
            //linked styles
            styleArray.push(style.data + "|||" +
                            scCommon.readFile(style.data,"Text","web"));
            styleText = styleText + scCommon.readFile(style.data,"Text","web");
          }
        }
        scOverlay.showStyleWin(doc,styleArray,styleText,doc.url);
        window.messageManager.removeMessageListener (
                              "stylishCustom:callback",e10sData
        );
      }
    }
    if (e10s) {
      if (window.messageManager) {
        window.messageManager
          .loadFrameScript("chrome://stylish-custom/content/frame-script.js",true);
        window.messageManager
          .addMessageListener("stylishCustom:callback",e10sData);
      }
      return;
    }

    //below is ignored if e10s is enabled

    //get inline styles from head element
    let styleSheet = doc.documentElement.firstChild.childNodes;
    for (let i = 0; i < styleSheet.length; i++) {
      let tag = styleSheet[i].tagName;
      if (tag && tag.search(/style/i) != -1) {
        styleArray.push(scCommon.getMsg("InlineStyleSheet") +
                        ": " + i + "|||" + styleSheet[i].textContent);
        styleText = styleText + styleSheet[i].textContent;
      }
    }

    //get linked styles: <link href="somestyle.css"/>
    for (let i = 0; i < doc.styleSheets.length; i++) {
      styleSheet = doc.styleSheets[i];
      if (styleSheet.href && styleSheet.disabled == false) {
        //can't use inline styles for this. if href is null = inline | and not disabled styles
        styleArray.push(styleSheet.href + "|||" +
                        scCommon.readFile(styleSheet.href,"Text","web"));
        styleText = styleText + scCommon.readFile(styleSheet.href,"Text","web");
      }
    }

    this.showStyleWin(doc,styleArray,styleText,styleName);
  },

  showStyleWin: function(doc,styleArray,styleText,styleName)
  {
    //read @import rules
    let imports = styleText.split("@import");

    for (let i = 0; i < imports.length; i++) {
      //cleanup @import lines to be "url.css";
      let str = imports[i].replace(/[ ]\)\;[ ]\-\-\>/,'";')
                          .replace(/url\([ ]/,'"'),
      //look for a line ending with .css";
      search = str.search(/\.css\"\;$/mi);

      if (search == -1)
        continue;
      //2 being the start of the line excluding the space and the quote, and 4 being .css
      let url = str.substring(2,search+4),
      //maybe someone enjoys adding urls
      text,css;
      try {
        text = scCommon.readFile(url,"Text","web");
      } catch (e) {
        //try to fixup @import "/location/rules.css";
        try {
          css = "http://" + this.domain + url;
          text = scCommon.readFile(css,"Text","web");
        } catch (e) {
          css = "https://" + this.domain + url;
          text = scCommon.readFile(css,"Text","web");
        }
      }
      //add text to style with a comment for people to know about
      if (text && text != "" && typeof text != "undefined")
        styleArray.push(url + "|||" + text);
    }
    //no styles
    if (styleArray.length == 0)
      return;
    //display a list of stylesheets to let user choose
    window.openDialog("chrome://stylish-custom/content/stylesheets.xul","",
                      "chrome,resizable,centerscreen",styleArray,styleName,this.domain);
  },

  onPageLoadE10s: function(message)
  {
    let t = scCommon.prefs.getIntPref("custom.styletoggle");
    if (t == 0 || t == 2) {
      var fakeEvent = {href: message.data};
      scOverlay.onPageLoadTask(fakeEvent);
    }
  },

  onPageLoad: function(event)
  {
    if (typeof gBrowser !== "undefined")//Thunderbird
      return;

    let t = scCommon.prefs.getIntPref("custom.styletoggle");
    if (t == 0 ||
        t == 1 && event.type == "TabSelect" ||
        t == 2 && event.type == "DOMContentLoaded") {
      scOverlay.onPageLoadTask(event);
    }
  },

  onPageLoadTask: function(event)
  {

    let href,
    currentTab,
    xul = "chrome://browser/content/browser.xul";

    if (window.location.href !== xul)
      currentTab = window.location.href;
    else if (window.location.href === xul)
      currentTab = gBrowser.currentURI.spec;

    if (event.href) {//e10s
      href = event.href;
    } else if (event.type !== "TabSelect") {//DOMContentLoaded
      if (event.originalTarget && event.originalTarget.location)
        href = event.originalTarget.location.href;
    } else if (event.type === "TabSelect" || content) {//TabSelect
      href = currentTab;
    }
/*
    something for tabselect, so far doesn't seem to be needed...

      if (!content) {
        window.removeEventListener("TabSelect",scOverlay.onPageLoad,false);
        return;
      }
    if (event.type == "TabSelect")
      window.removeEventListener("TabSelect",scOverlay.onPageLoad,false);
*/
    if (href !== currentTab){
      return;
    }

    let service = scCommon.service;
    if (!service)//missing Stylish
      return;

    service.list(service.REGISTER_STYLE_ON_CHANGE,{}).forEach(
      function(style)
      {
        let tags = style.getMeta("tag",{}).toString();
        //no " or | means no toggle
        if (tags.indexOf("\"") !== -1 && tags.indexOf("|") !== -1){
          let tmpNumber = tags.indexOf("\"")+1,
          styleStatus = null;
          tags = tags.slice(tmpNumber,tags.indexOf("\"",tmpNumber)).split(",");
          for (let i = 0; i < tags.length; i++) {
            let tagsTmp = tags[i].split("|");
            //check if the href contains a tag url or if it's * (any site)
            if (href.indexOf(tagsTmp[0]) !== -1 || tagsTmp[0] === "*") {
              if (tagsTmp[1] === "enable")
                styleStatus = true;
              else if (tagsTmp[1] === "disable")
                styleStatus = false;
            }
          }
          if (styleStatus == true || styleStatus == false) {
            style.enabled = styleStatus;
            style.save();
          }
        }
      }
    );

  },

  //used to force styles with @import to check the css file
  reloadStyles: function()
  {
    let service = scCommon.service,
    list = scCommon.prefs.getCharPref("custom.reloadstyles");
    if (list == "") {
      service.list(service.REGISTER_STYLE_ON_CHANGE,{}).forEach(
        function(style) {
          if (style.enabled == true) {
            style.enabled = false;
            style.enabled = true;
          }
        });
    } else {
      list = list.split(",");
      for (let i = 0; i < list.length; i++) {
        let style = service.find(list[i],service.REGISTER_STYLE_ON_CHANGE);
        if (style && style.enabled == true) {
          style.enabled = false;
          style.enabled = true;
        }
      }
    }
  },

  //I use one menu for tools menu/statusbar/toolbar, if I just add a popup="stylish-popup" the tools menu won't do jack
  //this opens/closes it when you left click the menuitem ("on mouse over" doesn't work as well)
  toggleToolsPopupWhich: null,
  toggleToolsPopup: function(that,e)
  {
    //only toggle on left mouse
    if (e.button != 0)
      return;
    let popup = document.getElementById("stylish-popup");
    if (!this.toggleToolsPopupWhich) {
      popup.openPopup(that,"end_before",0,0,false,false);
      this.toggleToolsPopupWhich = true;
    } else {
      popup.hidePopup();
      this.toggleToolsPopupWhich = null;
    }
  },

  //creates the custom app styles menus for stylish popup
  createMenu: function(id,event)
  {
    let service = scCommon.service,
    popup = event.target,
    styleList = [];
    //clear the menu
    for (let i = popup.childNodes.length - 1; i >= 0; i--) {
      popup.removeChild(popup.childNodes[i]);
    }

    //add new items
    service.list(service.REGISTER_STYLE_ON_CHANGE,{}).forEach(
      function(style) {
        styleList.push(style);
      });
    styleList.sort(scCommon.sortByName);
    for (let i = 0; i < styleList.length; i++) {

      let style = styleList[i];

      if (id == "StylishAppStyles" && style.getMeta("type",{}).join(" ")
        .indexOf("app") != -1 || id == "StylishAppStylesMain" &&
        style.getMeta("type",{}).join(" ").indexOf("app") != -1) {
          scOverlay.appendMenuitem(scCommon,style,i,id);
      } else if (id == "StylishEnabledStyles" &&
        style.enabled == 1 || id == "StylishEnabledStylesMain" &&
        style.enabled == 1) {
          scOverlay.appendMenuitem(scCommon,style,i,id);
      } else if (id == "StylishDisabledStyles" &&
        style.enabled == 0 || id == "StylishDisabledStylesMain" &&
        style.enabled == 0) {
          scOverlay.appendMenuitem(scCommon,style,i,id);
      }

    }
  },

  appendMenuitem: function(com,style,i,id)
  {
    let menuitem = document.createElement("menuitem");

    document.getElementById(id).firstChild.appendChild(menuitem);
    menuitem.setAttribute("label",style.name);
    let menuitemClickEvent = function(event)
      {
      scOverlay.clickHandlerSubMenu(style.id,event);
      };
    menuitem.addEventListener("click",menuitemClickEvent,false);
    menuitem.setAttribute("class","Style");
    menuitem.id = "Style" + i;

    if (style.enabled == 1)
      menuitem.setAttribute("enabled",true);
    else
      menuitem.setAttribute("enabled",false);
  },

  //from stylish v0.5.9
  handleStyleMenuItemClick: function(event,style)
  {
    //right-click opens edit window
    if (event.button != 2)
      return;
    scCommon.openEditForId(style.id);
    //close the menu
    document.getElementById("stylish-popup").hidePopup();
    document.getElementById("stylish-custom-popup").hidePopup();
    event.stopPropagation();
  },
  //^ stylish v0.5.9 ^

  //from Stylish v2.0.7
	writeStylePopupShowing: function(event) {
    if (!document)
      var document = scCommon.getMainWindow().document;

		let popup = event.target,
		addSite = document.createElementNS(stylishCommon.XULNS, "menuitem");

		addSite.setAttribute("label",stylishOverlay
                        .STRINGS.getString("writeforsite"));
		addSite.setAttribute("accesskey",stylishOverlay
                        .STRINGS.getString("writeforsiteaccesskey"));
		//addSite.addEventListener("command", scCommon.addSite, false);
		addSite.addEventListener("command", function() {
      scCommon.addSite(stylishOverlay);
    }, false);
		popup.appendChild(addSite);

		let domain = null;
		try {
			domain = gBrowser.currentURI.host;
		} catch (e) {}
		if (domain) {
			let domains = [];
			stylishOverlay.getDomainList(domain, domains);
			for (let i = 0; i < domains.length; i++) {
				popup.appendChild(this.getDomainMenuItem(domains[i]));
			}
		}

		addSite = document.createElementNS(stylishCommon.XULNS, "menuitem");
		addSite.setAttribute("label",stylishOverlay
                        .STRINGS.getString("writeblank"));
		addSite.setAttribute("accesskey",stylishOverlay
                        .STRINGS.getString("writeblankaccesskey"));
		addSite.addEventListener("command", function() {
      scCommon.addCode('');
    }, false);
		popup.appendChild(addSite);
	},

	getDomainMenuItem: function(domain) {
		let addSite = document.createElementNS(stylishCommon.XULNS, "menuitem");
		addSite.setAttribute("label",stylishOverlay
                      .STRINGS.getFormattedString("writefordomain", [domain]));
		addSite.addEventListener("command", function() {
      scCommon.addDomain(domain);
    }, false);
		return addSite;
	},
  //^ Stylish v2.0.7 ^

  //for stylish toolbar menu
  //popupshowing: function(event)
  popupshowing: function()
  {
    let i;
    //change rightclick action
    if (scCommon.prefs.getIntPref("custom.stylemenuitem") == 1) {
      let styleList = document.getElementById("stylish-popup").childNodes;
      for (i = 0; i < styleList.length; i++) {
        if (styleList[i].getAttribute("context") == "stylish-style-context") {
          styleList[i].addEventListener("click",function(event) {// jshint ignore:line
            scOverlay.handleStyleMenuItemClick(event,this.stylishStyle);
          },false);
          styleList[i].removeAttribute("context");
        }
      }
    }

    //change colour of global styles
    let children = document.getElementById("stylish-find-styles")
                                          .parentNode.childNodes;
    for (i = 0; i < children.length; i++) {
      let styleType = children[i].getAttribute("style-type");

      if (scCommon.prefs.getBoolPref("custom.showappstyles") == false &&
          styleType.indexOf("app") != -1) {
        children[i].setAttribute("hidden",true);
      } else if (styleType.indexOf("global site") != -1) {
        children[i].style.color = scCommon.prefs
                                  .getCharPref("custom.globalsitestyle");
      } else if (styleType.indexOf("global") != -1) {
        children[i].style.color = scCommon.prefs
                                  .getCharPref("custom.globalstyle");
      } else if (styleType.indexOf("site") != -1) {
        children[i].style.color = scCommon.prefs
                                  .getCharPref("custom.sitestyle");
      }
      //add event listener here?
      //menu.style-menu-item children
    }
  },

  //stylish-custom-toolbar-button
  clickHandler: function(event)
  {
    let et = event.target;

    //if they left click the dropmenu
    if (event.button == 0 &&
        et.id == "stylish-custom-toolbar-button" &&
        event.originalTarget.tagName == "toolbarbutton") {
      document.getElementById(et.setAttribute("popup","stylish-custom-popup"));
      document.getElementById(et.getAttribute("popup"))
                        .openPopup(et,"after_start",null,null,"true");
      document.getElementById(et.removeAttribute("popup"));
      return;
    }

    switch(event.button) {
    case 1: //middle
      scCommon.newStyle();
    break;
    case 2: //right
      if (et.id == "stylish-custom-toolbar-button") { //toolbar
        document.getElementById(et.setAttribute("popup","stylish-custom-popup"));
        document.getElementById(et.getAttribute("popup"))
          .openPopup(et,"after_start",null,null,"true");
        document.getElementById(et.removeAttribute("popup"));
      } else if (et.id == "stylish-custom-panel") {//statusbar
        document.getElementById(et.setAttribute("popup","stylish-custom-popup"));
        document.getElementById(et.getAttribute("popup"))
          .openPopup(et,"before_start",null,null,"true");
        document.getElementById(et.removeAttribute("popup"));
      }
    break;
    default:
      scCommon.openStyleManager(window);
    break;
    }
  },

  //stylish-custom-toolbar-manage
  clickHandlerManage: function(button)
  {
    switch(button) {
    //standalone
    case 1: //middle
      //from Stylish v2.0.4
      if (typeof window.BrowserOpenAddonsMgr !== "undefined")
        BrowserOpenAddonsMgr("addons://list/userstyle");
      else if (typeof window.toEM !== "undefined")
        toEM("addons://list/userstyle");
      else if (typeof window.openAddonsMgr !== "undefined")
        openAddonsMgr("addons://list/userstyle");
      else
        scCommon.addonsManagerWindow(window);
    break;

    //sidebar
    case 2: //right
      scCommon.sidebarToggle(window);
    break;

    //addons
    default: //left
      let em = scCommon.getWin("stylishCustomInfo");
      if (em)
        em.focus();
      else
        window.openDialog("chrome://stylish-custom/content/info.xul","",
                    "chrome,menubar,extra-chrome,toolbar,dialog=no,resizable");
    break;

    }
  },

  //for app styles submenu
  clickHandlerSubMenu: function(id,event)
  {
    switch(event.button) {
    case 2: //right
      scCommon.openEditForId(id);
      event.stopPropagation();
    break;
    default: //left
      let service = scCommon.service;
      stylishOverlay.toggleStyle(service.find(id,service.REGISTER_STYLE_ON_CHANGE));
    break;
    }
  }

};

window.addEventListener("load", function load()
{
  window.removeEventListener("load",load,false);
  //let firstPaint go first
  window.setTimeout(function(){
    scOverlay.init();
  },500);
},false);
