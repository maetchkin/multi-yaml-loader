import {getOptions, parseQuery} from 'loader-utils';
import * as path                from 'path';
import * as fs                  from 'fs';
import {marked}                 from 'marked';
import * as YAML                from 'yaml';
import { Type }                 from 'yaml/util';
import type { Schema }          from 'yaml/types';
import type { CST }             from 'yaml/parse-cst';
import webpack4                 from 'webpack4';
import {LoaderContext}          from 'webpack5';


export type MaybeKeepFiles       = {keepFiles?:      boolean};
export type MaybeKeepFilesRoots  = {keepFilesRoots?: boolean};
export type MaybeHasSpace        = {space?:          boolean};
export type MaybeHasFrom         = {from?:           string};
export type HasRootContext       = {rootContext:     string};
export type HasDocRoot           = {docRoot:        string};
export type MaybeHasRootContext  = Partial<HasRootContext>;
export type LoaderOptions        = MaybeKeepFiles &
                                   MaybeKeepFilesRoots &
                                   MaybeHasSpace &
                                   MaybeHasRootContext &
                                   MaybeHasCustomTags &
                                   MaybeHasMdImageLoader &
                                   MaybeHasMarked
;

export type MdImageLoaderFunc      = (state: LoaderState, href: string, baseUrl: string) => string;
export type CustomTagFunc          = (state: LoaderState) => Schema.CustomTag
export type MaybeHasMdImageLoader  = {mdImageLoader?: MdImageLoaderFunc};
export type MaybeHasMarked         = {marked?: marked.MarkedOptions};
export type MaybeHasCustomTags     = {customTags?: CustomTagFunc[] };

export type LoaderState =
    Pick<webpack4.loader.LoaderContext & LoaderContext<any>, "resourcePath" | "rootContext" | "context" | "resourceQuery"> &
    MaybeHasFrom &
    HasDocRoot
;
export type UnionLoaderContext = webpack4.loader.LoaderContext | LoaderContext<any>;

export type IncDeep    = string | number;
export type IncList    = IncDeep[][];
export type IncMap     = Record<string, IncList>;
export type HasIncMap  = {incs: IncMap;}
export type HasDoc     = {doc:  any;}

export type DocumentObject = HasIncMap & HasDoc & { state: LoaderState; };
export type DocumentsMap = Record<string, DocumentObject>;

export type Packed = HasDoc & HasIncMap;
export type PackedDocumentsMap = Record<string, Packed>;
export type PackedResult = [PackedDocumentsMap, string];
export type MaybeNullableStrValue = {
    strValue?: string | null | void
}
export type HasTagStr = {
    tag: string
}

const filterCSTComment = ({type}: YAML.CST.Node) => type !== Type.COMMENT && type !== Type.BLANK_LINE;

