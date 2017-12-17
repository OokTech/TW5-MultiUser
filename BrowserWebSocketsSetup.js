/*\
title: $:/plugins/OokTech/MultiUser/BrowserWebSocketsSetup.js
type: application/javascript
module-type: startup

This is the browser component for the web sockets. It works with the node web
socket server, but it can be extended for use with other web socket servers.

\*/
(function () {

  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  // Export name and synchronous status
  exports.name = "web-sockets-setup";
  exports.platforms = ["browser"];
  exports.after = ["render"];
  exports.synchronous = true;

  $tw.browserMessageHandlers = $tw.browserMessageHandlers || {};

  exports.startup = function() {
    // Ensure that the needed objects exist
    $tw.MultiUser = $tw.MultiUser || {};
    $tw.MultiUser.ExcludeList = $tw.MultiUser.ExcludeList || ['$:/StoryList', '$:/HistoryList', '$:/status/UserName', '$:/Import'];

    // Do all actions on startup.
    function setup() {
      $tw.Syncer.isDirty = false;
      var IPTiddler = $tw.wiki.getTiddler("$:/ServerIP");
      var IPAddress = IPTiddler.fields.text;
      $tw.socket = new WebSocket(`ws://${IPAddress}:8081`);
      $tw.socket.onopen = openSocket;
      $tw.socket.onmessage = parseMessage;
      $tw.socket.binaryType = "arraybuffer";

      addHooks();
    }
    /*
      If anything needs to be done to set things up when a socket is opened
      put it in this function
    */
    var openSocket = function() {

    }
    /*
      This is a wrapper function, each message from the websocket server has a
      message type and if that message type matches a handler that is defined
      than the data is passed to the handler function.
    */
    var parseMessage = function(event) {
      var eventData = JSON.parse(event.data);
      // console.log("Event data: ",event.data)
      if (eventData.type) {
        if (typeof $tw.browserMessageHandlers[eventData.type] === 'function') {
          // console.log(Object.keys($tw.browserMessageHandlers))
          $tw.browserMessageHandlers[eventData.type](eventData);
        }
      }
    }

    /*
      This adds actions for the different event hooks. Each hook sends a
      message to the node process.

      Some unused hooks have commented out skeletons for adding those hooks in
      the future if they are needed.
    */
    var addHooks = function() {
      $tw.hooks.addHook("th-editing-tiddler", function(event) {
        // console.log('Editing tiddler event: ', event);
        var message = JSON.stringify({messageType: 'editingTiddler', tiddler: event.tiddlerTitle});
        $tw.socket.send(message);
        // do the normal editing actions for the event
        return true;
      });
      $tw.hooks.addHook("th-cancelling-tiddler", function(event) {
        // console.log("cancel editing event: ",event);
        var message = JSON.stringify({messageType: 'cancelEditingTiddler', tiddler: event.tiddlerTitle});
        $tw.socket.send(message);
        // Do the normal handling
        return event;
      });
      $tw.hooks.addHook("th-renaming-tiddler", function (event) {
        // For some reason this wasn't being handled by the generic 'change'
        // event. So the hook is here.
        console.log('renaming tiddler');
        console.log(event)
      });
      /*
        Listen out for changes to tiddlers
        This handles tiddlers that are edited directly or made using things
        like the setfield widget.
        This ignores tiddlers that are in the exclude list as well as tiddlers
        with titles starting with $:/temp/ or $:/state/
      */
    	$tw.wiki.addEventListener("change",function(changes) {
        Object.keys(changes).forEach(function(tiddlerTitle) {
          if ($tw.MultiUser.ExcludeList.indexOf(tiddlerTitle) === -1 && !tiddlerTitle.startsWith('$:/state/') && !tiddlerTitle.startsWith('$:/temp/')) {
            if (changes[tiddlerTitle].modified) {
              // console.log('Modified/Created Tiddler');
              var tiddler = $tw.wiki.getTiddler(tiddlerTitle);
              var message = JSON.stringify({messageType: 'saveTiddler', tiddler: tiddler});
              $tw.socket.send(message);
            } else if (changes[tiddlerTitle].deleted) {
              // console.log('Deleted Tiddler');
              var message = JSON.stringify({messageType: 'deleteTiddler', tiddler: tiddlerTitle});
              $tw.socket.send(message);
            }
          }
        });
    	});
      /*
        Below here are skeletons for adding new actions to existing hooks.
        None are needed right now but the skeletons may help later.

        Other available hooks are:
        th-importing-tiddler
        th-relinking-tiddler
        th-renaming-tiddler
      */
      /*
        This handles the hook for importing tiddlers.
      */
      /*
      $tw.hooks.addHook("th-importing-tiddler", function (tiddler) {
        return tiddler;
      });
      */
      /*
        For the th-saving-tiddler hook send the saveTiddler message along with
        the tiddler object.
      */
      /*
      $tw.hooks.addHook("th-saving-tiddler",function(tiddler) {
        // do the normal saving actions for the event
        return tiddler;
      });
      */
      /*
        For the th-deleting-tiddler hook send the deleteTiddler message along
        with the tiddler object.
      */
      /*
      $tw.hooks.addHook("th-deleting-tiddler",function(tiddler) {
        // do the normal deleting actions for the event
        return true;
      });
      */
      /*
      $tw.hooks.addHook("th-new-tiddler", function(event) {
        console.log("new tiddler hook: ", event);
        return event;
      })
      $tw.hooks.addHook("th-navigating", function(event) {
        console.log("navigating event: ",event);
        return event;
      })
      */
    }
    // Send the message to node using the websocket
    setup();
  }
})();
