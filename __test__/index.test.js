const path   = require('path');
const fs     = require('fs');
const tmp    = require('tmp');
const loader = require('..');

const TESTS = {
    "simple.yaml":  { name: 'simple' },
    "example.yaml": { name: 'example', content: { name: 'simple' } }
};

function MockLoaderContext (file, resolve, reject) {
    this.resourcePath = path.resolve(__dirname, file);
    this.rootContext  = path.resolve(process.env.INIT_CWD);
    this.context      = path.dirname(this.resourcePath);
    this.async = () => (err, res) => err ? reject(err) : resolve(res);
}


const makeLoadTest = file =>
    new Promise(
        (resolve, reject) => {
            const ctx = new MockLoaderContext(file, resolve, reject);
            loader.call(ctx);
        }
    )
    .then(
        moduleYamlString => {
            const tmpobj = tmp.fileSync();
            fs.writeSync(tmpobj.fd, moduleYamlString);
            const content = require( tmpobj.name );
            return content;
        }
    )
;

Object.entries(TESTS)
    .forEach(
        ([file, value], ti) => {
            test(
                `#${ti + 1}: Test loading ${file}`,
                () => expect( makeLoadTest(file) ).resolves.toEqual(value)
            )
        }
    )
;
