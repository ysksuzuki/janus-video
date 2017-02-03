goog.provide('janus.video.Room');
goog.provide('janus.video.FeedConnection');
goog.provide('janus.video.makeRoom');

goog.require('goog.dom');
goog.require('goog.ui.Zippy');

janus.video.makeRoom = function(janusConfig) {
    return new janus.video.Room(janusConfig);
};


janus.video.Room = function(janusConfig) {
    this.janus = null;
    this.startMuted = false;
    this.subscribeToFeeds = null;

    if (janusConfig.janusServer) {
        this.server = janusConfig.janusServer;
    } else {
        this.server = this.defaultJanusServer_()
    }

    if (janusConfig.janusServerSSL) {
        this.server = janusConfig.janusServerSSL;
    }

    if (janusConfig.janusDebug) {
        this.janusDebug = janusConfig.janusDebug;
    }

    if (janusConfig.joinUnmutedLimit) {
        this.joinUnmutedLimit = janusConfig.joinUnmutedLimit;
    }
    this.connect_();
    this.enter_("Kotaro");
};

janus.video.Room.prototype.defaultJanusServer_ = function() {
    var wsProtocol = 'ws:';
    var wsPort = '8188';
    return [
        wsProtocol + '//' + window.location.hostname + ':' + wsPort + '/janus/',
        window.location.protocol + '//' + window.location.hostname + '/janus/'
    ];
};

janus.video.Room.prototype.connect_ = function() {
    if (this.janus === null) {
        Janus.init({debug: this.janusDebug});
        this.janus = new Janus({
            server: this.server,
            success: function () {
            },
            error: function (error) {
                var msg = "Janus error: " + error;
                msg += "\nDo you want to reload in order to retry?";
                if (window.confirm(msg)) {
                    window.location.reload();
                }
            },
            destroyed: function () {
                console.log("Janus object destroyed");
            }
        });
    }
};

janus.video.Room.prototype.enter_ = function(username) {
    // Create new session
    this.janus.attach({
        plugin: "janus.plugin.videoroom",
        success: function(pluginHandle) {
            // Step 1. Right after attaching to the plugin, we send a
            // request to join
            this.connection = new janus.video.FeedConnection(pluginHandle, this.room.id, "main");
            this.connection.register(username);
        },
        error: function(error) {
            console.error("Error attaching plugin... " + error);
        },
        consentDialog: function(on) {
            console.log("Consent dialog should be " + (on ? "on" : "off") + " now");
            //$$rootScope.$broadcast('consentDialog.changed', on);
            if(!on){
                //notify if joined muted
                if (this.startMuted) {
                    //$$rootScope.$broadcast('muted.Join');
                }
            }
        },
        ondataopen: function() {
            console.log("The publisher DataChannel is available");
            this.connection.onDataOpen();
        },
        onlocalstream: function(stream) {
            // Step 4b (parallel with 4a).
            // Send the created stream to the UI, so it can be attached to
            // some element of the local DOM
            console.log(" ::: Got a local stream :::");
        },
        oncleanup: function () {
            console.log(" ::: Got a cleanup notification: we are unpublished now :::");
        },

        onmessage: function (msg, jsep) {
            var event = msg.videoroom;
            console.log("Event: " + event);

            var _connection = this.connection;
            // Step 2. Response from janus confirming we joined
            if (event === "joined") {
                console.log("Successfully joined room " + msg.room);
                // Step 3. Establish WebRTC connection with the Janus server
                // Step 4a (parallel with 4b). Publish our feed on server

                if (this.joinUnmutedLimit !== undefined && this.joinUnmutedLimit !== null) {
                    this.startMuted = (msg.publishers instanceof Array) && msg.publishers.length >= this.joinUnmutedLimit;
                }

                this.connection.publish({
                    muted: this.startMuted,
                    error: function() { _connection.publish({noCamera: true, muted: this.startMuted}); }
                });

                // Step 5. Attach to existing feeds, if any
                if ((msg.publishers instanceof Array) && msg.publishers.length > 0) {
                    this.subscribeToFeeds(msg.publishers, this.room.id);
                }
                // The room has been destroyed
            } else if (event === "destroyed") {
                console.log("The room has been destroyed!");
                //$$rootScope.$broadcast('room.destroy');
            } else if (event === "event") {
                // Any new feed to attach to?
                if ((msg.publishers instanceof Array) && msg.publishers.length > 0) {
                    this.subscribeToFeeds(msg.publishers, that.room.id);
                    // One of the publishers has gone away?
                } else if(msg.leaving !== undefined && msg.leaving !== null) {
                    var leaving = msg.leaving;
                    //ActionService.destroyFeed(leaving);
                    // One of the publishers has unpublished?
                } else if(msg.unpublished !== undefined && msg.unpublished !== null) {
                    var unpublished = msg.unpublished;
                    //ActionService.destroyFeed(unpublished);
                    // Reply to a configure request
                } else if (msg.configured) {
                    this.connection.confirmConfig();
                    // The server reported an error
                } else if(msg.error !== undefined && msg.error !== null) {
                    console.log("Error message from server" + msg.error);
                    //$$rootScope.$broadcast('room.error', msg.error);
                }
            }

            if (jsep !== undefined && jsep !== null) {
                this.connection.handleRemoteJsep(jsep);
            }
        }
    });

};

