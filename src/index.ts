import { loader }               from 'webpack';
import {OptionObject,
        getOptions, parseQuery} from 'loader-utils';
import * as path                from 'path';
import * as fs                  from 'fs';
import * as YAML                from 'yaml';
import { Type }                 from 'yaml/util';
import type { Schema }          from 'yaml/types';
import type { CST }             from 'yaml/parse-cst';

export type MaybeKeepFiles       = {keepFiles?:      boolean};
export type MaybeKeepFilesRoots  = {keepFilesRoots?: boolean};
export type MaybeHasSpace        = {space?:          boolean};
export type MaybeHasFrom         = {from?:           string};
export type HasRootContext       = {rootContext:     string};
export type LoaderOptions        = OptionObject & MaybeKeepFiles & MaybeKeepFilesRoots & MaybeHasSpace & HasRootContext;
export type LoaderState =
    Pick<loader.LoaderContext, "resourcePath" | "rootContext" | "context" | "resourceQuery"> &
    MaybeHasFrom
;
export type IncDeep    = string | number;
export type IncList    = IncDeep[][];
export type IncMap     = Record<string, IncList>;
export type HasIncMap  = {incs: IncMap;}
export type HasDoc     = {doc:  any;}

export type DocumentObject = HasIncMap & HasDoc & { state: LoaderState; };
export type DocumentsMap = Record<string, DocumentObject>;

const getNStr = (node: YAML.CST.Node, next: YAML.CST.Node): IncDeep | null => {
    const {type} = node;
    let res = null;
    switch (type) {
        case Type.SEQ: {
            const {items} = node as CST.Seq;
            if (items) {
                res = items.indexOf(
                    next as CST.BlankLine |
                            CST.Comment   |
                            CST.SeqItem
                );
            }
        }
        break;
        case Type.MAP:
            const {items} = node as CST.Map;
            if(items){
                let pos = items.indexOf(
                    next as CST.BlankLine |
                            CST.Comment   |
                            CST.Alias     |
                            CST.Scalar    |
                            CST.MapItem
                );
                res = items[pos-1].toString();
            }
        break;
    }
    return res;
}

const traverseCST = (
    acc:   IncDeep[],
    node:  YAML.CST.Node,
    ni:    number,
    arr:   YAML.CST.Node[]
) => {
    const deep = getNStr( node, arr[ni+1] );
    node.type && deep !== null && acc.push(deep);
    return acc;
};

const includeYpath = (cst: YAML.CST.Node) => {
    let cstPath = [cst];

    let parent;
    do {
        parent = cstPath[0]?.context?.parent;
        parent && (cstPath = [parent, ...cstPath]);
    } while (parent);

    let ypath = cstPath.reduce( traverseCST, [] );

    return ypath;
}

export class IncludeError extends Error {
    constructor (err: string, fileName: string) {
        super(`Error in ${fileName}:\n${err}`);
        this.name = 'IncludeError';
    }
}

const defaultOptions = {
    prettyErrors: true,
    keepCstNodes: true,
};

type MaybeNullableStrValue = {
    strValue?: string | null | void
}

const tagInclude = ({incs, context}: HasIncMap & LoaderState): Schema.CustomTag => ({
    identify: () => false,
    tag: '!include',
    resolve: (_doc, cst) => {
        const ypath = includeYpath(cst);
        const {strValue} = cst as MaybeNullableStrValue;
        if (strValue !== null && strValue !== void(0) ) {
            const file = path.join(context, strValue as string);
            incs[file] = incs[file] || [];
            incs[file].push( ypath );
        }
        return null;
    }
});

const multiYamlParse = (cache: LoaderState, content: string) => {
    const incs: IncMap    = {};
    const tagInc  = tagInclude({ ...cache, incs });
    const options: YAML.Options = { ...defaultOptions,  customTags: [ tagInc ]};
    const doc     = YAML.parse( content, options );
    const res     = { doc, incs } ;
    return res;
};

const syncParseYaml = (state: LoaderState): DocumentObject => {
    const content = fs.readFileSync( state.resourcePath,{encoding:'utf8'});
    const result  = multiYamlParse( state, content );
    return {...result, state};
}

