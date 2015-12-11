var fs = require('fs');
var path = require('path');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('onlineconf');

util.inherits(OnlineConf, EventEmitter);

function OnlineConf(filename, callback) {
    EventEmitter.call(this);
    this.filename = path.resolve('/usr/local/etc/onlineconf', filename + '.conf');
    this._initWatcher();
    if (callback) {
        this.once('reload', callback);
        this.reload();
    } else {
        this.reloadSync();
    }
}

OnlineConf.prototype.reload = function () {
    var self = this;
    var stream = fs.createReadStream(this.filename, { encoding: 'utf8' });
    var config = {};
    var tail = '';
    stream.on('data', function (chunk) { tail = self._parse(tail + chunk, config) });
    stream.on('end', function () { self._finalize(tail, config) });
};

OnlineConf.prototype.reloadSync = function () {
    var data = fs.readFileSync(this.filename, { encoding: 'utf8' });
    var config = {};
    var tail = this._parse(data, config);
    this._finalize(tail, config);
};

OnlineConf.prototype._parse = function (chunk, config) {
    var lines = chunk.split(/\r?\n/);
    var tail = lines.pop();
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var m = line.match(/^\s*(\S+)\s+(.+)$/);
        if (m) {
            var key = m[1],
                value = m[2];
            value = value.replace("\\n", "\n").replace("\\r", "\r");
            var m = key.match(/^(.+):JSON$/);
            if (m) {
                key = m[1];
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    continue;
                }
            }
            config[key] = value;
        }
    }
    return tail;
};

OnlineConf.prototype._finalize = function (tail, config) {
    if (tail === "#EOF") {
        debug("config %s reloaded", this.filename);
        this.config = config;
        this.emit('reload', config);
    } else {
        var e = new Error("OnlineConf file is not finished with #EOF");
        this.emit('error', e);
    }
};

OnlineConf.prototype._initWatcher = function () {
    var self = this;
    var basename = path.basename(this.filename);
    fs.watch(path.dirname(this.filename), function (event, filename) {
        if (filename === basename)
            self.reload();
    });
};

OnlineConf.prototype.get = function (path) {
    return this.config[path];
};

var onlineconf;

exports.OnlineConf = OnlineConf;

exports.load = function (callback) {
    if (!onlineconf) {
        onlineconf = new OnlineConf('TREE', callback);
    } else if (onlineconf.config) {
        callback.call(onlineconf);
    } else {
        onlineconf.once('reload', callback);
    }
};

exports.loadSync = function () {
    if (!(onlineconf && onlineconf.config))
        onlineconf = new OnlineConf('TREE');
    return onlineconf;
};

exports.get = function (path) {
    exports.loadSync();
    exports.get = function (path) { return onlineconf.get(path) };
    return exports.get(path);
};

exports.on = function () {
    exports.loadSync();
    onlineconf.on.apply(onlineconf, arguments);
    return onlineconf;
};
