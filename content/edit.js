"use strict";
//the below is (mostly) from Stylish v1.4.3/2.0.4, so different license applies

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://stylish-custom/content/common.jsm");
//cbCommon.dump();

let saved = false,
style = null,
strings = null,
codeE, nameE, tagsE, updateUrlE,
//because some editors can have different CRLF settings than what we've saved as, we'll only save if the code in the editor has changed. this will prevent update notifications when there are none
initialCode,
prefs = Services.prefs.getBranch("extensions.stylish.");

const CSSXULNS = "@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);";
const CSSHTMLNS = "@namespace url(http://www.w3.org/1999/xhtml);";

// Because the edit windows have different URL, we need to do this ourselves to persist the position for all edit windows.
// Only do this if we're opened with openDialog, in which case window.opener is set
/*
  if (window.opener) {
    let windowPersist = JSON.parse(prefs.getCharPref("editorWindowPersist"));
    window.moveTo(windowPersist.screenX, windowPersist.screenY);
    window.resizeTo(windowPersist.width, windowPersist.height);
    if (windowPersist.windowState == 1) {
      //https://bugzilla.mozilla.org/show_bug.cgi?id=1079962
      window.addEventListener("load", function()
      {
        setTimeout(function()
        {
          window.maximize();
        }, 100);
      });
    } else window.moveTo(windowPersist.screenX, windowPersist.screenY);

    window.addEventListener("unload", function()
    {
      // save windowState if it's maximized or normal - otherwise use value
      let ws = (window.windowState == 1 || window.windowState == 3) ? window.windowState : windowPersist.windowState;
      // save the other stuff if it's normal state, otherwise use previous
      if (ws == 3) {
        // width and height get read from document but set from document.documentElement
        // this can fail if this is in a tab. if so, don't save.
        try {
          windowPersist = {
            width: window.outerWidth,
            height: window.outerHeight,
            screenX: window.screenX,
            screenY: window.screenY
          }
        } catch (e) {
          scCommon.catchError(e);
          return;
        }
      }
      windowPersist.windowState = ws;

      prefs.setCharPref("editorWindowPersist", JSON.stringify(windowPersist));
    });
  }
*/
  function init()
  {
    nameE = document.getElementById("name");
    tagsE = document.getElementById("tags");
    updateUrlE = document.getElementById("update-url");
    strings = document.getElementById("stringsEdit");
    codeE = document.getElementById("internal-code");

    initStyle();

    // textbox
    setTimeout(init2, 100);
  }

  function initStyle()
  {
    let service = scCommon.service;

    // See if the ID is in the URL
    let id,
    code = null,
    urlParts = location.href.split("?");

    if (urlParts.length > 1) {
          let params;
      params = urlParts[1].split("&");
      params.forEach(function(param)
      {
        let kv = param.split("=");
        if (kv.length > 1) {
          if (kv[0] == "id")
            id = decodeURIComponent(kv[1]);
          else if (kv[0] == "code")
            code = decodeURIComponent(kv[1]);
        }
      });
    }

    if (id) {//probably never getting called
Services.console.logStringMessage("Stylish-Custom:\n " + "probably never getting called?");
      style = service.find(id, service.CALCULATE_META | service.REGISTER_STYLE_ON_CHANGE);
      document.documentElement.setAttribute("windowtype", scCommon.getWindowName("stylishEdit", id));
      document.documentElement.setAttribute("styleId", id);
    } else if (window.arguments[0] && typeof window.arguments != "undefined" && "id" in window.arguments[0] || "style" in window.arguments[0]) {
      if ("id" in window.arguments[0]) {
        style = service.find(window.arguments[0].id, service.CALCULATE_META | service.REGISTER_STYLE_ON_CHANGE);
        document.documentElement.setAttribute("styleId", style.id);
      } else {
        style = window.arguments[0].style;
        style.mode = service.CALCULATE_META | service.REGISTER_STYLE_ON_CHANGE;
      }
      document.documentElement.setAttribute("windowtype", window.arguments[0].windowType);

    } else {//new style
      if (code == null)
        code = "";
      style = Cc["@userstyles.org/style;1"].createInstance(Ci.stylishStyle);
      style.mode = style.CALCULATE_META | style.REGISTER_STYLE_ON_CHANGE;
      style.init(null, null, null, null, null, code, false, null, null, null);
    }

    if (style) {
      if (nameE)
        nameE.value = style.name;
      if (updateUrlE)
        updateUrlE.value = style.updateUrl;
      if (tagsE)
        tagsE.value = style.getMeta("tag", {}).join(" ");
      //updateTitle();
    } else {
      style = Cc["@userstyles.org/style;1"].createInstance(Ci.stylishStyle);
    }
  }

  function init2()
  {
    let wrapLines = prefs.getBoolPref("wrap_lines");
    refreshWordWrap(wrapLines);
    let wrapLinesE = document.getElementById("wrap-lines");
    if (wrapLinesE) {
      wrapLinesE.checked = wrapLines;
      wrapLinesE.style.display = "";
    }

    codeElementWrapper.value = style.code;

    setTimeout(function()
    {
      // the code returned is different for some reason a little later...
      initialCode = codeElementWrapper.value;
      // this doesn't work till "later" either
      codeElementWrapper.setSelectionRange(0,0);
    },100);
    initFinder();


    codeElementWrapper.focus();

  }

