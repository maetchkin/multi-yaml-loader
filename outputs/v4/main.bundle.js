/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./__test__/documents/simple.yaml");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./__test__/documents/simple.yaml":
/*!****************************************!*\
  !*** ./__test__/documents/simple.yaml ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports) {


    function unpack(packed) {
  const [docMap, root] = JSON.parse(JSON.stringify(packed));
  const incsReducer = visit => (doc, [docptr, incs]) => {
    const incdoc = resolveIncs(docptr, visit);
    incs.forEach(inc => {
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
    } else {
      visit[docptr] = true;
      const {
        doc,
        incs
      } = docMap[docptr];
      res = Object.entries(incs).reduce(incsReducer(visit), doc);
    }
    return res;
  };
  const MERGE_KEY = '<<<';
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const resolveMerge = (node, visit = []) => {
    let res;
    if (visit.includes(node)) {
      res = node;
    } else {
      visit.push(node);
      if (isObj(node)) {
        res = Object.entries(node).reduce((acc, [k, v]) => {
          if (k.startsWith(MERGE_KEY)) {
            const n = Object.assign(acc, resolveMerge(v, visit));
            delete n[k];
            return n;
          } else {
            const n = Object.assign(acc, {
              [k]: resolveMerge(v, visit)
            });
            return n;
          }
        }, node);
      } else if (Array.isArray(node)) {
        res = node.map(item => resolveMerge(item, visit));
      } else {
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

/******/ });