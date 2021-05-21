import * as path                            from 'path';
import * as fs                              from 'fs';
import * as tmp                             from 'tmp';
import * as webpack                         from 'webpack';
import Loader                               from 'multi-yaml-loader';
import type {LoaderState, LoaderOptions}    from 'multi-yaml-loader';

import LoaderContext = webpack.loader.LoaderContext;

export class MockLoaderContext implements LoaderState {
    public resourceQuery: string;
    public resourcePath:  string;
    public rootContext:   string;
    public context:       string;
    public async: () => (err: Error | null | undefined, res: string | undefined) => void;

    constructor(
        file:     string,
        resolve: (res: string) => void,
        reject:  (err: Error | null | undefined) => void,
        {resourceQuery = '?'}: LoaderOptionsQuery
    ) {
        this.resourceQuery = resourceQuery;
        this.resourcePath  = path.resolve(__dirname, file);
        this.rootContext   = path.resolve(process.env.INIT_CWD || __dirname);
        this.context       = path.dirname(this.resourcePath);
        this.async = () => (err, res) => {
            err
                ? reject(err)
                : res
                ? resolve(res)
                : reject(new Error('no result'))
        };
    }
}

export type LoaderOptionsQuery = {
    options?: LoaderOptions;
    resourceQuery?: string;
}

export const createLoading = (file: string, options?: LoaderOptionsQuery) =>
    new Promise<string>(
        (resolve, reject) => {
            const ctx = new MockLoaderContext(file, resolve, reject, options || {});
            Loader.call(ctx as LoaderContext);
        }
    )
        .then(
            (moduleYamlString: string): any => {
                const tmpobj = tmp.fileSync();
                fs.writeSync(tmpobj.fd, moduleYamlString);
                const content: any = require(tmpobj.name);
                //expect('').toEqual( true );
                return content;
            }
        )
;