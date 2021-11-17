const assert = require('assert');
const fs = require('fs');
const path = require('path');
const OnlineConf = require('../dist/onlineconf');

const TEST_DATA_DIR = './tests/data';

describe('Onlineconf', () => {

    describe('create instance', () => {

        it('simple', () => {
            let onlineconf = new OnlineConf.OnlineConf('test', {
                rootDir: TEST_DATA_DIR
            });

            assert.equal(onlineconf instanceof OnlineConf.OnlineConf, true);
        });

        it('isTest', () => {
            let onlineconf = new OnlineConf.OnlineConf('test', {
                rootDir: TEST_DATA_DIR,
                isTest: true
            });

            assert.deepEqual(onlineconf.getConfig(), {});
        });

        it('without eof', (done) => {
            try {
                new OnlineConf.OnlineConf('test-without-eof', {
                    rootDir: TEST_DATA_DIR
                });
            } catch (err) {
                assert.equal(err.message, 'OnlineConf file is not finished with #EOF');
                done();
            }
        });

        it('fail-json', () => {
            let onlineconf = new OnlineConf.OnlineConf('test-fail-json', {
                rootDir: TEST_DATA_DIR
            });

            assert.deepEqual(onlineconf.getConfig(), {'/foo/bar': 'foobar'});
        });

        it('watched', (done) => {
            let filename = 'test-watched',
                onlineconf;

            if (!fs.existsSync('./.tmp')) {
                fs.mkdirSync('./.tmp')
            }

            fs.writeFile(`./.tmp/${filename}.conf`, '/foo/bar foobar\n#EOF', (err) => {
                onlineconf = new OnlineConf.OnlineConf(filename, {
                    rootDir: './.tmp'
                });

                assert.equal(onlineconf.get('/bar/foo'), undefined);

                onlineconf.on('reload', () => {
                    assert.equal(onlineconf.get('/bar/foo'), 'barfoo');
                    done();
                });

                fs.writeFile(`./.tmp/${filename}.conf`, '/foo/bar foobar\n/bar/foo barfoo\n#EOF', (err) => {
                    if (err) {
                        console.log(err);
                    }
                });
            });
        });

    });

    it('#getConfig()', (done) => {
        let onlineconf = new OnlineConf.OnlineConf('test', {
            rootDir: TEST_DATA_DIR
        });

        fs.readFile(path.resolve(TEST_DATA_DIR, 'test.conf'), (err, data) => {
            let config = {};

            data.toString()
                .split('\n')
                .filter((item) => item !== '#EOF')
                .forEach((item) => {
                    if (item.match(/^\s*(\S+)\s+(.+)$/)) {
                        let parts = item.split(' '),
                            key = parts[0],
                            value = parts.slice(1).join(' ').replace(/\\n/g, '\n').replace(/\\r/g, '\r');

                        if (key.match(/:JSON$/)) {
                            key = key.replace(/:JSON$/, '');
                            value = JSON.parse(value);
                        }

                        if (value) {
                            config[key] = value;
                        }
                    }
                });

            assert.deepEqual(config, onlineconf.getConfig());
            assert.equal(onlineconf.getConfig()['/bar/foo/baz/qux'], 'bar\nfoo\n\rbaz\r\nqux');

            done();
        });
    });

    it('#reload()', (done) => {
        let filename = 'test-reload',
            onlineconf;

        if (!fs.existsSync('./.tmp')) {
            fs.mkdirSync('./.tmp')
        }

        fs.writeFile(`./.tmp/${filename}.conf`, '/foo/bar foobar\n#EOF', (err) => {
            onlineconf = new OnlineConf.OnlineConf(filename, {
                rootDir: './.tmp',
                isEnableWatch: false
            });

            fs.writeFile(`./.tmp/${filename}.conf`, '/foo/bar foobar\n/bar/foo barfoo\n#EOF', (err) => {
                assert.equal(onlineconf.get('/bar/foo'), undefined);

                onlineconf.on('reload', () => {
                    assert.equal(onlineconf.get('/bar/foo'), 'barfoo');
                    done();
                });

                onlineconf.reload();
            });
        });

    });

    it('#reloadSync()', (done) => {
        let filename = 'test-mutable',
            onlineconf;

        if (!fs.existsSync('./.tmp')) {
            fs.mkdirSync('./.tmp')
        }

        fs.writeFile(`./.tmp/${filename}.conf`, '/foo/bar foobar\n#EOF', (err) => {
            onlineconf = new OnlineConf.OnlineConf(filename, {
                rootDir: './.tmp',
                isEnableWatch: false
            });

            fs.writeFile(`./.tmp/${filename}.conf`, '/foo/bar foobar\n/bar/foo barfoo\n#EOF', (err) => {
                assert.equal(onlineconf.get('/bar/foo'), undefined);

                onlineconf.reloadSync();

                assert.equal(onlineconf.get('/bar/foo'), 'barfoo');

                done();
            });
        });

    });

    it('#set()', () => {
        let onlineconf = new OnlineConf.OnlineConf('test', {
            rootDir: TEST_DATA_DIR
        });

        assert.equal(onlineconf.get('/foo/bar/foo/bar'), undefined);
        onlineconf.set('/foo/bar/foo/bar', 'foobarfoobar');
        assert.equal(onlineconf.get('/foo/bar/foo/bar'), 'foobarfoobar');
    });

    it('#isInited()', () => {
        let onlineconf = new OnlineConf.OnlineConf('test', {
            rootDir: TEST_DATA_DIR
        });

        onlineconf.config = null;

        assert.equal(onlineconf.isInited(), false);
        onlineconf.reloadSync();
        assert.equal(onlineconf.isInited(), true);
    });

    describe('OnlineConf.load()', () => {

        it('first create', (done) => {
            OnlineConf.destroy();
            OnlineConf.load(() => {
                done();
            }, 'test', {
                rootDir: TEST_DATA_DIR
            });
        });

        it('isInited === true', (done) => {
            OnlineConf.load(() => {
                OnlineConf.load(() => {
                    done();
                });
            });
        });

        it('isInited === false', (done) => {
            OnlineConf.load(() => {
                OnlineConf.getInstance().setConfig(null);

                OnlineConf.load(() => {
                    done();
                });

                OnlineConf.getInstance().reload();
            });
        });

    });

    describe('OnlineConf.loadSync()', () => {

        it('first create', () => {
            OnlineConf.destroy();
            OnlineConf.loadSync('test', {
                rootDir: TEST_DATA_DIR
            });
        });

    });

    describe('OnlineConf.get()', () => {

        it('first create', () => {
            OnlineConf.destroy();
            OnlineConf.get('/foo/bar', 'test', {
                rootDir: TEST_DATA_DIR
            });
        });

        it('simple', (done) => {
            OnlineConf.destroy();
            OnlineConf.load(() => {
                assert.equal(OnlineConf.get('/foo/bar'), 'foobar');
                done();
            }, 'test', {
                rootDir: TEST_DATA_DIR
            });
        });

    });

    describe('OnlineConf.set()', () => {

        it('first create', () => {
            let randomStr = Math.random().toString(32).slice(2);

            OnlineConf.destroy();
            OnlineConf.set('/foo/bar/foo/bar', randomStr, 'test', {
                rootDir: TEST_DATA_DIR
            });

            assert.equal(OnlineConf.get('/foo/bar/foo/bar'), randomStr);
        });

        it('simple', (done) => {
            OnlineConf.destroy();
            OnlineConf.load(() => {
                let randomStr = Math.random().toString(32).slice(2);

                OnlineConf.set('/foo/bar/foo/bar', randomStr);

                assert.equal(OnlineConf.get('/foo/bar/foo/bar'), randomStr);
                done();
            }, 'test', {
                rootDir: TEST_DATA_DIR
            });
        });

    });

    describe('OnlineConf.on() && OnlineConf.emit()', () => {

        it('simple', (done) => {
            OnlineConf.destroy();

            OnlineConf.on('test-event', done, 'test', {
                rootDir: TEST_DATA_DIR
            });

            OnlineConf.emit('test-event');
        });

    });

    describe('OnlineConf.initTest()', () => {

        it('first create', () => {
            OnlineConf.destroy();

            OnlineConf.initTest();

            assert.deepEqual(OnlineConf.getInstance().getConfig(), {});
        });

    });

});