const getModulePromise = (state: LoaderState, options: LoaderOptions): Promise<string> =>
    new Promise<DocumentsMap>(
        (resolve, reject) => {
            const fileQueue = [state];
            const results: DocumentsMap = {};
            let cache: LoaderState | void;
            while ( (cache = fileQueue.pop()) ) {
                const {resourcePath} = cache;
                if (!(resourcePath in results)) {
                    try {
                        const result = syncParseYaml(cache);
                        results[resourcePath] = result;
                        Object
                            .keys( result.incs )
                            .forEach(
                                file => {
                                    const add = {
                                        ...state,
                                        resourcePath: file,
                                        from:         (cache as LoaderState).resourcePath,
                                        context:      path.dirname(file)
                                    };
                                    fileQueue.push(add);
                                }
                            )
                        ;
                    } catch (err) {
                        reject(
                            new IncludeError(err, cache.from || cache.resourcePath)
                        );
                    }
                }
            }

            resolve(results);
        }
    )
    .then(
        (results: DocumentsMap): string => {
            const {space} = options;
            const result = JSON.stringify(
                pack(results, state.resourcePath, options),
                null,
                space ? 2 : 0
            );
            console.log( "pack", result);
            return result;
        }
    )
    /*.then(
        (results: DocumentsMap): string => {
            const res = JSON.stringify(
                pack(results, state.resourcePath)
            );
            return res;
        }
    )
    .then(
        packed => `
            $\{ unpack }
            const packed = ${ packed };
            const res = unpack(packed);
            module.exports = res;
        `
    )*/
;


const packIncsReducer = (idByFile: (f: string) => string) => (
    packed: Record<string, IncList>,
    [fileName, incs]: [string, IncList]
): Record <string, IncList> => ({
    ...packed,
    [idByFile(fileName)]: incs
});

const packReducer = (idByFile: (f: string) => string) =>
(
    packed: PackedDocumentsMap,
    [fileName, {doc, incs = {}}]: [string, Packed]
): PackedDocumentsMap => {
    packed[ idByFile(fileName) ] = {
        doc,
        incs: Object.entries(incs).reduce(
            packIncsReducer(idByFile),
            {}
        )
    };
    return packed;
};

type HasRoot = {
    "."?: string
};

type Packed = HasDoc & HasIncMap;
type PackedDocumentsMap = Record<string, Packed> & HasRoot

const getId = (files: string[], {keepFiles, keepFilesRoots, rootContext}: LoaderOptions) => (fileName: string): string =>
    keepFiles
        ? (
            keepFilesRoots
                ? fileName
                : path.normalize(fileName.replace(rootContext, '.') )
        )
        : `${files.indexOf(fileName)}`
;

function pack (data: DocumentsMap, root: string, options: LoaderOptions ): [PackedDocumentsMap, string] {
    const files  = Object.keys(data).sort( f1 => f1 === root ? -1 : 1 );
    const idByFile = getId(files, options);
    const packed = Object.entries(data).reduce(
        packReducer(idByFile), {}
    );
    return [packed, idByFile(root)];
}
/*
function unpack (data: DocumentsMap) {

    const resolveIncs = (docindex = 0, visit: number[] = []) => {
        let res;
        if ( visit.includes(docindex) ) {
            res = data[docindex].doc;
        } else {
            visit.push(docindex);
            const {doc, incs = []} = data[docindex];
            res = incs.reduce(
                (doc: any, {index, incs}: IndexIncsStructure) => {
                    const incdoc = resolveIncs(index, visit);
                    incs.forEach(
                        (inc) => {
                            let ptr = doc;
                            while ( inc.length > 1 ) { ptr = ptr[ inc.shift() ]; }
                            ptr[ inc.shift() ] = incdoc;
                        }
                    );
                    return doc;
                }, doc
            )
        }
        return res;
    };

    const MERGE_KEY = '<<<';

    const isObj = v => v !== null && typeof(v) === 'object' && !Array.isArray(v);

    const resolveMerge = (node, visit = []) => {
        let res;
        if ( visit.includes(node) ){
            res = node;
        } else {
            visit.push(node);
            if ( isObj(node) ) {
                res = Object.entries(node).reduce(
                    (acc, [k, v]) => {
                        if ( k.startsWith(MERGE_KEY) ) {
                            const n = Object.assign(
                                acc,
                                resolveMerge(v, visit)
                            );
                            delete n[k];
                            return n;
                        } else {
                            const n = Object.assign(
                                acc,
                                {[k]: resolveMerge(v, visit)}
                            );
                            return n;
                        }
                    }, node
                );
            } else {
                res = node;
            }
        }

        return res;
    }

    return  resolveMerge(
                resolveIncs()
            );
}*/

const MYLoader = function (this: loader.LoaderContext) {
    const callback = this.async();
    const { resourcePath, rootContext, context, resourceQuery } = this;
    const state: LoaderState = { resourcePath, rootContext, context, resourceQuery };
    if (this.addContextDependency) {
        this.addContextDependency(context);
    }

    const options: LoaderOptions = {
        ...getOptions(this),
        ...parseQuery(this.resourceQuery),
           rootContext
    };

    getModulePromise(state, options)
        .then(
            (result: string) => {
                result && callback
                    ? callback(null, result)
                    : void(0)
            }
        )
        .catch(
            callback
        );
    return;
}


// noinspection JSUnusedGlobalSymbols
export default MYLoader;