janus.video.FeedConnection = function (pluginHandle, roomId, role) {
    this.pluginHandle = pluginHandle;
    this.role = role || "subscriber";
    this.isDataOpen = false;
    this.config = null;
    this.roomId = roomId;
    console.log(this.role + " plugin attached (" + pluginHandle.getPlugin() + ", id=" + pluginHandle.getId() + ")");
};


janus.video.FeedConnection.prototype.destroy = function() {
    this.config = null;
    this.pluginHandle.detach();
};

janus.video.FeedConnection.prototype.register = function(display) {
    var register = { "request": "join", "room": this.roomId, "ptype": "publisher", "display": display };
    this.pluginHandle.send({"message": register});
};

janus.video.FeedConnection.prototype.listen = function(feedId) {
    var listen = { "request": "join", "room": this.roomId, "ptype": "listener", "feed": feedId };
    this.pluginHandle.send({"message": listen});
};

janus.video.FeedConnection.prototype.handleRemoteJsep = function(jsep) {
    this.pluginHandle.handleRemoteJsep({jsep: jsep});
};

janus.video.FeedConnection.prototype.sendData = function(data) {
    this.pluginHandle.data(data);
};

/**
 * Negotiates WebRTC by creating a webRTC offer for sharing the audio and
 * (optionally) video with the janus server. The audio is optionally muted.
 * On success (the stream is created and accepted), publishes the corresponding
 * feed on the janus server.
 *
 * @param {object} options - object with the noCamera boolean flag, muted boolean flag,
 * and some callbacks (success, error)
 */
janus.video.FeedConnection.prototype.publish = function(options) {
    options = options || {};

    var media = {videoRecv: false, audioRecv: false};
    var cfg = {video: true, audio: true};
    if (this.role === "main") {
        if (options.muted){
            cfg.audio = false;
        }
        if (options.noCamera) {
            media.videoSend = false;
            cfg.video = false;
        } else {
            media.videoSend = true;
        }
        media.audioSend = true;
        media.data = true;
    } else {
        // Publishing something but not "main" -> screen sharing
        cfg.audio = false;
        media.video = this.role;
        media.audioSend = false;
        media.data = false;
    }
    var _pluginHandle = this.pluginHandle;
    this.pluginHandle.createOffer({
        media: media,
        success: function(jsep) {
            console.log("Got publisher SDP!");
            console.log(jsep);
            this.config = new janus.video.ConnectionConfig(_pluginHandle, cfg, jsep);
            // Call the provided callback for extra actions
            if (options.success) { options.success(); }
        },
        error: function(error) {
            console.error("WebRTC error publishing");
            console.error(error);
            // Call the provided callback for extra actions
            if (options.error) { options.error(); }
        }
    });
};

/**
 * Negotiates WebRTC by creating a WebRTC answer for subscribing to
 * to a feed from the janus server.
 */
