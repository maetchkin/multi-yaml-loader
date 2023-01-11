"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncludeError = void 0;
// @ts-ignore
const loader_utils_1 = require("loader-utils");
// @ts-ignore
const path = __importStar(require("path"));
// @ts-ignore
const fs = __importStar(require("fs"));
// @ts-ignore
const marked_1 = __importDefault(require("marked"));
const YAML = __importStar(require("yaml"));
const util_1 = require("yaml/util");
const getNStr = (node, next) => {
    const { type } = node;
    let res = null;
    switch (type) {
        case util_1.Type.SEQ:
            {
                const { items } = node;
                if (items) {
                    res = items.indexOf(next);
                }
            }
            break;
        case util_1.Type.MAP:
            const { items } = node;
            if (items) {
                let pos = items.indexOf(next);
                res = items[pos - 1].toString();
            }
            break;
    }
    return res;
};
const traverseCST = (acc, node, ni, arr) => {
    const deep = getNStr(node, arr[ni + 1]);
    node.type && deep !== null && acc.push(deep);
    return acc;
};
const includeYpath = (cst) => {
    var _a, _b;
    let cstPath = [cst];
    let parent;
    do {
        parent = (_b = (_a = cstPath[0]) === null || _a === void 0 ? void 0 : _a.context) === null || _b === void 0 ? void 0 : _b.parent;
        parent && (cstPath = [parent, ...cstPath]);
    } while (parent);
    let ypath = cstPath.reduce(traverseCST, []);
    return ypath;
};
class IncludeError extends Error {
    constructor(err, fileName) {
        super(`Error in ${fileName}:\n${err}`);
        this.name = 'IncludeError';
    }
}
exports.IncludeError = IncludeError;
const defaultOptions = {
    prettyErrors: true,
    keepCstNodes: true,
};
const tagInclude = ({ incs, context, tag, docRoot }) => ({
    identify: () => false,
    tag,
    resolve: (_doc, cst) => {
        const ypath = includeYpath(cst);
        const { strValue } = cst;
        if (typeof strValue === 'string') {
            const file = path.join(strValue.startsWith('/')
                ? docRoot
                : context, strValue);
            incs[file] = incs[file] || [];
            incs[file].push(ypath);
        }
        return null;
    }
});
const multiYamlParse = (cache, content, options) => {
    const incs = {};
    const { customTags: MaybeCustomTags } = options;
    const includeTags = ["!include", "!yaml", "!md", "!json"].map(tag => tagInclude(Object.assign(Object.assign({}, cache), { incs, tag })));
    const customTags = [
        ...includeTags,
        ...(MaybeCustomTags || [])
    ];
    const YAMLoptions = Object.assign(Object.assign({}, defaultOptions), { customTags });
    const doc = YAML.parse(content, YAMLoptions);
    const res = { doc, incs };
    return res;
};
const syncParseYaml = (state, options) => {
    const ext = path.extname(state.resourcePath).toLowerCase();
    const content = fs.readFileSync(state.resourcePath, { encoding: 'utf8' });
    const isYaml = ext === '.yaml' || ext === '.yml' || ext === '.raml';
    const isMD = ext === '.md';
    const isJSON = ext === '.json';
    const NoIncs = {};
    const result = isYaml ? multiYamlParse(state, content, options) :
        isMD ? { doc: marked_1.default(content), incs: NoIncs } :
            isJSON ? { doc: JSON.parse(content), incs: NoIncs } :
                { doc: 'no doc', incs: NoIncs };
    return Object.assign(Object.assign({}, result), { state });
};
const getFullResultStr = (unpack, packed) => `
    ${unpack}
    const packed = ${packed};
    const result = unpack(packed);
    module.exports = { result, packed, unpack };
`;
const getResultStr = (unpack, packed) => `
    ${unpack}
    const packed = ${packed};
    const result = unpack(packed);
    module.exports = { result };
`;
const getModulePromise = (state, options) => new Promise((resolve, reject) => {
    const fileQueue = [state];
    const results = {};
    let cache;
    while ((cache = fileQueue.pop())) {
        const { resourcePath } = cache;
        if (!(resourcePath in results)) {
            try {
                const result = syncParseYaml(cache, options);
                results[resourcePath] = result;
                Object
                    .keys(result.incs)
                    .forEach(file => {
                    const add = Object.assign(Object.assign({}, state), { resourcePath: file, from: cache.resourcePath, context: path.dirname(file) });
                    fileQueue.push(add);
                });
            }
            catch (err) {
                reject(new IncludeError(`${err}`, cache.from || cache.resourcePath));
            }
        }
    }
    resolve(results);
})
    .then((results) => {
    const { space } = options;
    const result = JSON.stringify(pack(results, state.resourcePath, options), null, space ? 2 : 0);
    return result;
})
    .then(packed => options.keepFiles
    ? getFullResultStr(unpack, packed)
    : getResultStr(unpack, packed));
