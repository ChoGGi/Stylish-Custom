"use strict";
if (typeof Cu === "undefined") var Cu = Components.utils;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://stylish-custom/content/common.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
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
      var id = document.getElementById(name);
      if (id)
        id.setAttribute("hidden",enabled);
    }

    //since Mozilla removed support for "requires" in install.rdf, this checks if Stylish is enabled
    var service = scCommon.tryService();
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
      var file,files = Services.dirsvc.get("TmpD",Ci.nsIFile).directoryEntries;

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

    //load a style sheet to fix the style for nasa night launch / ft deepdark
    var selectedSkin = Services.prefs.getCharPref("general.skins.selectedSkin"),
    darkStyle = Services.prefs.getBoolPref("extensions.stylish.custom.dark");
    if (darkStyle == true || selectedSkin == "nasanightlaunch" || selectedSkin == "nightlaunchnext" || selectedSkin == "ftdeepdark")
      scCommon.applyStyle("chrome://stylish-custom/skin/dark.css",true,true);

    //from stylish v1.0.6 (for toggling styles)
    var browser = document.getElementById("appcontent"); // browser
    if (!browser)
      browser = document.getElementById("frame_main_pane"); // songbird
    if (browser)
      browser.addEventListener("DOMContentLoaded",scOverlay.onPageLoad,true);

    //change stylish manage to be able to open style info
    var manage = document.getElementById("stylish-manage");
    if (manage) {
      manage.removeAttribute("oncommand");
      manage.addEventListener("command",function(event) {
        scOverlay.clickHandler(event);
      },false);
    }

    //only show get stylesheets menuitem for main context
    var contentAreaMenu = document.getElementById("contentAreaContextMenu");
    if (contentAreaMenu) {
      contentAreaMenu.addEventListener("popupshowing",function() {
        scOverlay.styleSheetsMenu();
      },false);
    }
    if (scCommon.prefs.getBoolPref("custom.stylesheetmenuitem") == false)
      document.getElementById("StylishGetStyleSheets").hidden = true;

    //set the key for reloading styles
    var reloadStyles = document.getElementById("key_stylishCustom-reloadStyles"),
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
  },

  styleSheetsMenu: function()
  {
    var hidden = gContextMenu.onLink || gContextMenu.isTextSelected || gContextMenu.onImage || gContextMenu.onTextInput;
    document.getElementById("StylishGetStyleSheets").hidden = hidden;
  },

  getStyleSheets: function()
  {
    var doc = gBrowser.contentDocument,
    styleName = doc.URL,
    styleText = "",
    styleArray = [];

    //nothing on a blank page
    if (!doc.documentElement.firstChild)
      return;
    //get inline styles from head element
    var styleSheet = doc.documentElement.firstChild.childNodes;

    for (var i = 0; i < styleSheet.length; i++) {
      var tag = styleSheet[i].tagName;
      if (tag && tag.search(/style/i) != -1) {
        styleArray.push(scCommon.getMsg("InlineStyleSheet") + ": " + i + "|||" + styleSheet[i].textContent);
        styleText = styleText + styleSheet[i].textContent;
      }
    }
    //get linked styles: <link href="somestyle.css"/>
    for (i = 0; i < doc.styleSheets.length; i++) {
      styleSheet = doc.styleSheets[i];
      if (styleSheet.href && styleSheet.disabled == false) {//can't use inline styles for this. if href is null = inline | and not disabled styles
        styleArray.push(styleSheet.href + "|||" + scCommon.readFile(styleSheet.href,"Text","web"));
        styleText = styleText + scCommon.readFile(styleSheet.href,"Text","web");
      }
    }

    //read @import rules
    var imports = styleText.split("@import");
    for (i = 0; i < imports.length; i++) {
      //look for a line ending with .css";
      var search = imports[i].search(/\.css\"\;$/mi);
      if (search == -1)
        continue;
      //2 being the start of the line excluding the space and the quote, and 4 being .css
      var url = imports[i].substring(2,search+4),
      //maybe someone enjoys adding urls
      text;
      if (url.search(/http\:\/\//i) == -1)
        text = scOverlay.loadImportStyle(url,doc.domain);
      else
        text = scOverlay.loadImportStyle(url,doc.domain,1);
      //add text to style with a comment for people to know about
      if (text && text != "" && typeof text != "undefined")
        styleArray.push(url + "|||" + text);
    }
    //no styles
    if (styleArray.length == 0)
      return;
    //display a list of stylesheets to let user choose
    window.openDialog("chrome://stylish-custom/content/stylesheets.xul","","chrome,resizable,centerscreen",styleArray,styleName);

  },

  loadImportStyle: function(url,domain,which)
  {
    if (!which && url.charAt(0) == "/") {
      url = "http://" + domain + url;
    }
    //download and return; it
    var req = new XMLHttpRequest();
    req.open("GET",url,true);
    req.onreadystatechange = function() {
      if (req.readyState == 4) {
        if (req.status == 200) {
          return req.responseText;
        } else {
          scCommon.catchError(event);
          return null;
        }
      }
    };
    req.send(null);
  },

  onPageLoad: function(event)
  {
    var intp = scCommon.prefs.getIntPref("custom.styletoggle");

    if (intp == 0 ||
        intp == 1 && event.type == "TabSelect" ||
        intp == 2 && event.type == "DOMContentLoaded")
      scOverlay.onPageLoadTask(event);
  },

  onPageLoadTask: function(event)
  {
    var href = "";
    if (event.type != "TabSelect") {
      if (event.originalTarget.location != null)
        href = event.originalTarget.location.href;
    } else if (content != null)
      href = window.location.href;

    if (content == null) {
      window.removeEventListener("TabSelect",scOverlay.onPageLoad,false);
      return;
    }

    if (event.type == "TabSelect")
      window.removeEventListener("TabSelect",scOverlay.onPageLoad,false);
    if (href != window.location.href)
      return;
    var service = scCommon.service;
    if (!service)//missing Stylish
      return;

    service.list(service.REGISTER_STYLE_ON_CHANGE,{}).forEach(
      function(style)
      {
        var tags = style.getMeta("tag",{}).toString();
        //no " or | means no toggle
        if (tags.indexOf("\"") != -1 && tags.indexOf("|") != -1){
          var tmpNumber = tags.indexOf("\"")+1,
          styleStatus = null;
          tags = tags.slice(tmpNumber,tags.indexOf("\"",tmpNumber)).split(",");
          for (var i = 0; i < tags.length; i++) {
            var tagsTmp = tags[i].split("|");
            //check if the href contains a tag url or if it's * (any site)
            if (href.indexOf(tagsTmp[0]) != -1 || tagsTmp[0] == "*") {
              if (tagsTmp[1] == "enable")
                styleStatus = true;
              else if (tagsTmp[1] == "disable")
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
    var service = scCommon.service,
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
      for (var i = 0; i < list.length; i++) {
        var style = service.find(list[i],service.REGISTER_STYLE_ON_CHANGE);
        if (style && style.enabled == true) {
          style.enabled = false;
          style.enabled = true;
        }
      }
    }
  },

  //I use one menu for tools menu/statusbar/toolbar, if I just add a popup="stylish-popup" the tools menu won't do jack
  //this opens/closes it when you left click the menuitem (onmouseover doesn't work as well)
  toggleToolsPopupWhich: null,
  toggleToolsPopup: function(that,e)
  {
    //only toggle on left mouse
    if (e.button != 0)
      return;
    var popup = document.getElementById("stylish-popup");
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
    var service = scCommon.service,
    popup = event.target,
    styleList = [];
    //clear the menu
    for (var i = popup.childNodes.length - 1; i >= 0; i--) {
      popup.removeChild(popup.childNodes[i]);
    }

    //add new items
    service.list(service.REGISTER_STYLE_ON_CHANGE,{}).forEach(
      function(style) {
        styleList.push(style);
      });
    styleList.sort(scCommon.sortByName);
    for (i = 0; i < styleList.length; i++) {
      var style = styleList[i];
      if (id == "StylishAppStyles" && style.getMeta("type",{}).join(" ")
              .indexOf("app") != -1 || id == "StylishAppStylesMain" &&
              style.getMeta("type",{}).join(" ").indexOf("app") != -1)
          scOverlay.appendMenuitem(scCommon,style,i,id);
      else if (id == "StylishEnabledStyles" &&
              style.enabled == 1 || id == "StylishEnabledStylesMain" &&
              style.enabled == 1)
          scOverlay.appendMenuitem(scCommon,style,i,id);
      else if (id == "StylishDisabledStyles" &&
              style.enabled == 0 || id == "StylishDisabledStylesMain" &&
              style.enabled == 0)
          scOverlay.appendMenuitem(scCommon,style,i,id);
    }
  },

  appendMenuitem: function(com,style,i,id)
  {
    var menuitem = document.createElement("menuitem");

    document.getElementById(id).firstChild.appendChild(menuitem);
    menuitem.setAttribute("label",style.name);
    var menuitemClickEvent = function(event) {
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

		var popup = event.target,
		addSite = document.createElementNS(stylishCommon.XULNS, "menuitem");

		addSite.setAttribute("label", stylishOverlay.STRINGS.getString("writeforsite"));
		addSite.setAttribute("accesskey", stylishOverlay.STRINGS.getString("writeforsiteaccesskey"));
		//addSite.addEventListener("command", scCommon.addSite, false);
		addSite.addEventListener("command", function() {
      scCommon.addSite(stylishOverlay);
    }, false);
		popup.appendChild(addSite);

		var domain = null;
		try {
			domain = gBrowser.currentURI.host;
		} catch (e) {}
		if (domain) {
			var domains = [];
			stylishOverlay.getDomainList(domain, domains);
			for (var i = 0; i < domains.length; i++) {
				popup.appendChild(this.getDomainMenuItem(domains[i]));
			}
		}

		addSite = document.createElementNS(stylishCommon.XULNS, "menuitem");
		addSite.setAttribute("label", stylishOverlay.STRINGS.getString("writeblank"));
		addSite.setAttribute("accesskey", stylishOverlay.STRINGS.getString("writeblankaccesskey"));
		addSite.addEventListener("command", function() {
      scCommon.addCode('');
    }, false);
		popup.appendChild(addSite);
	},

	getDomainMenuItem: function(domain) {
		var addSite = document.createElementNS(stylishCommon.XULNS, "menuitem");
		addSite.setAttribute("label", stylishOverlay.STRINGS.getFormattedString("writefordomain", [domain]));
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
    var i;
    //change rightclick action
    if (scCommon.prefs.getIntPref("custom.stylemenuitem") == 1) {
      var styleList = document.getElementById("stylish-popup").childNodes;
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
    var children = document.getElementById("stylish-find-styles").parentNode.childNodes;
    for (i = 0; i < children.length; i++) {
      var styleType = children[i].getAttribute("style-type");

      if (scCommon.prefs.getBoolPref("custom.showappstyles") == false &&
          styleType.indexOf("app") != -1)
        children[i].setAttribute("hidden",true);
      else if (styleType.indexOf("global site") != -1)
        children[i].style.color = scCommon.prefs.getCharPref("custom.globalsitestyle");
      else if (styleType.indexOf("global") != -1)
        children[i].style.color = scCommon.prefs.getCharPref("custom.globalstyle");
      else if (styleType.indexOf("site") != -1)
        children[i].style.color = scCommon.prefs.getCharPref("custom.sitestyle");
      //add event listener here?
      //menu.style-menu-item children
    }
  },

  //stylish-custom-toolbar-button
  clickHandler: function(event)
  {
    //if they left click the dropmenu
    if (event.target.id == "stylish-custom-toolbar-button" && event.button == 0 && event.originalTarget.tagName == "toolbarbutton") {
      document.getElementById(event.target.setAttribute("popup","stylish-custom-popup"));
      document.getElementById(event.target.getAttribute("popup")).openPopup(event.target,"after_start",null,null,"true");
      document.getElementById(event.target.removeAttribute("popup"));
      return;
    }

    switch(event.button) {
    case 1: //middle
      scCommon.newStyle();
    break;
    case 2: //right
      if (event.target.id == "stylish-custom-toolbar-button") { //toolbar
        document.getElementById(event.target.setAttribute("popup","stylish-custom-popup"));
        document.getElementById(event.target.getAttribute("popup"))
          .openPopup(event.target,"after_start",null,null,"true");
        document.getElementById(event.target.removeAttribute("popup"));
      } else if (event.target.id == "stylish-custom-panel") {//statusbar
        document.getElementById(event.target.setAttribute("popup","stylish-custom-popup"));
        document.getElementById(event.target.getAttribute("popup"))
          .openPopup(event.target,"before_start",null,null,"true");
        document.getElementById(event.target.removeAttribute("popup"));
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
      var em = scCommon.getWin("stylishCustomInfo");
      if (em)
        em.focus();
      else
        window.openDialog("chrome://stylish-custom/content/info.xul","","chrome,menubar,extra-chrome,toolbar,dialog=no,resizable");
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
      var service = scCommon.service;
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
