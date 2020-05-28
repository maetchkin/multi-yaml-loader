const YAML        = require('yaml');
const path        = require('path');
const fs          = require('fs');
const YIError     = require('./YamlIncludeError.js');
const YAMLCST     = { 'SEQ':'SEQ', 'MAP':'MAP'};

const getNStr = (node, next) => {
    const {type, contents, items} = node;
    let res = null;
    switch (type) {
        case YAMLCST.SEQ:
            if(items){
                res = items.indexOf( next );
            };
        break;
        case YAMLCST.MAP:
            if(items){
                let pos = items.indexOf( next );
                res = items[pos-1].toString();
            };
        break;
    }
    return {type, res};
}

const resolveInclude = ({context}, inc) => path.join(context, inc);
const notNull = n => n !== null;
const extractRes = ({res}) => res;

const traverseCST = (acc, n, ni, arr) => {
    n.type && acc.push( getNStr( n, arr[ni+1] ) );
    return acc;
};

const includeYpath = cst => {

    let cstPath = [cst];
    let parent;
    do {
        parent = cstPath[0]?.context?.parent;
        parent && (cstPath = [parent, ...cstPath]);
    } while (parent);

    let ypath = cstPath
                    .reduce( traverseCST, [] )
                    .map( extractRes )
                    .filter( notNull )
    ;

    return ypath;
}


const tagInclude = ({incs, ...cache}) => ({
    tag: '!include',
    resolve: (doc, cst) => {
        const ypath = includeYpath(cst);
        const {strValue} = cst;
        const file = resolveInclude(cache, strValue);
        incs[file] = incs[file] || [];
        incs[file].push( ypath );
        return null;
    }
});

const getLoaderState =  ({ resourcePath, rootContext, context }) =>
                        ({ resourcePath, rootContext, context })
;

const defaultOptions = {prettyErrors: true, keepCstNodes: true};

function syncLoadFile ({resourcePath}) {
    return fs.readFileSync(
                resourcePath,
                {encoding:'utf8'}
            )
    ;
};

function multiYamlParse (cache, content) {
    const incs    = {};
    const tagInc  = tagInclude({ ...cache, incs });
    const options = { defaultOptions,  customTags: [ tagInc ]};
    const doc     = YAML.parse( content, options );
    const res     = { doc, incs };
    return res;
};

function syncParseYaml (cache) {
    const content = syncLoadFile( cache );
    const result  = multiYamlParse( cache, content );
    return {...result, cache};
};

const packIncsReducer = files => (packed,[key,incs]) => {
    const index = files.indexOf(key);
    packed.push({index, incs});
    return packed;
};

const packReducer = files => (packed,[key,{doc, incs = {}}]) => {
    const index = files.indexOf(key);
    const incsEntries = Object.entries(incs);
    packed[ index ] = {doc};
    if (incsEntries.length > 0) {
        packed[ index ].incs = incsEntries.reduce(packIncsReducer(files),[]);
    }
    return packed;
};

function pack (data, root) {
    const files  = Object.keys(data).sort( f1 => f1 === root ? -1 : 1 );
    const packed = Object.entries(data).reduce( packReducer(files) ,[]);
    return packed;
}

function unpack (data) {

    const resolveIncs = (docindex = 0, visit = []) => {
        let res;
        if ( visit.includes(docindex) ) {
            res = data[docindex].doc;
        } else {
            visit.push(docindex);
            const {doc, incs = []} = data[docindex];
            res = incs.reduce(
                (doc, {index, incs}) => {
                    const incdoc = resolveIncs(index, visit);
                    incs.forEach(
                        inc => {
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

    return resolveIncs();
}

function getModulePromise (state) {
    return new Promise(
        (resolve, reject) => {
            const fileQueue = [state];
            const results   = {};
            let cache;
            while ( cache = fileQueue.pop() ) {
                if (cache.resourcePath in results) {
                    continue;
                } else {
                    try {
                        const result = syncParseYaml(cache);
                        results[cache.resourcePath] = result;
                        Object
                            .keys( result.incs )
                            .forEach(
                                file => {
                                    const add = { ...state, resourcePath:file, from:cache.resourcePath };
                                    fileQueue.push(add);
                                }
                            )
                        ;
                    } catch (err) {
                        reject(
                            new YIError(err, cache.from || cache.resourcePath)
                        );
                    }
                }
            }

            resolve(results);
        }
    )
    .then(
        results => JSON.stringify( pack(results, state.resourcePath) )
    )
    .then(
        packed => `
            ${ unpack }
            const packed = ${ packed };
            const res = unpack(packed);
            module.exports = res;
        `
    )

};

function multiYamlLoader () {
    const callback = this.async();
    const state = getLoaderState(this);
    (addContextDependency in this) && this.addContextDependency(state.context);
    getModulePromise(state)
        .then(
            res => callback( null, res )
        )
        .catch(
            callback
        );
    return;
}

module.exports = multiYamlLoader;

