const path    = require('path');
const fs      = require('fs');
const tmp     = require('tmp');
const loader  = require('..');
const YIError = require('../YamlIncludeError.js');


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
    () =>   expect(
                createLoading("simple.yaml")
            ).resolves.toEqual(
                { name: 'simple' }
            )
);

test(
    'with include',
    () =>   expect(
                createLoading("example.yaml")
            ).resolves.toEqual(
                { name: 'example', content: { name: 'simple' } }
            )
);


test(
    'array include',
    () =>   expect(
                createLoading("array.yaml")
            ).resolves.toEqual(
                [{name:'item-1'},{name:'item-2'}]
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


test(
    'not exists throws exception',
    () =>   expect(
                createLoading("not-exists.yaml")
            )
            .rejects.toThrow( YIError )
);

test(
    'broken include throws exception',
    () =>   expect(
                createLoading("broken.yaml")
            )
            .rejects.toThrow( YIError )
);

test(
    'merge',
    () => createLoading("merge.yaml")
            .then(
                res => {
                    // console.log('merge', res);
                    const {name, a, b, c} = res;
                    expect(name).toEqual("merge");
                    expect(a.name).toEqual("simple");
                    expect(a.value).toEqual(false);
                    expect(c.name).toEqual("merge");
                    expect(c.a.name).toEqual("simple");
                }
            )
);

test(
    'relative',
    () => createLoading("./path/to/inner/example.yaml")
            .then(
                res => {
                    expect(res.content.content.content.name).toEqual("simple");
                }
            )
);
