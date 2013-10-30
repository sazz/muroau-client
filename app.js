// ntp

var ntp  = {}
    , offsets = []
    , socket;

ntp.init = function (sock, options) {
    options = options || {};

    socket = sock;
    socket.on('ntp:server_sync', onSync);
    setInterval(sync, options.interval || 1000);
};

var onSync = function (data) {

    var diff = Date.now() - data.t1 + ((Date.now() - data.t0)/2);

    offsets.unshift(diff);

    if (offsets.length > 10)
        offsets.pop();
};


ntp.offset = function () {
    var sum = 0;
    for (var i = 0; i < offsets.length; i++)
        sum += offsets[i];

    sum /= offsets.length;

    return sum;
};


var sync = function () {
    socket.emit('ntp:client_sync', { t0 : Date.now() });
};

// AMD/requirejs
if (typeof define === 'function' && define.amd) {
    define('ntp', [], function () {
        return ntp;
    });
} else {
    root.ntp = ntp;
}


/**
 * Created by SazzSomewhere on 23.10.13.
 */
var dgram = require('dgram');
var client = dgram.createSocket('udp4');
var Speaker = require('speaker');
var LatencyBuffer = require('./latency_buffer.js');
var ioClient = require('socket.io-client');
var config = require('./config.js');


var speaker = new Speaker({
       channels: 2,
        bitDepth: 16,
        sampleRate: 44100
});

client.on('listening', function () {
    var address = client.address();
    console.log('UDP Client listening on ' + address.address + ":" + address.port);
    client.setBroadcast(true);
    client.setMulticastTTL(128);
    client.setMulticastLoopback(true);
//    client.addMembership('230.185.192.108',HOST);
});

var bufferStream = new LatencyBuffer(config.initialLatency, speaker);

client.on('message', function (data) {
    bufferStream.write(data);
});

client.bind(config.streamPort, config.streamHost);


var controlSocket = null;

socketOptions = {
    "transports" : [ "websocket" ],
    "try multiple transports" : false,
    "reconnect" : false,
    'force new connection': true, // <-- Add this!
    "connect timeout" : 5000
};

var listening = null;
var clientToken = Math.random();
var ntpLatency = 0;
var serverLatency = config.initialLatency;

function createControlSocket() {
    console.log('[CONTROL] connecting to control host ' + config.controlHost + ':' + config.controlPort);
    controlSocket = ioClient.connect('ws://' + config.controlHost + ':' + config.controlPort, socketOptions);
    ntp.init(controlSocket);
    controlSocket.on('connect', function () {
        ntpLatency = ntp.offset();
        console.log('[CONTROL] connected');
        controlSocket.emit('welcome', {
            name: config.name,
            clientToken: clientToken
        });
        //socket.emit('set nickname', prompt('What is your nickname?'));
        controlSocket.on('set_latency', function(data) {
            console.log('[CONTROL] setting latency to ' + data);
            if (data.clientToken == clientToken) {
                updateLatency(data.latency);
            }
        });
        controlSocket.on('listen_on', function(data) {
            if (data.clientToken == clientToken) {
                console.log('[CONTROL] listening on ' + data);
                if ((listening == null) && (client != null)) {
                    client.addMembership(data.broadcast, config.streamHost);
                    listening = data;
                }
                updateLatency(serverLatency);
            }
        });
        controlSocket.on('listen_off', function(data) {
            if (data.clientToken == clientToken) {
                console.log('[CONTROL] stop listening ');
                if (listening != null) {
                    client.dropMembership(data.broadcast, config.streamHost);
                    listening = null;
                }
            }
        });
        controlSocket.on('ready', function () {
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
}


function reconnectControlSocket() {
    setTimeout(function() {
        createControlSocket();
    }, 2500);
}

function updateLatency(latency) {
    if (listening == null) {
        return;
    }
    ntpLatency = ntp.offset();
    serverLatency = latency;
    var newLatency = Math.round(serverLatency - ntpLatency);
    if (newLatency < 0) {
        newLatency = 0;
    }
    bufferStream.setLatency(newLatency);
    console.log('[LATENCY] set latency to ' + newLatency);
}

setInterval(function() {
    console.log('[LATENCY] aligning latency via timer');
    updateLatency(serverLatency);
}, 1000 * 120);

createControlSocket();


