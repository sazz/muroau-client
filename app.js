/**
 * Created by SazzSomewhere on 23.10.13.
 */
var PORT = 10101;
var HOST = '0.0.0.0';
var dgram = require('dgram');
var client = dgram.createSocket('udp4');
var Speaker = require('speaker');
var LatencyBuffer = require('./latency_buffer.js');
var ioClient = require('socket.io-client');

var controlHost = '192.168.1.150';
var controlPort = 4666;

var speaker = new Speaker({
       channels: 2,
        bitDepth: 16,
        sampleRate: 44100
});

client.on('listening', function () {
    var address = client.address();
    console.log('UDP Client listening on ' + address.address + ":" + address.port);
    client.setBroadcast(true)
    client.setMulticastTTL(128);
    client.setMulticastLoopback(true);
//    client.addMembership('230.185.192.108',HOST);
});

var bufferStream = new LatencyBuffer(200, speaker);

client.on('message', function (data, remote) {
    bufferStream.write(data);
});

client.bind(PORT, HOST);


var controlSocket = null;

socketOptions = {
    "transports" : [ "websocket" ],
    "try multiple transports" : false,
    "reconnect" : false,
    'force new connection': true, // <-- Add this!
    "connect timeout" : 5000
};

function createControlSocket() {
    console.log('[CONTROL] connecting to control host ' + controlHost + ':' + controlPort);
    controlSocket = ioClient.connect('ws://' + controlHost + ':' + controlPort, socketOptions);
    controlSocket.on('connect', function () {
        console.log('[CONTROL] connected');
        //socket.emit('set nickname', prompt('What is your nickname?'));
        socket.on('set_latency', function(data) {
            console.log('[CONTROL] setting latency to ' + data);
            bufferStream.setLatency(data);
        });
        socket.on('listen_on', function(data) {
            console.log('[CONTROL] listening on ' + data);
            if ((listening == null) && (client != null)) {
                client.addMembership(data, HOST);
                listening = data;
            }
        });
        socket.on('listen_off', function(data) {
            console.log('[CONTROL] stop listening');
            if (listening != null) {
                client.dropMembership(listening, HOST);
                listening = null;
            }
        });
        socket.on('ready', function () {
            console.log('[CONTROL] connection ready');
        });
    });

    controlSocket.on('disconnect', function() {
        console.log('[CONTROL] disconnected');
        reconnectControlSocket();
    });

    controlSocket.on('error', function() {
        reconnectControlSocket();
    });
};


function reconnectControlSocket() {
    setTimeout(function() {
        createControlSocket();
    }, 2500);
};

createControlSocket();
