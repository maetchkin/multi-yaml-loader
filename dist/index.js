"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Loader = exports.getMarkdown = exports.PackageJsonNotFoundError = exports.IncludeError = void 0;
const loader_utils_1 = require("loader-utils");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const marked_1 = require("marked");
const YAML = __importStar(require("yaml"));
const util_1 = require("yaml/util");
const filterCSTComment = ({ type }) => type !== util_1.Type.COMMENT && type !== util_1.Type.BLANK_LINE;
const getNStr = (node, next) => {
    const { type } = node;
    let res = null;
    switch (type) {
        case util_1.Type.SEQ:
            {
                const { items } = node;
                const filtered = items.filter(filterCSTComment);
                if (items) {
                    res = filtered.indexOf(next);
                }
            }
            break;
        case util_1.Type.MAP:
            const { items } = node;
            const filtered = items.filter(filterCSTComment);
            if (filtered) {
                let pos = filtered.indexOf(next);
                const ptr = filtered[pos - 1];
                res = (ptr !== null && 'strValue' in ptr && typeof ptr.strValue === 'string') ? ptr.strValue : ptr.toString();
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
    // console.log('ypath', {cstPath, ypath});
    return ypath;
};
class IncludeError extends Error {
    constructor(err, fileName) {
        super(`Error in ${fileName}:\n${err}`);
        this.name = 'IncludeError';
    }
}
exports.IncludeError = IncludeError;
class PackageJsonNotFoundError extends Error {
    constructor(context) {
        super(`package.json not detected for ${context}`);
        this.name = 'PackageJsonNotFoundError';
    }
}
exports.PackageJsonNotFoundError = PackageJsonNotFoundError;
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
const multiYamlParse = (state, content, options) => {
    const incs = {};
    const { customTags: MaybeCustomTagsFuncs } = options;
    const includeTags = ["!include", "!yaml", "!md", "!json"].map(tag => tagInclude(Object.assign(Object.assign({}, state), { incs, tag })));
    const customTags = [
        ...includeTags,
        ...(MaybeCustomTagsFuncs || []).map(CustomTag => CustomTag(state))
    ];
    const YAMLoptions = Object.assign(Object.assign({}, defaultOptions), { customTags });
    const doc = YAML.parseDocument(content, YAMLoptions);
    const res = { doc, incs };
    return res;
};
const NoIncs = {};
const rendererImage = (state, mdImageLoader) => function (href, title, text) {
    const { options = {} } = this;
    const { baseUrl } = options;
    const imghref = href
        ? mdImageLoader
            ? mdImageLoader(state, href, baseUrl || '/')
            : path.join(baseUrl || '/', href)
        : href;
    return imghref === null
        ? text
        : `<img src="${imghref}" alt="${text}" ${title ? ` title="${title}"` : ''} class="zoom">`;
};
const getMarkdown = (content, { marked: maybeMarkedOptions = {}, mdImageLoader }, state) => {
    const { renderer: maybeRenderer } = maybeMarkedOptions, markedOptions = __rest(maybeMarkedOptions, ["renderer"]);
    const renderer = maybeRenderer || new marked_1.marked.Renderer(markedOptions);
    renderer.image = rendererImage(state, mdImageLoader);
    const options = Object.assign(Object.assign({}, markedOptions), { renderer });
    marked_1.marked.setOptions(options);
    const doc = (0, marked_1.marked)(content);
    return { doc, incs: NoIncs };
};
exports.getMarkdown = getMarkdown;
const syncParseYaml = (state, options) => {
    const ext = path.extname(state.resourcePath).toLowerCase();
    const content = fs.readFileSync(state.resourcePath, { encoding: 'utf8' });
    const isYaml = ext === '.yaml' || ext === '.yml' || ext === '.raml';
    const isMD = ext === '.md';
    const isJSON = ext === '.json';
    const result = isYaml ? multiYamlParse(state, content, options) :
        isMD ? getMarkdown(content, options, state) :
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
    // console.log( "results > ", JSON.stringify(results, null, 2) )
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
    const [docMap, root] = JSON.parse(JSON.stringify(packed));
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
            else if (Array.isArray(node)) {
                res = node.map(item => resolveMerge(item, visit));
            }
            else {
                res = node;
            }
        }
        return res;
    };
    return resolveMerge(resolveIncs(root));
}
function findPackageJson(currentPath) {
    const packageJsonPath = path.resolve(path.join(currentPath, 'package.json'));
    if (fs.existsSync(packageJsonPath)) {
        return path.dirname(packageJsonPath);
    }
    const parentPath = path.dirname(path.resolve(currentPath));
    if (currentPath === parentPath) {
        return null;
    }
    return findPackageJson(parentPath);
}
const Loader = function () {
    const callback = this.async();
    const { resourcePath, rootContext, context, resourceQuery } = this;
    const docRoot = findPackageJson(context);
    if (docRoot === null) {
        throw new PackageJsonNotFoundError(context);
    }
    const state = { resourcePath, rootContext, context, resourceQuery, docRoot };
    if (this.addContextDependency) {
        this.addContextDependency(context);
    }
    if (this.cacheable) {
        this.cacheable(false);
    }
    const options = Object.assign(Object.assign(Object.assign({}, (0, loader_utils_1.getOptions)(this)), (0, loader_utils_1.parseQuery)(this.resourceQuery || '?')), { rootContext });
    getModulePromise(state, options)
        .then((result) => {
        result && callback
            ? callback(null, result)
            : void (0);
    })
        .catch(callback);
    return;
};
exports.Loader = Loader;
exports.default = Loader;
