const loaderUtils = require('loader-utils');
const YAML        = require('yaml');
const YAMLCST     = require('yaml/dist/constants.js').Type;
const path        = require('path');
const fs          = require('fs');

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

/*
return new Promise(
        (resolve, reject) => {
            try {
                if (content) {
                    let acc = {};
                    const options = {
                                        defaultOptions,
                                        customTags: [
                                            tagInclude({
                                                context,
                                                rootContext,
                                                acc
                                            })
                                        ]
                                    };
                    const doc = YAML.parse( content, options );
                    const res = { doc, acc };
                    return includeResolve({filecache, acc})
                            .then(
                                () => resolve(
                                    `module.exports = ${ JSON.stringify(res) }`
                                )
                            );

                } else {
                    throw new Error('no content in ' + resourcePath);
                }
            } catch (error) {
                reject(error)
            }
        }
    );

*/

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

class YamlIncludeError extends Error {
    constructor(src, msg){
        super();
        this.name = 'YamlIncludeError';
        this.stack = `Error in ${src}:\n    > ${msg}`;
    }
};



function getModulePromise (state) {
    const fileQueue = [state];
    const all       = {};
    let cache;
    while ( cache = fileQueue.pop() ) {
        if (cache.resourcePath in all) {
            continue;
        } else {
            try {
                all[cache.resourcePath] = syncParseYaml(cache);
                Object
                    .keys( all[cache.resourcePath].incs )
                    .forEach(
                        file => {
                            const add = { ...state, resourcePath:file, from:cache.resourcePath };
                            //console.log('<INC>', add);
                            fileQueue.push(add);
                        }
                    )
                ;
            } catch (e) {
                throw new YamlIncludeError(cache.from || cache.resourcePath, e);
            }
        }
    }
    console.log(' ====fileQueue===== \n', all );

    //return Promise.all( all );
    return Promise.resolve(`module.exports = "'хуй'"`);
};

function multiYamlLoader () {
    const callback = this.async();
    getModulePromise(
        getLoaderState(this)
    )
        .then(
            res => callback( null, res )
        )
        .catch(
            callback
        );
    return;
}

module.exports = multiYamlLoader;
