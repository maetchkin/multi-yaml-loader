const loaderUtils = require('loader-utils');
const YAML        = require('yaml');


module.exports = function yamlMultiLoader(src) {

    const options = {
        prettyErrors: true,
     ...loaderUtils.getOptions(this)
    };

    const res = YAML.parse(src, options);

    console.log( {src, options, res} );
}