const getNStr = (node: YAML.CST.Node, next: YAML.CST.Node): IncDeep | null => {
    const {type} = node;
    let res = null;
    switch (type) {
        case Type.SEQ: {
            const {items} = node as CST.Seq;
            const filtered = items.filter(filterCSTComment)
            if (items) {
                res = filtered.indexOf(
                    next as CST.BlankLine |
                            CST.Comment   |
                            CST.SeqItem
                );
            }
        }
        break;
        case Type.MAP:
            const {items} = node as CST.Map;
            const filtered = items.filter(filterCSTComment);
            if(filtered){
                let pos = filtered.indexOf(
                    next as CST.BlankLine |
                            CST.Comment   |
                            CST.Alias     |
                            CST.Scalar    |
                            CST.MapItem
                );
                res = filtered[pos - 1].toString();
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
    // console.log('ypath', {cstPath, ypath});
    return ypath;
}

export class IncludeError extends Error {
    constructor (err: string, fileName: string) {
        super(`Error in ${fileName}:\n${err}`);
        this.name = 'IncludeError';
    }
}

export class PackageJsonNotFoundError extends Error {
    constructor(context: string) {
        super(`package.json not detected for ${context}`);
        this.name = 'PackageJsonNotFoundError';
    }
}

const defaultOptions = {
    prettyErrors: true,
    keepCstNodes: true,
};

const tagInclude = ({incs, context, tag, docRoot}: HasIncMap & HasTagStr & LoaderState): Schema.CustomTag => ({
    identify: () => false,
    tag,
    resolve: (_doc, cst) => {
        const ypath = includeYpath(cst);
        const {strValue} = cst as MaybeNullableStrValue;
        if (typeof strValue === 'string' ) {
            const file = path.join(
                strValue.startsWith('/')
                    ? docRoot
                    : context
                ,
                strValue
            );
            incs[file] = incs[file] || [];
            incs[file].push( ypath );
        }
        return null;
    }
});

const multiYamlParse = (state: LoaderState, content: string, options: LoaderOptions) => {
    const incs: IncMap = {};
    const {customTags: MaybeCustomTagsFuncs} = options;
    const includeTags = ["!include", "!yaml", "!md", "!json"].map(
        tag => tagInclude({ ...state, incs, tag })
    );
    const customTags = [
        ...includeTags,
        ...(MaybeCustomTagsFuncs || []).map( CustomTag => CustomTag(state) )
    ];
    const YAMLoptions: YAML.Options = { ...defaultOptions, customTags };
    const doc = YAML.parseDocument( content, YAMLoptions );
    const res = { doc, incs };
    return res;
};

const NoIncs: IncMap = {};

const rendererImage = (state: LoaderState, mdImageLoader?: MdImageLoaderFunc) => function (this: marked.Renderer | marked.RendererThis, href: string | null, title: string | null, text: string) {
    const {options = {}} = this as {options: marked.MarkedOptions};
    const {baseUrl} = options;
    const imghref = href
            ? mdImageLoader
                ? mdImageLoader(state, href, baseUrl || '/')
                : path.join(baseUrl || '/', href)
            : href
    ;
    return imghref === null
            ? text
            : `<img src="${imghref}" alt="${text}" ${ title ? ` title="${title}"` : '' } class="zoom">`
    ;
}

const getMarkdown = (content: string, {marked: maybeMarkedOptions = {}, mdImageLoader}: LoaderOptions, state: LoaderState) => {
    const {renderer: maybeRenderer, ...markedOptions} = maybeMarkedOptions;
    const renderer = maybeRenderer || new marked.Renderer( markedOptions );
    renderer.image = rendererImage( state, mdImageLoader );
    const options: marked.MarkedOptions = { ...markedOptions, renderer };
    marked.setOptions(options);
    const doc = marked(content);
    return {doc, incs: NoIncs};
}

const syncParseYaml = (state: LoaderState, options: LoaderOptions): DocumentObject => {
    const ext     = path.extname(state.resourcePath).toLowerCase();
    const content = fs.readFileSync( state.resourcePath, {encoding:'utf8'});
    const isYaml  = ext === '.yaml' || ext === '.yml' || ext === '.raml';
    const isMD    = ext === '.md';
    const isJSON  = ext === '.json';


    const result  = isYaml ? multiYamlParse( state, content, options ) :
                    isMD   ? getMarkdown(content, options, state) :
                    isJSON ? {doc: JSON.parse(content), incs: NoIncs} :
                    {doc: 'no doc', incs: NoIncs}
    ;
    return {...result, state};
}

const getFullResultStr = (unpack: Function, packed: string) => `
    ${ unpack }
    const packed = ${ packed };
    const result = unpack(packed);
    module.exports = { result, packed, unpack };
`;

const getResultStr = (unpack: Function, packed: string) => `
    ${ unpack }
    const packed = ${ packed };
    const result = unpack(packed);
    module.exports = { result };
`;

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
                        const result = syncParseYaml(cache, options);
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
                            new IncludeError(`${err}`, cache.from || cache.resourcePath)
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
            // console.log( "results > ", JSON.stringify(results, null, 2) )
            const result = JSON.stringify(
                pack(results, state.resourcePath, options),
                null,
                space ? 2 : 0
            );
            return result;
        }
    )
    .then(
        packed => options.keepFiles
                    ? getFullResultStr(unpack, packed)
                    : getResultStr(unpack, packed)
    )
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
        incs:   Object.entries(incs).reduce(
                    packIncsReducer(idByFile),
                    {}
                )
    };
    return packed;
};

