const loaderUtils = require('loader-utils');
const YAML        = require('yaml');
const YAMLCST     = require('yaml/dist/constants.js').Type;
const path        = require('path');


const getNStr = (node, next) => {
    const {type, contents, items} = node;
    let res = node;
/*
ALIAS
BLANK_LINE
BLOCK_FOLDED
BLOCK_LITERAL
COMMENT
DIRECTIVE
DOCUMENT
FLOW_MAP
FLOW_SEQ

    MAP

MAP_KEY
MAP_VALUE
PLAIN
QUOTE_DOUBLE
QUOTE_SINGLE
SEQ
SEQ_ITEM
*/

    switch (type) {
        case YAMLCST.MAP:
            if(items){
                let pos = items.indexOf( next );
                res = items[pos-1].toString();
            };
        break;

        default: res = null
    }

    return {type, res};
}


const tagInclude = ctx => ({
    tag: '!include',
    resolve: (doc, cst) => {
        const {context } = ctx;
        const {strValue} = cst;
        const file = path.join(context, strValue);

        let ypath = [cst];
        let p;

        while (p = ypath[0]?.context?.parent){
            ypath = [p, ...ypath];
        }

        let ypath2 = ypath.reduce(
                        (acc, n, ni, arr) => {
                            n.type && acc.push( getNStr( n, arr[ni+1] ) );
                            return acc;
                        },
                        []
                    ).map( ({res}) => res ).filter( n => !!n ).join('.');
        //console.log('YAMLCST', YAMLCST );
        //console.log('ypath2', ypath2 );
        //console.log('cst', {/*doc,*/ /*ypath, */ypath2, strValue} );


        console.log('!INCLUDE', { /*context, value, */file, ypath2 } );
        return {
            include:file,
            ypath2
            //cst
        };
    }
});

//YAML.defaultOptions.customTags = [ include ];




function getModule (content) {
    const ctx = this;
    const { resourcePath, resource, request, rootContext, context, query } = this;
    const options = loaderUtils.getOptions(this);

    //console.log("\n\n\n", resourcePath, "\n=================\n", { options, resource, request, rootContext, context, query });

    /*console.log({ resourcePath, resource, request, rootContext, context });*/




    return new Promise(
        (resolve, reject) => {
            try {
                if (content) {
                    const stream = YAML.parseAllDocuments(
                        content, {
                            prettyErrors: true,
                            keepCstNodes: true,
                            customTags: [ tagInclude(ctx) ]
                        }
                    );
                    const res = [];
                    for (const doc of stream) {
                      for (const warn of doc.warnings) { ctx.emitWarning(warn); }
                      for (const err of doc.errors)    { ctx.emitError(err)};
                      res.push(doc.toJSON())
                    }
                    const m = `module.exports = ${ JSON.stringify(res) }`;
                    resolve( m );
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


/*
if (loaderUtils.isUrlRequest(url)) {
  // Logic for requestable url
  const request = loaderUtils.urlToRequest(url);
}

*/