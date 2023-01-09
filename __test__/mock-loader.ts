import * as path                            from 'path';
import type {LoaderState, LoaderOptions}    from 'multi-yaml-loader';


export type LoaderOptionsQuery = {
    options?: LoaderOptions;
    resourceQuery?: string;
}

export class MockLoaderContext implements LoaderState {
    public resourceQuery: string;
    public resourcePath:  string;
    public rootContext:   string;
    public context:       string;
    public query:         any;
    public async: () => (err: Error | null | undefined, res: string | undefined) => void;

    constructor(
        file:     string,
        resolve: (res: string) => void,
        reject:  (err: Error | null | undefined) => void,
        {resourceQuery = '?', options}: LoaderOptionsQuery
    ) {
        this.query         = options || void(0);
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
