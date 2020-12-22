// Import events module
var events = require('events');
const net = require('net');

/*
*  This class connects to the WebSocket
*  created by the UR in order to access
*  realtime data from the robot through port 30002
*/
class SocketInterface{

    constructor(hostIP, port){

        // Create an eventEmitter object
        this.eventEmitter = new events.EventEmitter();
        
        this._isAlive = false;      // Is socket connection successful?
        this.isRobotOK = true;      // If robot is in protective stop or emergency stop this will be false
        this._isURmoving = false;   // Is robot moving?
        
        console.log('UR3E: Socket trying to connect...');

        this.client = new net.Socket();

        this.client.connect({
            port: port,
            host: hostIP

        }, function () {

            console.log('\x1b[95m%s\x1b[0m', 'UR3E: SOCKET CONNECTION SUCCESSFUL AT ', '\x1b[32m', hostIP, ':', port);
            this._isAlive = true;

        }.bind(this));

        var pack;
        var URindex = 0;
        var TCPindex = 0;
        var URsize = 0;
        this.J = [];

        this.client.on('data', function(data) {

            TCPindex = 0;   // New TCP package, reset TCPindex

            if (URindex => URsize) {
                var val = Object.values(data);
                var first = [58, 98, 140, 180, 222, 263];
                for (var i = 0; i < first.length; i++) {
                    //console.log(val.slice(first[i],first[i]+8));
                    this.J[i] = this.findJoint(val, first[i]);
                    //console.log("J" + (i+1) + ": " + this.J[i]);
                }
                URsize = data.readUIntBE(0, 4);
                pack = Buffer.alloc(URsize);                            // create a new buffer to allocate all the UR packet
                URindex = 0;
            }

            while(TCPindex < data.length){                              // Let's go through all the TCP packet
                pack[URindex] = data[TCPindex];
                URindex++;
                TCPindex++;

                if (URindex === URsize){                                // we reached the end of the UR packet
                    this.processURPacket(pack);
                    URindex = 0;
                    URsize = 0;
                    if (TCPindex > data.length - 4) break;
                    URsize = data.readUIntBE(TCPindex, 4);               // New UR packet
                    pack = Buffer.alloc(URsize);                        // create a new buffer to allocate all the UR packet

                }
            }

        }.bind(this));
        
        this.client.on('error', function(data) {
            this._isAlive = false;
            console.log('\x1b[36m', "UR3E: Could not connect to UR's Server Socket. Is the robot on? ☹");
        }.bind(this));

        const self = this;

    }

    processURPacket(data){

        var type = data[4].toString();  // Type of message

        if (type === '16'){

            var subpackageLength = data.readUIntBE(5, 4);
            var subtype = 0;

            if (subpackageLength > 0){

                subtype = data[9].toString();

                if (subtype === '0'){

                    /*
                    console.log('ROBOT_STATE_PACKAGE_TYPE_ROBOT_MODE_DATA');

                    var isRealRobotConnected = data.readUIntBE(18, 1);
                    console.log('isRealRobotConnected', isRealRobotConnected);

                    var isRealRobotEnabled = data.readUIntBE(19, 1);
                    console.log('isRealRobotEnabled',isRealRobotEnabled);

                    var isRobotPowerOn = data.readUIntBE(20, 1);
                    console.log('isRobotPowerOn', isRobotPowerOn);

                    var isEmergencyStopped = data.readUIntBE(21, 1);
                    console.log('isEmergencyStopped', isEmergencyStopped);

                    var isProtectiveStopped = data.readUIntBE(22, 1);
                    console.log('isProtectiveStopped', isProtectiveStopped);
                    */

                    var isProtectiveStopped = data.readUIntBE(22, 1);   // UR Protective Stop
                    var isEmergencyStopped = data.readUIntBE(21, 1);    // UR Emergency Stop
                    
                    if (isProtectiveStopped || isEmergencyStopped) {
                        if (this.isRobotOK){

                            this.isRobotOK = false;
                            this.eventEmitter.emit('ur_error');
                            
                        }
                    } else {
                        if (!this.isRobotOK){

                            this.isRobotOK = true;
                            this.eventEmitter.emit('ur_ready');

                        }
                    }
                    
                    
                    var isProgramRunning = data.readUIntBE(23, 1);              // This indicates if the robot arm is moving
                    //console.log('isProgramRunning', isProgramRunning);
                    if (!this._isURmoving){
                        if (isProgramRunning === 1){
                            this._isURmoving = true;
                            this.eventEmitter.emit('ur_play');    // Notify indexjs
                        }
                    } else {
                        if (isProgramRunning === 0){
                            this._isURmoving = false;
                            this.eventEmitter.emit('ur_stop');    // Notify indexjs
                        }
                    }

                    /*
                    var isProgramPaused = data.readUIntBE(24, 1);
                    console.log('isProgramPaused', isProgramPaused);

                    var robotMode = data[25].toString();
                    console.log('robotMode', robotMode);

                    var controlMode = data[26].toString();
                    console.log('controlMode', controlMode);

                    var targetSpeedFraction = data.readDoubleBE(26, 8);
                    console.log('targetSpeedFraction', targetSpeedFraction);

                    var speedScaling = data.readDoubleBE(34, 8);
                    console.log('speedScaling', speedScaling);
                     */
                }
            }
        }
    }

    moveURto(x, y, z, rx, ry, rz){

        let s = 'movej(p[' + x.toString() + ', ' + y.toString() + ', ' + z.toString() + ', ' + rx.toString() + ', ' + ry.toString() + ', ' + rz.toString() + '], a=1.0, v=0.1)\n';
        console.log('Send: ', s);
        this.send(s);

    }

    send(data){
        this.client.write(data);
    }

    hex_to_float(hex) {
        var a = parseInt(hex.slice(0,8),16);
        var b = parseInt(hex.slice(8,16),16);
        var e = (a >> 52 - 32 & 0x7ff) - 1023;
        var float = (a & 0xfffff | 0x100000) * 1.0 / Math.pow(2,52-32) * Math.pow(2,e) + b * 1.0 / Math.pow(2,52) * Math.pow(2,3);
        return float
    }

    findJoint(val, first) {
        var angle = '';
        var pos = true;
        for(var i = 0; i < 8; i++) {
            let start = first + i;
            let end = first + 1 + i;
            if (parseInt(val.slice(start,end)) < 16) {
                angle = angle + '0';
            }
            angle = angle + parseInt(val.slice(start, end)).toString(16);
        }
        if (val[first+7] > 127 || val[first+7] == 80) {
            pos = false;
        } 
        if (angle.substr(14,16) == '3f' || angle.substr(14, 16) == '40' || angle.substr(14,16) == 'bf' || angle.substr(14,16) == 'bc' || angle.substr(14,16) == '00' || angle.substr(14,16) == '3c' || angle.substr(14,16) == 'bd') {
            angle = angle.substr(14, 16) + angle.substr(0,14);
        }
        angle = this.hex_to_float(angle)*180/Math.PI;
        if (!pos) {
            angle = -1 * angle;
        }
        return angle
    }

    getJ() {
        return this.J
    }
}

exports.SocketInterface = SocketInterface;