janus.video.FeedConnection.prototype.subscribe = function(jsep) {
    var _pluginHandle = this.pluginHandle;
    this.pluginHandle.createAnswer({
        jsep: jsep,
        media: {
            audioSend: false,
            videoSend: false,
            data: true
        },
        success: function(jsep) {
            console.log("Got SDP!");
            console.log(jsep);
            var start = { "request": "start", "room": this.roomId };
            _pluginHandle.send({message: start, jsep: jsep});
        },
        error: function(error) {
            console.error("WebRTC error subscribing");
            console.error(error);
        }
    });
};

/**
 * Sets the configuration flags
 *
 * @param {object} options - object containing
 *        * values: object with the wanted values for the flags
 *        * ok: callback to execute on confirmation from Janus
 */
janus.video.FeedConnection.prototype.setConfig = function(options) {
    if (this.config) {
        this.config.set(options);
    } else {
        this.config = new janus.video.ConnectionConfig(this.pluginHandle, options.values, null, options.ok);
    }
};


/**
 * Gets the configuration flags
 *
 * @returns {object} values of the audio and video flags
 */
janus.video.FeedConnection.prototype.getConfig = function() {
    if (this.config) {
        return this.config.get();
    }
};

/**
 * Processes the confirmation (received from Janus) of the ongoing
 * config request
 */
janus.video.FeedConnection.prototype.confirmConfig = function() {
    if (this.config) {
        return this.config.confirm();
    }
};

/**
 * Handler for the ondataopen event
 */
janus.video.FeedConnection.prototype.onDataOpen = function() {
    this.isDataOpen = true;
};

janus.video.ConnectionConfig = function(pluginHandle, wantedInit, jsep, ok) {
    this.current = {};
    this.requested = null;
    this.wanted = {audio: true, video: true};
    this.okCallback = null;
    //_.assign(wanted, wantedInit);
    // Initial configure
    this.configure_({jsep: jsep, ok: ok});
};

/**
 * Gets the current value of the configuration flags
 *
 * @returns {object} values of the audio and video flags
 */
janus.video.ConnectionConfig.prototype.get = function() {
    return current;
};

/**
 * Sets the desired value of the configuration flags.
 *
 * It sends a configure request to the Janus server to sync the values
 * if needed (and updates the local representation according).
 *
 * @param {object} options - object containing
 *        * values: object with the wanted values for the flags
 *        * ok: callback to execute on confirmation from Janus
 */
janus.video.ConnectionConfig.prototype.set = function(options) {
    options = options || {};
    options.values = options.values || {};
    var oldWanted = {};
    //_.assign(oldWanted, current, wanted);
    //_.assign(wanted, current, options.values);

    if (requested === null && this.differsFromWanted_(oldWanted)) {
        this.configure_({ok: options.ok});
    }
};

/**
 * Processes the confirmation (received from Janus) of the ongoing
 * config request
 */
janus.video.ConnectionConfig.prototype.confirm = function() {
    setTimeout(function() {
        if (this.requested === null) {
            console.error("I haven't sent a config. Where does this confirmation come from?");
        } else {
            this.current = this.requested;
            this.requested = null;
            console.log("Connection configured", current);
            if (this.okCallback) { this.okCallback(); }
            if (this.differsFromWanted_(this.current)) {
                this.configure_();
            }
        }
    });
};

janus.video.ConnectionConfig.prototype.differsFromWanted_ = function(obj) {
    return (obj.video !== this.wanted.video || obj.audio !== this.wanted.audio);
};

janus.video.ConnectionConfig.prototype.configure_ = function(options) {
    options = options || {};
    var config = {request: "configure"};
    this.requested = {};

    //_.assign(this.requested, this.current, wanted);
    //_.assign(config, this.requested);

    var _okCallback = this.okCallback;
    var _requested = this.requested;
    this.pluginHandle.send({
        "message": config,
        jsep: options.jsep,
        success: function() {
            _okCallback = options.ok;
        },
        error: function() {
            _requested = null;
            console.error("Config request not sent");
        }
    });
};
