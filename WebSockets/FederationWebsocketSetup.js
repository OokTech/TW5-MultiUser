/*\
title: $:/plugins/OokTech/Bob/FederationWebsocketSetup.js
type: application/javascript
module-type: syncadaptor

A sync adaptor module for synchronising using Websockets

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.platforms = ["node"];

if($tw.node) {

  $tw.Bob = $tw.Bob || {};
  $tw.nodeMessageHandlers = $tw.nodeMessageHandlers || {};
  $tw.federationMessageHandlers = $tw.federationMessageHandlers || {};
  $tw.settings['fed-wss'] = $tw.settings['fed-wss'] || {};
  $tw.remoteConnections = $tw.remoteConnections || {};

  const URL = require('url');

  function authenticateMessage() {
    return true
  }

  $tw.Bob.handleFederationMessage = function (event) {
    let self = this;
    console.log(Object.keys($tw.federatedConnections))
    console.log('this',this.url)
    try {
      let eventData = JSON.parse(event);
      if (this.url) {
        const thisURL = URL.parse(this.url);
        eventData._source_info = {
          address: thisURL.hostname,
          port: thisURL.port
        };
      } else {
        eventData._source_info = this._socket._peername;
      }
      if (typeof $tw.remoteConnections[`${eventData._source_info.address}:${eventData._sou_source_info.port}`] === 'undefined') {
        $tw.remoteConnections[`${eventData._source_info.address}:${eventData._sou_source_info.port}`] = {socket: this}
      }
      // Make sure we have a handler for the message type
      if(typeof $tw.federationMessageHandlers[eventData.type] === 'function') {
        // Check authorisation
        const authorised = authenticateMessage(eventData);
        if(authorised) {
          eventData.decoded = authorised;
          $tw.federationMessageHandlers[eventData.type](eventData);
        }
      } else {
        $tw.Bob.logger.error('No handler for federation message of type ', eventData.type, {level:3});
      }
    } catch (e) {
      $tw.Bob.logger.error("Federation WebSocket error: ", e, {level:1});
    }
  }

  const setup = function () {
    // require the websockets module if we are running node
    const WebSocketServer = require('$:/plugins/OokTech/Bob/External/WS/ws.js').Server;
    /*
      Setup the websocket server if we aren't using an external one
    */
    function finishSetup () {
      $tw.settings['fed-wss'] = $tw.settings['fed-wss'] || {};
      if(!$tw.settings['fed-wss'].useExternalWSS) {
        $tw.federationWss = new WebSocketServer({noServer: true});
        // Set the onconnection function
        $tw.federationWss.on('connection', handleConnection);
        // I don't know how to set up actually closing a connection, so this
        // doesn't do anything useful yet
        $tw.federationWss.on('close', function(connection) {
          $tw.Bob.logger.log('closed remote connection ', connection, {level:2});
        });
      }
    }

    function handleConnection (client, request) {
      $tw.Bob.logger.log("New Remote Connection", {level: 2})
      //$tw.remoteConnections[request.connection.remoteAddress] = {socket: client}
      client.on('message', $tw.Bob.handleFederationMessage)
    }

    finishSetup();
  }
  setup()
}

})();