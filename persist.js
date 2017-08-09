 /**
 * Copyright 2017 Dean Cording (dean@cording.id.au)
 *
 * A Node Red node for persisting data between deploys and restarts of Node Red.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 **/


"use strict";


module.exports = function(RED) {


    var fs = require("fs-extra");
    var os = require("os");
    var path = require("path");

    function PersistStorageNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        node.filename = n.filename;
        node.interval = n.interval || 10;  // update interval in seconds

        node.dirty = false;

        node.values = {};

        node.intervalId = setInterval( function() {
            node.emit('save');
        }, this.interval * 1000 );

        try {
            nodes.values = fs.readJsonSync(node.filename);
        } catch(err) {
            node.err(err.message);
            node.values = {};
        }


        node.store = function(name,msg) {  // Store new data

            try {
                if (name) {
                    var value = undefined;
                    if (msg != null) {
                        value = msg;
                    }
                    if (node.values[name] != value) {
                        if (value == undefined) {
                            delete node.values[name];
                        } else {
                            node.values[name] = value;
                        }
                        this.dirty = true;
                    }
                } else {
                    node.warn("No name set for message to persist");
                }
            } catch(err) {
                node.error(err.message);
            }

        };

        node.getMessage = function(name) { // Retrieve previous value
            return node.values[name];
        };


        node.save = function() {  // Commit to file
            try {
                fs.outputJsonSyc(node.filename, node.values);
            } catch(err) {
                node.error(err.message);
            }


        };

        node.on('save', function() {
            if (!dirty) return;

            this.save();

        };


        node.on('close', function(removed, done) {
            if (removed) {
                try {
                    // Delete persistence file
                    fs.unlinkSync(node.filename);
                } catch (err) {
                    node.error(err.message);
                }

            } else {
                // Save everything on closing
                this.save();
            }

            done();
        };

    }
    RED.nodes.registerType("persist-store", persistStorageNode);

    // Record data to persist
    function PersistInNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;

        node.name = n.name;
        node.storageNode = RED.nodes.getNode(n.storageNode);

        node.on("input", function(msg) {
            this.storageNode.store(this.name, msg);
        });
    }
    RED.nodes.registerType("persist in",PersistInNode);

    // Replay persisted data
    function PersistOutNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;

        node.name = n.name;
        node.storageNode = RED.nodes.getNode(n.storageNode);

        node.restore = function() {
            var msg = this.storageNode.getMessage(this.name);
            this.send(msg);
        };

        node.on("nodes-started", function() {
            this.restore();
        };

        node.on("input", function(msg) {
            this.restore();
        }

    }
    RED.nodes.registerType("persist out",PersistOutNode);



    RED.httpAdmin.post("/persist/:id", RED.auth.needsPermission("persist.write"), function(req,res) {
        var node = RED.nodes.getNode(req.params.id);
        if (node != null) {
            try {
                node.restore();
                res.sendStatus(200);
            } catch(err) {
                res.sendStatus(500);
                node.error("Restore failed: "+ err.toString());
            }
        } else {
            res.sendStatus(404);
        }
    });


}


