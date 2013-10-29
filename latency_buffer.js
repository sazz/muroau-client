/**
 * Created by SazzSomewhere on 28.10.13.
 */
function calculateLatency(milliSeconds) {
    return Math.abs(milliSeconds * 44.1 * 2 * 2);
}

var LatencyBuffer = function(initialLatency, targetStream) {
    this.maxLatency = 10000;
    this.bufferSize = calculateLatency(this.maxLatency);
    this.buffer = new Buffer(this.bufferSize);
    this.buffer.fill(0);
    this.writePos = calculateLatency(1000);
    this.readPos = 0;
    this.targetStream = targetStream;
    this.latency = initialLatency;
};

LatencyBuffer.prototype.setLatency = function(newLatency) {
    var latencyBuffer = new Buffer(calculateLatency(newLatency));
    latencyBuffer.fill(0);
    this.writePos = this.readPos;
    this.writeToBuffer(latencyBuffer);
    this.latency = newLatency;
};

LatencyBuffer.prototype.getLatency = function() {
    return this.latency;
}

LatencyBuffer.prototype.write = function(data) {
    this.writeToBuffer(data);
    var targetData = this.readFromBuffer(data.length);
    this.targetStream.write(targetData);
};

LatencyBuffer.prototype.writeToBuffer = function(data) {
    var dataLength = data.length;
    var bufferToEnd = this.bufferSize - this.writePos;
    if (dataLength <= bufferToEnd) {
        data.copy(this.buffer, this.writePos);
        this.writePos += dataLength;
    } else {
        var firstPart = bufferToEnd;
        var lastPart = dataLength - firstPart;
        console.log('readPos: ' + this.readPos + ' writePos: ' + this.writePos + ' firstPart: ' + firstPart + ' lastPart: ' + lastPart + ' dataLength: ' + dataLength + ' bufferSize: ' + this.bufferSize + ' bufferToEnd: ' + bufferToEnd);
        data.copy(this.buffer, this.writePos, 0, firstPart);
        data.copy(this.buffer, 0, firstPart, dataLength);
        this.writePos = lastPart;
    }
};

LatencyBuffer.prototype.readFromBuffer = function(dataLength) {
    var bufferToEnd = this.bufferSize - this.readPos;
    var targetBuffer = new Buffer(dataLength);
    if (dataLength <= bufferToEnd) {
        this.buffer.copy(targetBuffer, 0, this.readPos, this.readPos + dataLength);
        this.readPos += dataLength;
    } else {
        var firstPart = bufferToEnd;
        var lastPart = dataLength - firstPart;
        this.buffer.copy(targetBuffer, 0, this.readPos, this.readPos + firstPart);
        this.buffer.copy(targetBuffer, firstPart, 0, lastPart);
        this.readPos = lastPart;
    }
    return targetBuffer;
};

module.exports = LatencyBuffer;