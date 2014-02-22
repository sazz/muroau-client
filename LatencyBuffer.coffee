stream = require('stream')

class LatencyBuffer extends stream.Readable
  constructor: (@initialLatency, @targetStream) ->
    stream.Readable.call(@)
    @maxLatency = 300000
    @bufferSize = @calculateLatency(@maxLatency)
    @buffer = new Buffer(@bufferSize)
    @buffer.fill(0)
    @writePos = @calculateLatency(1000)
    @readPos = 0
    console.log "targetStream: #{@targetStream}"
    @pipe(@targetStream)
    @latency = initialLatency;

  calculateLatency: (milliSeconds) ->
    value = Math.round(milliSeconds * 44.1 * 2 * 2)
    value - (value % 4)

  read: (size) ->
    size = 176400 if !size
    console.log "reading size #{size}"
    return @readFromBuffer(size)

  setLatency: (newLatency) ->
    latencyBuffer = new Buffer(@calculateLatency(newLatency))
    latencyBuffer.fill(0)
    @writePos = @readPos
    @writeToBuffer(latencyBuffer)
    @latency = newLatency

  getLatency: () -> @latency

  write: (data) ->
    @writeToBuffer(data)
    targetData = @readFromBuffer(data.length)

  writeToBuffer: (data) ->
    console.log("writing to buffer #{data.length} #{@writePos}")
    dataLength = data.length
    bufferToEnd = @bufferSize - @writePos
    if (dataLength <= bufferToEnd)
      data.copy(@buffer, @writePos)
      @writePos += dataLength
    else
      firstPart = bufferToEnd
      lastPart = dataLength - firstPart
      console.log "readPos: #{@readPos} writePos: #{@writePos} firstPart: #{firstPart} lastPart: #{lastPart} dataLength: #{dataLength} bufferSize: #{@bufferSize} bufferToEnd: #{bufferToEnd}"
      data.copy(@buffer, @writePos, 0, firstPart)
      data.copy(@buffer, 0, firstPart, dataLength)
      @writePos = lastPart

  readFromBuffer: (dataLength) ->
    console.log "readPos: #{@readPos}"
    bufferToEnd = @bufferSize - @readPos
    targetBuffer = new Buffer(dataLength)
    if (dataLength <= bufferToEnd)
      @buffer.copy(targetBuffer, 0, @readPos, @readPos + dataLength)
      @readPos += dataLength
    else
      firstPart = bufferToEnd
      lastPart = dataLength - firstPart
      console.log "splitting to #{firstPart} and #{lastPart} by buffer size #{@bufferSize} and readPos #{@readPos}"
      @buffer.copy(targetBuffer, 0, @readPos, @readPos + firstPart)
      @buffer.copy(targetBuffer, firstPart, 0, lastPart)
      @readPos = lastPart
    targetBuffer

module.exports = LatencyBuffer