const getId = (files: string[], {keepFiles, keepFilesRoots, rootContext}: LoaderOptions) => (fileName: string): string =>
    keepFiles
        ? (
            keepFilesRoots
                ? fileName
                : path.normalize(
                    fileName.replace(rootContext || '', '.')
                )
        )
        : `${files.indexOf(fileName)}`
;

function pack (data: DocumentsMap, root: string, options: LoaderOptions ): PackedResult {
    const files  = Object.keys(data).sort( f1 => f1 === root ? -1 : 1 );
    const idByFile = getId(files, options);
    const packed = Object.entries(data).reduce(
        packReducer(idByFile), {}
    );
    return [packed, idByFile(root)];
}

function unpack (packed: PackedResult): any {
    const [ docMap, root ] = JSON.parse(JSON.stringify(packed)) as PackedResult;
    const incsReducer = (visit: Record<string, boolean>) => (doc: any, [docptr, incs]: [string, IncList] ): any => {
        const incdoc = resolveIncs(docptr, visit);
        incs.forEach(
            (inc) => {
                let ptr = doc as Record<IncDeep, any>;
                while ( inc.length > 1 ) {
                    ptr = ptr[ inc.shift() as IncDeep ];
                }
                ptr[ inc.shift() as IncDeep ] = incdoc;
            }
        );
        return doc;
    }
    const resolveIncs = (docptr: string, visit: Record<string, boolean> = {} ) => {
        let res;
        if ( docptr in visit ) {
            res = docMap[docptr].doc;
        } else {
            visit[docptr] = true;
            const {doc, incs} = docMap[docptr];
            res = Object.entries(incs).reduce( incsReducer(visit) , doc)
        }
        return res;
    }

    const MERGE_KEY = '<<<';

    const isObj = (v: any): boolean => v !== null && typeof(v) === 'object' && !Array.isArray(v);

    const resolveMerge = (node: any, visit: any[] = []): any => {
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
            } else if(Array.isArray(node)) {
                res = node.map(
                    item => resolveMerge(item, visit)
                )
            } else {
                res = node;
            }
        }

        return res;
    }

    return resolveMerge( resolveIncs(root) );
}

function findPackageJson(currentPath: string): string | null {
    const packageJsonPath = path.resolve(path.join(currentPath, 'package.json'));

    if (fs.existsSync(packageJsonPath)) {
        return path.dirname(packageJsonPath);
    }

    const parentPath = path.dirname(path.resolve(currentPath));

    if (currentPath === parentPath) {
        return null
    }
    return findPackageJson(parentPath);
}

const Loader = function (this: UnionLoaderContext) {
    const callback = this.async();
    const {resourcePath, rootContext, context, resourceQuery} = this;
    const docRoot = findPackageJson(context)
    if (docRoot === null) {
        throw new PackageJsonNotFoundError(context);
    }
    const state: LoaderState = {resourcePath, rootContext, context, resourceQuery, docRoot};
    if (this.addContextDependency) {
        this.addContextDependency(context);
    }
    if (this.cacheable) {
        this.cacheable(false);
    }

    const options: LoaderOptions = {
        // @ts-ignore
        ...getOptions(this),
        ...parseQuery(this.resourceQuery || '?'),
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

export {getMarkdown, Loader};

export default Loader;