/*
  let undoController = {
    doCommand: function(command)
  {
      if (command == "stylish_cmd_undo")
        codeE.undo();
    },

    isCommandEnabled: function(command)
  {
      if (command == "stylish_cmd_undo")
        return codeE.canUndo();
    },

    supportsCommand: function(command)
  {
      return command == "stylish_cmd_undo";
    },

    onEvent: function() {}
  }
*/

  function preview()
  {
    if (nameE)
      style.name = nameE.value;
    style.code = codeElementWrapper.value;
    checkForErrors();
    // delay this so checkForErrors doesn't pick up on what happens
    setTimeout(function() { style.setPreview(true);}, 50);
  }

  function cancelDialog()
  {
    if (!saved && initialCode != codeElementWrapper.value) {
      let ps = Services.prompt;
      switch (ps.confirmEx(window, strings.getString("unsavedchangestitle"), strings.getString("unsavedchanges"), ps.BUTTON_POS_0 * ps.BUTTON_TITLE_SAVE + ps.BUTTON_POS_1 * ps.BUTTON_TITLE_DONT_SAVE + ps.BUTTON_POS_2 * ps.BUTTON_TITLE_CANCEL, "", "", "", null, {})) {
      case 0:
        return save();
      case 1:
        return true;
      case 2:
        return false;
      }
    }
    return true;
  }

  function dialogClosing()
  {
    //turn off preview!
    style.setPreview(false);
    if (!saved)
      style.revert();
  }

  function checkForErrors()
  {
    let errors = document.getElementById("errors"),
    errorsArea = document.getElementById("errorsArea");

    errorsArea.style.display = "none";
    while (errors.hasChildNodes()) {
      errors.removeChild(errors.lastChild);
    }
    let currentMessages = [],
    errorListener = {
      QueryInterface: XPCOMUtils.generateQI([Ci.nsIConsoleListener, Ci.nsISupports]),
      observe: function(message) {
        if ("QueryInterface" in message) {
          errorsArea.style.display = "-moz-box";
          let error = message.QueryInterface(Ci.nsIScriptError);

          //Note to reviewer: Doesn't change behavior of new tab page
          if (error.category == "CSS Parser" && error.sourceName == "about:blank") {
            message = error.lineNumber + ":" + error.columnNumber + " " + error.errorMessage;
            // don't duplicate
            if (currentMessages.indexOf(message) == -1) {
              currentMessages.push(message);
              let label = document.createElement("label");
              label.appendChild(document.createTextNode(message));
              let mouseEventClick = function() {
                goToLine(error.lineNumber,error.columnNumber);
                scEdit.errorCodeCopy(this);
              };
              label.addEventListener("click",mouseEventClick,false);
              errors.appendChild(label);
            }
          }
        }
      }
    };
    style.checkForErrors(codeElementWrapper.value, errorListener);
    //hide if no errors
    if (errors.childElementCount == 0)
      errorsArea.style.display = "none";
  }

  function goToLine(line, col)
  {
    let index = 0,
    currentLine = 1;

    while (currentLine < line) {
      index = codeElementWrapper.value.indexOf("\n", index) + 1;
      currentLine++;
    }
    codeElementWrapper.focus();
    codeElementWrapper.setSelectionRange(index + col, index + col);
  }

  //Insert the snippet at the start of the code textbox or highlight it if it's already in there
  function insertCodeAtStart(snippet)
  {
    let position = codeElementWrapper.value.indexOf(snippet);
    if (position == -1) {
      //insert the code
      //put some line breaks in if there's already code there
      if (codeElementWrapper.value.length > 0)
        codeElementWrapper.value = snippet + "\n" + codeElementWrapper.value;
      else
        codeElementWrapper.value = snippet + "\n";
    }
    //highlight it
    codeElementWrapper.setSelectionRange(snippet.length + 1, snippet.length + 1);
    codeElementWrapper.focus();
  }

  function insertCodeAtCaret(snippet)
  {
    let selectionStart = codeElementWrapper.selectionStart,
    selectionEnd = selectionStart + snippet.length;

    // sourceditor is good at keeping the scroll position, but others are not
    let currentScrollTop = codeElementWrapper.scrollTop;
    codeElementWrapper.value = codeElementWrapper.value.substring(0, codeElementWrapper.selectionStart) + snippet + codeElementWrapper.value.substring(codeElementWrapper.selectionEnd, codeElementWrapper.value.length);
    codeElementWrapper.focus();
    codeElementWrapper.scrollTop = currentScrollTop;
    codeElementWrapper.setSelectionRange(selectionStart, selectionEnd);
  }

  function changeWordWrap(on)
  {
    prefs = Services.prefs.getBranch("extensions.stylish.");
    prefs.setBoolPref("wrap_lines", on);
    refreshWordWrap(on);
  }

  function refreshWordWrap(on)
  {
    codeE.setAttribute("wrap", on ? "on" : "off");
  }

  function insertChromePath()
  {
    let fileHandler = Services.io.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler),
    chromePath = fileHandler.getURLSpecFromFile(Services.dirsvc.get("UChrm", Ci.nsIFile));

    insertCodeAtCaret(chromePath);
  }

  function insertDataURI()
  {
    const nsIFilePicker = Ci.nsIFilePicker;
    let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, strings.getString("dataURIDialogTitle"), nsIFilePicker.modeOpen);
    //if (fp.show() != nsIFilePicker.returnOK)
    if (fp.show() != nsIFilePicker.returnOK)
      return;
    let file = fp.file,
    contentType = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService).getTypeFromFile(file),
    inputStream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);

    //inputStream.init(file, 0x01, 0600, 0);
    inputStream.init(file,parseInt("0x01",16),parseInt("0600",8),0);

    let stream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
    stream.setInputStream(inputStream);
    let encoded = btoa(stream.readBytes(stream.available()));
    stream.close();
    inputStream.close();
    insertCodeAtCaret("data:" + contentType + ";base64," + encoded);
  }

  //fails badly on Pale Moon
  let finderJsmStyle = null;
  if (scCommon.appInfo.ID != "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}") {
    // Firefox 27 changed this interface
    finderJsmStyle = false;
    try {
      Cu.import("resource://gre/modules/Finder.jsm", {});
      finderJsmStyle = true;
    } catch (e) {
      scCommon.catchError(e);
      // file not available...
    }
  }

  let finder = null;
  if (finderJsmStyle) {
    finder = {
      _listeners: [],
      searchString: null,
      caseSensitive: false,

      addResultListener: function (aListener)
      {
        if (this._listeners.indexOf(aListener) == -1)
          this._listeners.push(aListener);
      },

      removeResultListener: function (aListener)
      {
        this._listeners = this._listeners.filter(function(l) {return l != aListener;});
      },

      _notify: function (aSearchString, aResult, aFindBackwards, aDrawOutline)
      {
        this.searchString = aSearchString;

        let data = {
          result: aResult,
          findBackwards: aFindBackwards,
          linkURL: null,
          rect: {top: 0, right: 0, bottom: 0, left: 0},
          searchString: this._searchString,
        };

        this._listeners.forEach(function(l)
        {
          l.onFindResult(data);
        });
      },

      fastFind: function(aSearchString, aLinksOnly, aDrawOutline)
      {
        this.searchString = aSearchString;
        let result = this._findFromIndex(0, false);
        this._notify(aSearchString, result, false, aDrawOutline);
      },

      findAgain: function(aFindBackwards, aLinksOnly, aDrawOutline)
      {
        let result = this._findFromIndex(codeElementWrapper.selectionStart + (aFindBackwards ? 0 : 1), aFindBackwards);
        this._notify(this.searchString, result, aFindBackwards, aDrawOutline);
      },

      _findFromIndex: function(index, backwards)
      {
        let start = backwards ? codeElementWrapper.value.substring(0, index).lastIndexOf(this.searchString) : codeElementWrapper.value.indexOf(this.searchString, index);
        let result;
        let iface = Ci.nsITypeAheadFind;
        if (start >= 0) {
          result = iface.FIND_FOUND;
        } else if (index == 0) {
          result = iface.FIND_NOTFOUND;
        } else {
          // try again, start from the start
          start = backwards ? codeElementWrapper.value.lastIndexOf(this.searchString) : codeElementWrapper.value.indexOf(this.searchString);
          result = start == -1 ? iface.FIND_NOTFOUND : iface.FIND_WRAPPED;
        }
        codeE.editor.selection.removeAllRanges();
        if (start >= 0) {
          codeElementWrapper.setSelectionRange(start, start + this.searchString.length);
          codeE.editor.selectionController.setDisplaySelection(2);
          codeE.editor.selectionController.scrollSelectionIntoView(1, 0, false);
        } else
          codeElementWrapper.setSelectionRange(0, 0);
        return result;
      },

      highlight: function(aHighlight, aWord) {},
      enableSelection: function() {},
      removeSelection: function() {},
      focusContent: function() {},
      keyPress: function (aEvent) {}
    };
  } else {
    finder = {
      QueryInterface: XPCOMUtils.generateQI([Ci.nsITypeAheadFind, Ci.nsISupports]),
      nsITAF: Ci.nsITypeAheadFind,

      init: function(docshell) {},

      find: function(s, linksOnly)
        {
        this.searchString = s;
        return this.findFromIndex(0, false);
      },

      findAgain: function(backwards, linksOnly)
      {
        return this.findFromIndex(codeElementWrapper.selectionStart + (backwards ? 0 : 1), backwards);
      },

      findFromIndex: function(index, backwards)
      {
        let start = backwards ? codeElementWrapper.value.substring(0, index).lastIndexOf(this.searchString) : codeElementWrapper.value.indexOf(this.searchString, index),
        result;

        if (start >= 0)
          result = this.nsITAF.FIND_FOUND;
        else if (index == 0)
          result = this.nsITAF.FIND_NOTFOUND;
        else {
          // try again, start from the start
          start = backwards ? codeElementWrapper.value.lastIndexOf(this.searchString) : codeElementWrapper.value.indexOf(this.searchString);
          result = start == -1 ? this.nsITAF.FIND_NOTFOUND : this.nsITAF.FIND_WRAPPED;
        }
        codeE.editor.selection.removeAllRanges();
        if (start >= 0) {
          codeElementWrapper.setSelectionRange(start, start + this.searchString.length);
          codeE.editor.selectionController.setDisplaySelection(2);
          codeE.editor.selectionController.scrollSelectionIntoView(1, 0, false);
        } else codeElementWrapper.setSelectionRange(0, 0);

        return result;
      },

      setDocShell: function(docshell) {},
      setSelectionModeAndRepaint: function(toggle) {},
      collapseSelection: function(toggle) {},

      searchString: null,
      caseSensitive: false,
      foundLink: null,
      foundEditable: null,
      currentWindow: null
    };
  }

  let codeElementWrapper = {
    get value() {
      return codeE.value;
    },

    set value(v) {
      codeE.value = v;
    },

    setSelectionRange: function(start, end)
    {
      codeE.setSelectionRange(start, end);
    },

    focus: function()
    {
      codeE.focus();
    },

    get selectionStart() {
      return codeE.selectionStart;
    },

    get selectionEnd() {
      return codeE.selectionEnd;
    },

    get scrollTop() {
      return this.scrollElement.scrollTop;
    },

    set scrollTop(t) {
      this.scrollElement.scrollTop = t;
    },

    get scrollElement() {
      return codeE.inputField;
    }

  };

  function initFinder()
  {
    let findBar = document.getElementById("findbar");
    //if findbar gone or not using new search
    let pref = scCommon.prefs.getBoolPref("custom.newsearch");
    //don't add findbar unless using new search
    if (!findBar && pref == true){
      let findTemp = document.createElement("findbar");
      findTemp.setAttribute("id","findbar");
      findTemp.setAttribute("browserid","internal-code");
      let searchArea = document.getElementById("SearchArea");
      if (searchArea)
        searchArea.appendChild(findTemp);
      findTemp.removeAttribute("hidden");
      findBar = findTemp;
    } else if (!findBar || pref == false)
      return;
    if (finderJsmStyle) {
      let editor = document.getElementById("internal-code");
      editor.finder = finder;
      try {
        findBar.browser = editor;
      } catch(e) {/*always fails?*/}
    } else
      document.getElementById("internal-code").fastFind = finder;

    findBar._findField.value = "";

    findBar.open();

    // On the find bar, swallow any enter keypresses that would close the dialog
    findBar.addEventListener("keypress", function(event) {
      if (event.keyCode == 13) {
        // why this is different, i don't know
        if (!finderJsmStyle)
          event.target._findAgain();
        event.preventDefault();
      }
    }, false);

  }

// if the style we're editing has been changed, turn off preview
let changeObserver = {
  observe: function(subject, topic, data)
  {
    if (subject.id == style.id) {
      // unapply any preview and get our internal style object in sync with the changes
      style.setPreview(false);
      style.code = subject.code;
      style.enabled = subject.enabled;
    }
  }
};
Services.obs.addObserver(changeObserver, "stylish-style-change", false);

// if the style we're editing has been deleted, turn off preview and close the window
let deleteObserver = {
  observe: function(subject, topic, data)
  {
    if (subject.id == style.id) {
      style.enabled = false;
      style.setPreview(false);
      // just so the user is not prompted to save
      saved = true;
      window.close();
    }
  }
};
Services.obs.addObserver(deleteObserver, "stylish-style-delete", false);

// Closing by closing the window (e.g. pressing the X when in windowed mode) doesn't fire beforeunload. Cancel the close event and close it ourselves so beforeunload runs.
window.addEventListener("close",function(event) {
  event.preventDefault();
  window.close();
},false);

window.addEventListener("unload",function(event) {
  //turn off preview!
  style.setPreview(false);
  if (initialCode != codeElementWrapper.value)
    style.revert();
},false);

//window.addEventListener("load", init);
