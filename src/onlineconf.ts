import _ = require('lodash');
import fs = require('fs');
import path = require('path');
import {EventEmitter} from 'events';

export class OnlineConf extends EventEmitter {

    protected config: any;
    protected filename: string;

    constructor(filename: string, options?: any) {
        super();

        options = _.assign({
            rootDir: '/usr/local/etc/onlineconf',
            isEnableWatch: true
        }, options || {});

        if (!options.isTest) {
            this.filename = path.resolve(options.rootDir, filename + '.conf');

            if (options.isEnableWatch) {
                this._initWatcher();
            }

            if (options && options.callback) {
                this.once('reload', options.callback);
                this.reload();
            } else {
                this.reloadSync();
            }
        } else {
            this.config = {};
        }
    }

    getConfig(): any {
        return this.config;
    }

    setConfig(config: any) {
        this.config = config;
    }

    reload() {
        let stream: any = fs.createReadStream(this.filename, {encoding: 'utf8'}),
            config: any = {},
            tail: string = '';

        stream.on('data', (chunk: string) => tail = this._parse(tail + chunk, config));
        stream.on('end', () => this._finalize(tail, config));
    }

    reloadSync() {
        let data: string = fs.readFileSync(this.filename, {encoding: 'utf8'}) || '',
            config: any = {},
            tail: string = this._parse(data.trim(), config);

        this._finalize(tail, config);
    }

    get(path: string): any {
        return this.config[path];
    }

    set(path: string, value: any): OnlineConf {
        this.config[path] = value;

        return this;
    }

    isInited(): boolean {
        return !!this.config;
    }

    protected _parse(chunk: string, config: any): string {
        let lines: string[] = chunk.split(/\r?\n/);
        let tail: string = lines.pop();

        for (let i = 0; i < lines.length; i++) {
            let line: string = lines[i],
                m = line.match(/^\s*(\S+)\s+(.+)$/);

            if (m) {
                let key: string = m[1],
                    value: string = m[2];

                value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
                let mJson: string[] = key.match(/^(.+):JSON$/);

                if (mJson) {
                    key = mJson[1];
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
    }

    protected _finalize(tail: string, config: any) {
        if (tail === '#EOF') {
            this.config = config;
            this.emit('reload', config);
        } else {
            this.emit('error', new Error('OnlineConf file is not finished with #EOF'));
        }
    }

    protected _initWatcher() {
        let basename: string = path.basename(this.filename);

        fs.watch(path.resolve(this.filename), {}, (event: string, filename: string) => {
            if (filename === basename) {
                this.reload();
            }
        });
    }

}

let onlineconf: OnlineConf;

export function load(callback: (...args: any[]) => void, filename?: string, options?: any) {
    if (!onlineconf) {
        onlineconf = new OnlineConf(filename || 'TREE', _.assign({
            callback: callback
        }, options || {}));
    } else if (onlineconf.isInited()) {
        callback.call(onlineconf);
    } else {
        onlineconf.once('reload', callback);
    }
}

export function loadSync(filename?: string, options?: any) {
    if (!onlineconf || !onlineconf.isInited()) {
        onlineconf = new OnlineConf(filename || 'TREE', options);
    }

    return onlineconf;
}

export function get(path: string, filename?: string, options?: any): any {
    if (!onlineconf || !onlineconf.isInited()) {
        loadSync(filename, options);
    }

    return onlineconf.get(path);
}

export function set(path: string, value: any, filename?: string, options?: any) {
    if (!onlineconf || !onlineconf.isInited()) {
        loadSync(filename, options);
    }

    return onlineconf.set(path, value);
}

export function on(eventName: string, handler: Function, filename?: string, options?: any) {
    loadSync(filename, options);

    onlineconf.on.apply(onlineconf, arguments);

    return onlineconf;
}

export function emit() {
    onlineconf.emit.apply(onlineconf, arguments);

    return onlineconf;
}

export function initTest() {
    if (!onlineconf || !onlineconf.isInited()) {
        onlineconf = new OnlineConf(null, {
            isTest: true
        });
    }

    return onlineconf;
}

export function destroy() {
    onlineconf = null;
}

export function getInstance() {
    return onlineconf;
}
