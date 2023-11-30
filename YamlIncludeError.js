class YamlIncludeError extends Error {
    constructor (err, fileName) {
        super();
        this.name = 'YamlIncludeError';
        this.message =  `Error in ${fileName}:\n    > ${err}`;
    }
};

module.exports = YamlIncludeError;