const packIncsReducer = (idByFile) => (packed, [fileName, incs]) => (Object.assign(Object.assign({}, packed), { [idByFile(fileName)]: incs }));
const packReducer = (idByFile) => (packed, [fileName, { doc, incs = {} }]) => {
    packed[idByFile(fileName)] = {
        doc,
        incs: Object.entries(incs).reduce(packIncsReducer(idByFile), {})
    };
    return packed;
};
const getId = (files, { keepFiles, keepFilesRoots, rootContext }) => (fileName) => keepFiles
    ? (keepFilesRoots
        ? fileName
        : path.normalize(fileName.replace(rootContext || '', '.')))
    : `${files.indexOf(fileName)}`;
function pack(data, root, options) {
    const files = Object.keys(data).sort(f1 => f1 === root ? -1 : 1);
    const idByFile = getId(files, options);
    const packed = Object.entries(data).reduce(packReducer(idByFile), {});
    return [packed, idByFile(root)];
}
function unpack(packed) {
    const [docMap, root] = packed;
    const incsReducer = (visit) => (doc, [docptr, incs]) => {
        const incdoc = resolveIncs(docptr, visit);
        incs.forEach((inc) => {
            let ptr = doc;
            while (inc.length > 1) {
                ptr = ptr[inc.shift()];
            }
            ptr[inc.shift()] = incdoc;
        });
        return doc;
    };
    const resolveIncs = (docptr, visit = {}) => {
        let res;
        if (docptr in visit) {
            res = docMap[docptr].doc;
        }
        else {
            visit[docptr] = true;
            const { doc, incs } = docMap[docptr];
            res = Object.entries(incs).reduce(incsReducer(visit), doc);
        }
        return res;
    };
    const MERGE_KEY = '<<<';
    const isObj = (v) => v !== null && typeof (v) === 'object' && !Array.isArray(v);
    const resolveMerge = (node, visit = []) => {
        let res;
        if (visit.includes(node)) {
            res = node;
        }
        else {
            visit.push(node);
            if (isObj(node)) {
                res = Object.entries(node).reduce((acc, [k, v]) => {
                    if (k.startsWith(MERGE_KEY)) {
                        const n = Object.assign(acc, resolveMerge(v, visit));
                        delete n[k];
                        return n;
                    }
                    else {
                        const n = Object.assign(acc, { [k]: resolveMerge(v, visit) });
                        return n;
                    }
                }, node);
            }
            else {
                res = node;
            }
        }
        return res;
    };
    return resolveMerge(resolveIncs(root));
}
const MYLoader = function () {
    const callback = this.async();
    const { resourcePath, rootContext, context, resourceQuery } = this;
    const state = { resourcePath, rootContext, context, resourceQuery, docRoot: context };
    if (this.addContextDependency) {
        this.addContextDependency(context);
    }
    const options = Object.assign(Object.assign(Object.assign({}, loader_utils_1.getOptions(this)), loader_utils_1.parseQuery(this.resourceQuery || '?')), { rootContext });
    getModulePromise(state, options)
        .then((result) => {
        result && callback
            ? callback(null, result)
            : void (0);
    })
        .catch(callback);
    return;
};
// noinspection JSUnusedGlobalSymbols
exports.default = MYLoader;
