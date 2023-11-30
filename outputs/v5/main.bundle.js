/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./__test__/documents/simple.yaml":
/*!****************************************!*\
  !*** ./__test__/documents/simple.yaml ***!
  \****************************************/
/***/ ((module) => {


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
    const packed = [
  {
    "__test__/documents/simple.yaml": {
      "doc": {
        "name": "simple"
      },
      "incs": {}
    }
  },
  "__test__/documents/simple.yaml"
];
    const result = unpack(packed);
    module.exports = { result, packed, unpack };


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./__test__/documents/simple.yaml");
/******/ 	
/******/ })()
;