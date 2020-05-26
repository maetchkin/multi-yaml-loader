const path   = require('path');
const fs     = require('fs');
const tmp    = require('tmp');
const loader = require('..');

function MockLoaderContext (file, resolve, reject) {
    this.resourcePath = path.resolve(__dirname, file);
    this.rootContext  = path.resolve(process.env.INIT_CWD);
    this.context      = path.dirname(this.resourcePath);
    this.async = () => (err, res) => err ? reject(err) : resolve(res);
}

const createLoading = file =>
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

test(
    'no include',
    () => expect(
            createLoading("simple.yaml")
          ).resolves.toEqual(
              { name: 'simple' }
          )
);

test(
    'with include',
    () => expect(
            createLoading("example.yaml")
          ).resolves.toEqual(
              { name: 'example', content: { name: 'simple' } }
          )
);

test(
    'cycle include',
    () => createLoading("cycle.yaml")
        .then(
            res => {
                expect(res === res.self).toEqual(true);
            }
        )

);
