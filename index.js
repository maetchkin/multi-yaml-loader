const loaderUtils = require('loader-utils');
const YAML        = require('yaml');
const YAMLCST     = require('yaml/dist/constants.js').Type;
const path        = require('path');

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


const tagInclude = ctx => ({
    tag: '!include',
    resolve: (doc, cst) => {
        const {context } = ctx;
        const {strValue} = cst;
        const file = path.join(context, strValue);

        let cstPath = [cst];
        let parent;
        do {
            parent = cstPath[0]?.context?.parent;
            parent && (cstPath = [parent, ...cstPath]);
        } while (parent);

        let ypath = cstPath
                        .reduce(
                            (acc, n, ni, arr) => {
                                n.type && acc.push( getNStr( n, arr[ni+1] ) );
                                return acc;
                            },
                            []
                        )
                        .map( ({res}) => res )
                        .filter( n => !!n )
        ;

        console.log('!INCLUDE', {file, ypath});
        return { file, ypath };
    }
});

function getModule (content) {
    const ctx = this;
    const { resourcePath, resource, request, rootContext, context, query } = this;
    const options = loaderUtils.getOptions(this);


    return new Promise(
        (resolve, reject) => {
            try {
                if (content) {
                    const doc = YAML.parse(
                                    content,
                                    {
                                        prettyErrors: true,
                                        keepCstNodes: true,
                                        customTags: [ tagInclude(ctx) ]
                                    }
                                );
                    resolve( `module.exports = ${ JSON.stringify(doc) }` );
                } else {
                    throw new Error('no content in ' + resourcePath);
                }
            } catch (error) {
                reject(error)
            }
        }
    );
};

function multiYamlLoader (content) {
    const callback = this.async();
    getModule.call(this, content)
        .then(
            res => callback( null, res )
        )
        .catch(
            err => callback( new Error(err) )
        );
    return;
}

module.exports = multiYamlLoader;
