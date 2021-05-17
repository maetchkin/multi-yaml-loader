/// <reference types="node" />
/// <reference types="@types/webpack" />

import { loader }       from 'webpack';
import * as path        from 'path';
import * as fs          from 'fs';
import * as YAML        from 'yaml';
import { Type }         from 'yaml/util';
import type { Schema }  from 'yaml/types';
import type { CST }     from 'yaml/parse-cst';


export type MaybeHasFrom = { from?: string; };
export type LoaderState =
    Pick<loader.LoaderContext, "resourcePath" | "rootContext" | "context"> &
    MaybeHasFrom
;

export type IncMap     = Record<string, string[] >;
/*export type IncList    = string[][];*/
export type HasIncMap  = {incs: IncMap;}
/*export type HasIncList = {incs: IncList;}*/

export type HasDoc    = {doc:  any;}
export type DocIncsStructure = HasIncMap & HasDoc;
export type DocumentObject = DocIncsStructure & { state: LoaderState; };
export type DocumentsMap = Record<string, DocumentObject>;

const getNStr = (node: YAML.CST.Node, next: YAML.CST.Node): string | number | null => {
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
    acc:   string[],
    node:  YAML.CST.Node,
    ni:    number,
    arr:   YAML.CST.Node[]
) => {
    const p = getNStr( node, arr[ni+1] );
    node.type && p !== null && acc.push(`${p}`);
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

const tagInclude = ({incs, ...cache}: HasIncMap & LoaderState): Schema.CustomTag => ({
    identify: () => false,
    tag: '!include',
    resolve: (_doc, cst) => {
        const ypath = includeYpath(cst);
        const {strValue} = cst as MaybeNullableStrValue;
        if (strValue !== null && strValue !== void(0) ) {
            const file   = path.join( cache.context, strValue);
            incs[file] = incs[file] || [];
            incs[file].push( ...ypath );
        }
        return null;
    }
});

const multiYamlParse = (cache: LoaderState, content: string) => {
    const incs    = {};
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

const getModulePromise = (state: LoaderState): Promise<string> =>
    new Promise<DocumentsMap>(
        (resolve, reject) => {
            const fileQueue = [state];
            const results: DocumentsMap = {};
            let cache: LoaderState | void;
            while ( (cache = fileQueue.pop()) ) {
                const {resourcePath} = cache;
                if (resourcePath in results) {
                    continue;
                } else {
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
            console.log("DocumentsMap", results);
            return 'module.exports = "DocumentsMap";'
        }
    )
    /*
    .then(
        (results: DocumentsMap): string => {
            const res = JSON.stringify(
                pack(results, state.resourcePath)
            );
            return res;
        }
    )
    .then(
        packed => `
            ${ unpack }
            const packed = ${ packed };
            const res = unpack(packed);
            module.exports = res;
        `
    )*/
;

/*type IndexIncsStructure = {
    index: number
} & HasIncMap;*/

/*const packIncsReducer = (files: string[]) => (
    packed: IndexIncsStructure[],
    [key, incs]: [string, any]
) => {
    const index = files.indexOf(key);
    packed.push({index, incs});
    return packed;
};

const packReducer = (files: string[]) =>
(
    packed: DocIncsStructure[],
    [key, {doc, incs = {}}]: [string, DocumentObject]
): HasDoc & HasIncList => {
    const index       = files.indexOf(key);
    const incsEntries = Object.entries(incs);
    packed[ index ]   = {
        doc,
        incs: incsEntries.reduce(
            packIncsReducer(files), []
        )
    };
    return packed;
};*/

/*function pack (data: DocumentsMap, root: string): DocIncsStructure[] {
    const files  = Object.keys(data).sort( f1 => f1 === root ? -1 : 1 );
    const packed = Object.entries(data).reduce( packReducer(files), []);
    return packed;
}

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
    const { resourcePath, rootContext, context } = this;
    const state: LoaderState = { resourcePath, rootContext, context };
    if (this.addContextDependency) {
        this.addContextDependency(context);
    }
    getModulePromise(state)
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

export default MYLoader;

