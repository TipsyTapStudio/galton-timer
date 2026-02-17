"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/qrcode/lib/can-promise.js
  var require_can_promise = __commonJS({
    "node_modules/qrcode/lib/can-promise.js"(exports, module) {
      module.exports = function() {
        return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
      };
    }
  });

  // node_modules/qrcode/lib/core/utils.js
  var require_utils = __commonJS({
    "node_modules/qrcode/lib/core/utils.js"(exports) {
      var toSJISFunction;
      var CODEWORDS_COUNT = [
        0,
        // Not used
        26,
        44,
        70,
        100,
        134,
        172,
        196,
        242,
        292,
        346,
        404,
        466,
        532,
        581,
        655,
        733,
        815,
        901,
        991,
        1085,
        1156,
        1258,
        1364,
        1474,
        1588,
        1706,
        1828,
        1921,
        2051,
        2185,
        2323,
        2465,
        2611,
        2761,
        2876,
        3034,
        3196,
        3362,
        3532,
        3706
      ];
      exports.getSymbolSize = function getSymbolSize(version) {
        if (!version) throw new Error('"version" cannot be null or undefined');
        if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40');
        return version * 4 + 17;
      };
      exports.getSymbolTotalCodewords = function getSymbolTotalCodewords(version) {
        return CODEWORDS_COUNT[version];
      };
      exports.getBCHDigit = function(data) {
        let digit = 0;
        while (data !== 0) {
          digit++;
          data >>>= 1;
        }
        return digit;
      };
      exports.setToSJISFunction = function setToSJISFunction(f) {
        if (typeof f !== "function") {
          throw new Error('"toSJISFunc" is not a valid function.');
        }
        toSJISFunction = f;
      };
      exports.isKanjiModeEnabled = function() {
        return typeof toSJISFunction !== "undefined";
      };
      exports.toSJIS = function toSJIS(kanji) {
        return toSJISFunction(kanji);
      };
    }
  });

  // node_modules/qrcode/lib/core/error-correction-level.js
  var require_error_correction_level = __commonJS({
    "node_modules/qrcode/lib/core/error-correction-level.js"(exports) {
      exports.L = { bit: 1 };
      exports.M = { bit: 0 };
      exports.Q = { bit: 3 };
      exports.H = { bit: 2 };
      function fromString(string) {
        if (typeof string !== "string") {
          throw new Error("Param is not a string");
        }
        const lcStr = string.toLowerCase();
        switch (lcStr) {
          case "l":
          case "low":
            return exports.L;
          case "m":
          case "medium":
            return exports.M;
          case "q":
          case "quartile":
            return exports.Q;
          case "h":
          case "high":
            return exports.H;
          default:
            throw new Error("Unknown EC Level: " + string);
        }
      }
      exports.isValid = function isValid(level) {
        return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
      };
      exports.from = function from(value, defaultValue) {
        if (exports.isValid(value)) {
          return value;
        }
        try {
          return fromString(value);
        } catch (e) {
          return defaultValue;
        }
      };
    }
  });

  // node_modules/qrcode/lib/core/bit-buffer.js
  var require_bit_buffer = __commonJS({
    "node_modules/qrcode/lib/core/bit-buffer.js"(exports, module) {
      function BitBuffer() {
        this.buffer = [];
        this.length = 0;
      }
      BitBuffer.prototype = {
        get: function(index) {
          const bufIndex = Math.floor(index / 8);
          return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
        },
        put: function(num, length) {
          for (let i = 0; i < length; i++) {
            this.putBit((num >>> length - i - 1 & 1) === 1);
          }
        },
        getLengthInBits: function() {
          return this.length;
        },
        putBit: function(bit) {
          const bufIndex = Math.floor(this.length / 8);
          if (this.buffer.length <= bufIndex) {
            this.buffer.push(0);
          }
          if (bit) {
            this.buffer[bufIndex] |= 128 >>> this.length % 8;
          }
          this.length++;
        }
      };
      module.exports = BitBuffer;
    }
  });

  // node_modules/qrcode/lib/core/bit-matrix.js
  var require_bit_matrix = __commonJS({
    "node_modules/qrcode/lib/core/bit-matrix.js"(exports, module) {
      function BitMatrix(size) {
        if (!size || size < 1) {
          throw new Error("BitMatrix size must be defined and greater than 0");
        }
        this.size = size;
        this.data = new Uint8Array(size * size);
        this.reservedBit = new Uint8Array(size * size);
      }
      BitMatrix.prototype.set = function(row, col, value, reserved) {
        const index = row * this.size + col;
        this.data[index] = value;
        if (reserved) this.reservedBit[index] = true;
      };
      BitMatrix.prototype.get = function(row, col) {
        return this.data[row * this.size + col];
      };
      BitMatrix.prototype.xor = function(row, col, value) {
        this.data[row * this.size + col] ^= value;
      };
      BitMatrix.prototype.isReserved = function(row, col) {
        return this.reservedBit[row * this.size + col];
      };
      module.exports = BitMatrix;
    }
  });

  // node_modules/qrcode/lib/core/alignment-pattern.js
  var require_alignment_pattern = __commonJS({
    "node_modules/qrcode/lib/core/alignment-pattern.js"(exports) {
      var getSymbolSize = require_utils().getSymbolSize;
      exports.getRowColCoords = function getRowColCoords(version) {
        if (version === 1) return [];
        const posCount = Math.floor(version / 7) + 2;
        const size = getSymbolSize(version);
        const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
        const positions = [size - 7];
        for (let i = 1; i < posCount - 1; i++) {
          positions[i] = positions[i - 1] - intervals;
        }
        positions.push(6);
        return positions.reverse();
      };
      exports.getPositions = function getPositions(version) {
        const coords = [];
        const pos = exports.getRowColCoords(version);
        const posLength = pos.length;
        for (let i = 0; i < posLength; i++) {
          for (let j = 0; j < posLength; j++) {
            if (i === 0 && j === 0 || // top-left
            i === 0 && j === posLength - 1 || // bottom-left
            i === posLength - 1 && j === 0) {
              continue;
            }
            coords.push([pos[i], pos[j]]);
          }
        }
        return coords;
      };
    }
  });

  // node_modules/qrcode/lib/core/finder-pattern.js
  var require_finder_pattern = __commonJS({
    "node_modules/qrcode/lib/core/finder-pattern.js"(exports) {
      var getSymbolSize = require_utils().getSymbolSize;
      var FINDER_PATTERN_SIZE = 7;
      exports.getPositions = function getPositions(version) {
        const size = getSymbolSize(version);
        return [
          // top-left
          [0, 0],
          // top-right
          [size - FINDER_PATTERN_SIZE, 0],
          // bottom-left
          [0, size - FINDER_PATTERN_SIZE]
        ];
      };
    }
  });

  // node_modules/qrcode/lib/core/mask-pattern.js
  var require_mask_pattern = __commonJS({
    "node_modules/qrcode/lib/core/mask-pattern.js"(exports) {
      exports.Patterns = {
        PATTERN000: 0,
        PATTERN001: 1,
        PATTERN010: 2,
        PATTERN011: 3,
        PATTERN100: 4,
        PATTERN101: 5,
        PATTERN110: 6,
        PATTERN111: 7
      };
      var PenaltyScores = {
        N1: 3,
        N2: 3,
        N3: 40,
        N4: 10
      };
      exports.isValid = function isValid(mask) {
        return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
      };
      exports.from = function from(value) {
        return exports.isValid(value) ? parseInt(value, 10) : void 0;
      };
      exports.getPenaltyN1 = function getPenaltyN1(data) {
        const size = data.size;
        let points = 0;
        let sameCountCol = 0;
        let sameCountRow = 0;
        let lastCol = null;
        let lastRow = null;
        for (let row = 0; row < size; row++) {
          sameCountCol = sameCountRow = 0;
          lastCol = lastRow = null;
          for (let col = 0; col < size; col++) {
            let module2 = data.get(row, col);
            if (module2 === lastCol) {
              sameCountCol++;
            } else {
              if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
              lastCol = module2;
              sameCountCol = 1;
            }
            module2 = data.get(col, row);
            if (module2 === lastRow) {
              sameCountRow++;
            } else {
              if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
              lastRow = module2;
              sameCountRow = 1;
            }
          }
          if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
          if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
        }
        return points;
      };
      exports.getPenaltyN2 = function getPenaltyN2(data) {
        const size = data.size;
        let points = 0;
        for (let row = 0; row < size - 1; row++) {
          for (let col = 0; col < size - 1; col++) {
            const last = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
            if (last === 4 || last === 0) points++;
          }
        }
        return points * PenaltyScores.N2;
      };
      exports.getPenaltyN3 = function getPenaltyN3(data) {
        const size = data.size;
        let points = 0;
        let bitsCol = 0;
        let bitsRow = 0;
        for (let row = 0; row < size; row++) {
          bitsCol = bitsRow = 0;
          for (let col = 0; col < size; col++) {
            bitsCol = bitsCol << 1 & 2047 | data.get(row, col);
            if (col >= 10 && (bitsCol === 1488 || bitsCol === 93)) points++;
            bitsRow = bitsRow << 1 & 2047 | data.get(col, row);
            if (col >= 10 && (bitsRow === 1488 || bitsRow === 93)) points++;
          }
        }
        return points * PenaltyScores.N3;
      };
      exports.getPenaltyN4 = function getPenaltyN4(data) {
        let darkCount = 0;
        const modulesCount = data.data.length;
        for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];
        const k = Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10);
        return k * PenaltyScores.N4;
      };
      function getMaskAt(maskPattern, i, j) {
        switch (maskPattern) {
          case exports.Patterns.PATTERN000:
            return (i + j) % 2 === 0;
          case exports.Patterns.PATTERN001:
            return i % 2 === 0;
          case exports.Patterns.PATTERN010:
            return j % 3 === 0;
          case exports.Patterns.PATTERN011:
            return (i + j) % 3 === 0;
          case exports.Patterns.PATTERN100:
            return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
          case exports.Patterns.PATTERN101:
            return i * j % 2 + i * j % 3 === 0;
          case exports.Patterns.PATTERN110:
            return (i * j % 2 + i * j % 3) % 2 === 0;
          case exports.Patterns.PATTERN111:
            return (i * j % 3 + (i + j) % 2) % 2 === 0;
          default:
            throw new Error("bad maskPattern:" + maskPattern);
        }
      }
      exports.applyMask = function applyMask(pattern, data) {
        const size = data.size;
        for (let col = 0; col < size; col++) {
          for (let row = 0; row < size; row++) {
            if (data.isReserved(row, col)) continue;
            data.xor(row, col, getMaskAt(pattern, row, col));
          }
        }
      };
      exports.getBestMask = function getBestMask(data, setupFormatFunc) {
        const numPatterns = Object.keys(exports.Patterns).length;
        let bestPattern = 0;
        let lowerPenalty = Infinity;
        for (let p = 0; p < numPatterns; p++) {
          setupFormatFunc(p);
          exports.applyMask(p, data);
          const penalty = exports.getPenaltyN1(data) + exports.getPenaltyN2(data) + exports.getPenaltyN3(data) + exports.getPenaltyN4(data);
          exports.applyMask(p, data);
          if (penalty < lowerPenalty) {
            lowerPenalty = penalty;
            bestPattern = p;
          }
        }
        return bestPattern;
      };
    }
  });

  // node_modules/qrcode/lib/core/error-correction-code.js
  var require_error_correction_code = __commonJS({
    "node_modules/qrcode/lib/core/error-correction-code.js"(exports) {
      var ECLevel = require_error_correction_level();
      var EC_BLOCKS_TABLE = [
        // L  M  Q  H
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        1,
        2,
        2,
        4,
        1,
        2,
        4,
        4,
        2,
        4,
        4,
        4,
        2,
        4,
        6,
        5,
        2,
        4,
        6,
        6,
        2,
        5,
        8,
        8,
        4,
        5,
        8,
        8,
        4,
        5,
        8,
        11,
        4,
        8,
        10,
        11,
        4,
        9,
        12,
        16,
        4,
        9,
        16,
        16,
        6,
        10,
        12,
        18,
        6,
        10,
        17,
        16,
        6,
        11,
        16,
        19,
        6,
        13,
        18,
        21,
        7,
        14,
        21,
        25,
        8,
        16,
        20,
        25,
        8,
        17,
        23,
        25,
        9,
        17,
        23,
        34,
        9,
        18,
        25,
        30,
        10,
        20,
        27,
        32,
        12,
        21,
        29,
        35,
        12,
        23,
        34,
        37,
        12,
        25,
        34,
        40,
        13,
        26,
        35,
        42,
        14,
        28,
        38,
        45,
        15,
        29,
        40,
        48,
        16,
        31,
        43,
        51,
        17,
        33,
        45,
        54,
        18,
        35,
        48,
        57,
        19,
        37,
        51,
        60,
        19,
        38,
        53,
        63,
        20,
        40,
        56,
        66,
        21,
        43,
        59,
        70,
        22,
        45,
        62,
        74,
        24,
        47,
        65,
        77,
        25,
        49,
        68,
        81
      ];
      var EC_CODEWORDS_TABLE = [
        // L  M  Q  H
        7,
        10,
        13,
        17,
        10,
        16,
        22,
        28,
        15,
        26,
        36,
        44,
        20,
        36,
        52,
        64,
        26,
        48,
        72,
        88,
        36,
        64,
        96,
        112,
        40,
        72,
        108,
        130,
        48,
        88,
        132,
        156,
        60,
        110,
        160,
        192,
        72,
        130,
        192,
        224,
        80,
        150,
        224,
        264,
        96,
        176,
        260,
        308,
        104,
        198,
        288,
        352,
        120,
        216,
        320,
        384,
        132,
        240,
        360,
        432,
        144,
        280,
        408,
        480,
        168,
        308,
        448,
        532,
        180,
        338,
        504,
        588,
        196,
        364,
        546,
        650,
        224,
        416,
        600,
        700,
        224,
        442,
        644,
        750,
        252,
        476,
        690,
        816,
        270,
        504,
        750,
        900,
        300,
        560,
        810,
        960,
        312,
        588,
        870,
        1050,
        336,
        644,
        952,
        1110,
        360,
        700,
        1020,
        1200,
        390,
        728,
        1050,
        1260,
        420,
        784,
        1140,
        1350,
        450,
        812,
        1200,
        1440,
        480,
        868,
        1290,
        1530,
        510,
        924,
        1350,
        1620,
        540,
        980,
        1440,
        1710,
        570,
        1036,
        1530,
        1800,
        570,
        1064,
        1590,
        1890,
        600,
        1120,
        1680,
        1980,
        630,
        1204,
        1770,
        2100,
        660,
        1260,
        1860,
        2220,
        720,
        1316,
        1950,
        2310,
        750,
        1372,
        2040,
        2430
      ];
      exports.getBlocksCount = function getBlocksCount(version, errorCorrectionLevel) {
        switch (errorCorrectionLevel) {
          case ECLevel.L:
            return EC_BLOCKS_TABLE[(version - 1) * 4 + 0];
          case ECLevel.M:
            return EC_BLOCKS_TABLE[(version - 1) * 4 + 1];
          case ECLevel.Q:
            return EC_BLOCKS_TABLE[(version - 1) * 4 + 2];
          case ECLevel.H:
            return EC_BLOCKS_TABLE[(version - 1) * 4 + 3];
          default:
            return void 0;
        }
      };
      exports.getTotalCodewordsCount = function getTotalCodewordsCount(version, errorCorrectionLevel) {
        switch (errorCorrectionLevel) {
          case ECLevel.L:
            return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0];
          case ECLevel.M:
            return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1];
          case ECLevel.Q:
            return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2];
          case ECLevel.H:
            return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3];
          default:
            return void 0;
        }
      };
    }
  });

  // node_modules/qrcode/lib/core/galois-field.js
  var require_galois_field = __commonJS({
    "node_modules/qrcode/lib/core/galois-field.js"(exports) {
      var EXP_TABLE = new Uint8Array(512);
      var LOG_TABLE = new Uint8Array(256);
      (function initTables() {
        let x = 1;
        for (let i = 0; i < 255; i++) {
          EXP_TABLE[i] = x;
          LOG_TABLE[x] = i;
          x <<= 1;
          if (x & 256) {
            x ^= 285;
          }
        }
        for (let i = 255; i < 512; i++) {
          EXP_TABLE[i] = EXP_TABLE[i - 255];
        }
      })();
      exports.log = function log(n) {
        if (n < 1) throw new Error("log(" + n + ")");
        return LOG_TABLE[n];
      };
      exports.exp = function exp(n) {
        return EXP_TABLE[n];
      };
      exports.mul = function mul(x, y) {
        if (x === 0 || y === 0) return 0;
        return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
      };
    }
  });

  // node_modules/qrcode/lib/core/polynomial.js
  var require_polynomial = __commonJS({
    "node_modules/qrcode/lib/core/polynomial.js"(exports) {
      var GF = require_galois_field();
      exports.mul = function mul(p1, p2) {
        const coeff = new Uint8Array(p1.length + p2.length - 1);
        for (let i = 0; i < p1.length; i++) {
          for (let j = 0; j < p2.length; j++) {
            coeff[i + j] ^= GF.mul(p1[i], p2[j]);
          }
        }
        return coeff;
      };
      exports.mod = function mod(divident, divisor) {
        let result = new Uint8Array(divident);
        while (result.length - divisor.length >= 0) {
          const coeff = result[0];
          for (let i = 0; i < divisor.length; i++) {
            result[i] ^= GF.mul(divisor[i], coeff);
          }
          let offset = 0;
          while (offset < result.length && result[offset] === 0) offset++;
          result = result.slice(offset);
        }
        return result;
      };
      exports.generateECPolynomial = function generateECPolynomial(degree) {
        let poly = new Uint8Array([1]);
        for (let i = 0; i < degree; i++) {
          poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
        }
        return poly;
      };
    }
  });

  // node_modules/qrcode/lib/core/reed-solomon-encoder.js
  var require_reed_solomon_encoder = __commonJS({
    "node_modules/qrcode/lib/core/reed-solomon-encoder.js"(exports, module) {
      var Polynomial = require_polynomial();
      function ReedSolomonEncoder(degree) {
        this.genPoly = void 0;
        this.degree = degree;
        if (this.degree) this.initialize(this.degree);
      }
      ReedSolomonEncoder.prototype.initialize = function initialize(degree) {
        this.degree = degree;
        this.genPoly = Polynomial.generateECPolynomial(this.degree);
      };
      ReedSolomonEncoder.prototype.encode = function encode(data) {
        if (!this.genPoly) {
          throw new Error("Encoder not initialized");
        }
        const paddedData = new Uint8Array(data.length + this.degree);
        paddedData.set(data);
        const remainder = Polynomial.mod(paddedData, this.genPoly);
        const start = this.degree - remainder.length;
        if (start > 0) {
          const buff = new Uint8Array(this.degree);
          buff.set(remainder, start);
          return buff;
        }
        return remainder;
      };
      module.exports = ReedSolomonEncoder;
    }
  });

  // node_modules/qrcode/lib/core/version-check.js
  var require_version_check = __commonJS({
    "node_modules/qrcode/lib/core/version-check.js"(exports) {
      exports.isValid = function isValid(version) {
        return !isNaN(version) && version >= 1 && version <= 40;
      };
    }
  });

  // node_modules/qrcode/lib/core/regex.js
  var require_regex = __commonJS({
    "node_modules/qrcode/lib/core/regex.js"(exports) {
      var numeric = "[0-9]+";
      var alphanumeric = "[A-Z $%*+\\-./:]+";
      var kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
      kanji = kanji.replace(/u/g, "\\u");
      var byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + ")(?:.|[\r\n]))+";
      exports.KANJI = new RegExp(kanji, "g");
      exports.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
      exports.BYTE = new RegExp(byte, "g");
      exports.NUMERIC = new RegExp(numeric, "g");
      exports.ALPHANUMERIC = new RegExp(alphanumeric, "g");
      var TEST_KANJI = new RegExp("^" + kanji + "$");
      var TEST_NUMERIC = new RegExp("^" + numeric + "$");
      var TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
      exports.testKanji = function testKanji(str) {
        return TEST_KANJI.test(str);
      };
      exports.testNumeric = function testNumeric(str) {
        return TEST_NUMERIC.test(str);
      };
      exports.testAlphanumeric = function testAlphanumeric(str) {
        return TEST_ALPHANUMERIC.test(str);
      };
    }
  });

  // node_modules/qrcode/lib/core/mode.js
  var require_mode = __commonJS({
    "node_modules/qrcode/lib/core/mode.js"(exports) {
      var VersionCheck = require_version_check();
      var Regex = require_regex();
      exports.NUMERIC = {
        id: "Numeric",
        bit: 1 << 0,
        ccBits: [10, 12, 14]
      };
      exports.ALPHANUMERIC = {
        id: "Alphanumeric",
        bit: 1 << 1,
        ccBits: [9, 11, 13]
      };
      exports.BYTE = {
        id: "Byte",
        bit: 1 << 2,
        ccBits: [8, 16, 16]
      };
      exports.KANJI = {
        id: "Kanji",
        bit: 1 << 3,
        ccBits: [8, 10, 12]
      };
      exports.MIXED = {
        bit: -1
      };
      exports.getCharCountIndicator = function getCharCountIndicator(mode, version) {
        if (!mode.ccBits) throw new Error("Invalid mode: " + mode);
        if (!VersionCheck.isValid(version)) {
          throw new Error("Invalid version: " + version);
        }
        if (version >= 1 && version < 10) return mode.ccBits[0];
        else if (version < 27) return mode.ccBits[1];
        return mode.ccBits[2];
      };
      exports.getBestModeForData = function getBestModeForData(dataStr) {
        if (Regex.testNumeric(dataStr)) return exports.NUMERIC;
        else if (Regex.testAlphanumeric(dataStr)) return exports.ALPHANUMERIC;
        else if (Regex.testKanji(dataStr)) return exports.KANJI;
        else return exports.BYTE;
      };
      exports.toString = function toString(mode) {
        if (mode && mode.id) return mode.id;
        throw new Error("Invalid mode");
      };
      exports.isValid = function isValid(mode) {
        return mode && mode.bit && mode.ccBits;
      };
      function fromString(string) {
        if (typeof string !== "string") {
          throw new Error("Param is not a string");
        }
        const lcStr = string.toLowerCase();
        switch (lcStr) {
          case "numeric":
            return exports.NUMERIC;
          case "alphanumeric":
            return exports.ALPHANUMERIC;
          case "kanji":
            return exports.KANJI;
          case "byte":
            return exports.BYTE;
          default:
            throw new Error("Unknown mode: " + string);
        }
      }
      exports.from = function from(value, defaultValue) {
        if (exports.isValid(value)) {
          return value;
        }
        try {
          return fromString(value);
        } catch (e) {
          return defaultValue;
        }
      };
    }
  });

  // node_modules/qrcode/lib/core/version.js
  var require_version = __commonJS({
    "node_modules/qrcode/lib/core/version.js"(exports) {
      var Utils = require_utils();
      var ECCode = require_error_correction_code();
      var ECLevel = require_error_correction_level();
      var Mode = require_mode();
      var VersionCheck = require_version_check();
      var G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
      var G18_BCH = Utils.getBCHDigit(G18);
      function getBestVersionForDataLength(mode, length, errorCorrectionLevel) {
        for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
          if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
            return currentVersion;
          }
        }
        return void 0;
      }
      function getReservedBitsCount(mode, version) {
        return Mode.getCharCountIndicator(mode, version) + 4;
      }
      function getTotalBitsFromDataArray(segments, version) {
        let totalBits = 0;
        segments.forEach(function(data) {
          const reservedBits = getReservedBitsCount(data.mode, version);
          totalBits += reservedBits + data.getBitsLength();
        });
        return totalBits;
      }
      function getBestVersionForMixedData(segments, errorCorrectionLevel) {
        for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
          const length = getTotalBitsFromDataArray(segments, currentVersion);
          if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
            return currentVersion;
          }
        }
        return void 0;
      }
      exports.from = function from(value, defaultValue) {
        if (VersionCheck.isValid(value)) {
          return parseInt(value, 10);
        }
        return defaultValue;
      };
      exports.getCapacity = function getCapacity(version, errorCorrectionLevel, mode) {
        if (!VersionCheck.isValid(version)) {
          throw new Error("Invalid QR Code version");
        }
        if (typeof mode === "undefined") mode = Mode.BYTE;
        const totalCodewords = Utils.getSymbolTotalCodewords(version);
        const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
        const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
        if (mode === Mode.MIXED) return dataTotalCodewordsBits;
        const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);
        switch (mode) {
          case Mode.NUMERIC:
            return Math.floor(usableBits / 10 * 3);
          case Mode.ALPHANUMERIC:
            return Math.floor(usableBits / 11 * 2);
          case Mode.KANJI:
            return Math.floor(usableBits / 13);
          case Mode.BYTE:
          default:
            return Math.floor(usableBits / 8);
        }
      };
      exports.getBestVersionForData = function getBestVersionForData(data, errorCorrectionLevel) {
        let seg;
        const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
        if (Array.isArray(data)) {
          if (data.length > 1) {
            return getBestVersionForMixedData(data, ecl);
          }
          if (data.length === 0) {
            return 1;
          }
          seg = data[0];
        } else {
          seg = data;
        }
        return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
      };
      exports.getEncodedBits = function getEncodedBits(version) {
        if (!VersionCheck.isValid(version) || version < 7) {
          throw new Error("Invalid QR Code version");
        }
        let d = version << 12;
        while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
          d ^= G18 << Utils.getBCHDigit(d) - G18_BCH;
        }
        return version << 12 | d;
      };
    }
  });

  // node_modules/qrcode/lib/core/format-info.js
  var require_format_info = __commonJS({
    "node_modules/qrcode/lib/core/format-info.js"(exports) {
      var Utils = require_utils();
      var G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
      var G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
      var G15_BCH = Utils.getBCHDigit(G15);
      exports.getEncodedBits = function getEncodedBits(errorCorrectionLevel, mask) {
        const data = errorCorrectionLevel.bit << 3 | mask;
        let d = data << 10;
        while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
          d ^= G15 << Utils.getBCHDigit(d) - G15_BCH;
        }
        return (data << 10 | d) ^ G15_MASK;
      };
    }
  });

  // node_modules/qrcode/lib/core/numeric-data.js
  var require_numeric_data = __commonJS({
    "node_modules/qrcode/lib/core/numeric-data.js"(exports, module) {
      var Mode = require_mode();
      function NumericData(data) {
        this.mode = Mode.NUMERIC;
        this.data = data.toString();
      }
      NumericData.getBitsLength = function getBitsLength(length) {
        return 10 * Math.floor(length / 3) + (length % 3 ? length % 3 * 3 + 1 : 0);
      };
      NumericData.prototype.getLength = function getLength() {
        return this.data.length;
      };
      NumericData.prototype.getBitsLength = function getBitsLength() {
        return NumericData.getBitsLength(this.data.length);
      };
      NumericData.prototype.write = function write(bitBuffer) {
        let i, group, value;
        for (i = 0; i + 3 <= this.data.length; i += 3) {
          group = this.data.substr(i, 3);
          value = parseInt(group, 10);
          bitBuffer.put(value, 10);
        }
        const remainingNum = this.data.length - i;
        if (remainingNum > 0) {
          group = this.data.substr(i);
          value = parseInt(group, 10);
          bitBuffer.put(value, remainingNum * 3 + 1);
        }
      };
      module.exports = NumericData;
    }
  });

  // node_modules/qrcode/lib/core/alphanumeric-data.js
  var require_alphanumeric_data = __commonJS({
    "node_modules/qrcode/lib/core/alphanumeric-data.js"(exports, module) {
      var Mode = require_mode();
      var ALPHA_NUM_CHARS = [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
        " ",
        "$",
        "%",
        "*",
        "+",
        "-",
        ".",
        "/",
        ":"
      ];
      function AlphanumericData(data) {
        this.mode = Mode.ALPHANUMERIC;
        this.data = data;
      }
      AlphanumericData.getBitsLength = function getBitsLength(length) {
        return 11 * Math.floor(length / 2) + 6 * (length % 2);
      };
      AlphanumericData.prototype.getLength = function getLength() {
        return this.data.length;
      };
      AlphanumericData.prototype.getBitsLength = function getBitsLength() {
        return AlphanumericData.getBitsLength(this.data.length);
      };
      AlphanumericData.prototype.write = function write(bitBuffer) {
        let i;
        for (i = 0; i + 2 <= this.data.length; i += 2) {
          let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
          value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
          bitBuffer.put(value, 11);
        }
        if (this.data.length % 2) {
          bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
        }
      };
      module.exports = AlphanumericData;
    }
  });

  // node_modules/qrcode/lib/core/byte-data.js
  var require_byte_data = __commonJS({
    "node_modules/qrcode/lib/core/byte-data.js"(exports, module) {
      var Mode = require_mode();
      function ByteData(data) {
        this.mode = Mode.BYTE;
        if (typeof data === "string") {
          this.data = new TextEncoder().encode(data);
        } else {
          this.data = new Uint8Array(data);
        }
      }
      ByteData.getBitsLength = function getBitsLength(length) {
        return length * 8;
      };
      ByteData.prototype.getLength = function getLength() {
        return this.data.length;
      };
      ByteData.prototype.getBitsLength = function getBitsLength() {
        return ByteData.getBitsLength(this.data.length);
      };
      ByteData.prototype.write = function(bitBuffer) {
        for (let i = 0, l = this.data.length; i < l; i++) {
          bitBuffer.put(this.data[i], 8);
        }
      };
      module.exports = ByteData;
    }
  });

  // node_modules/qrcode/lib/core/kanji-data.js
  var require_kanji_data = __commonJS({
    "node_modules/qrcode/lib/core/kanji-data.js"(exports, module) {
      var Mode = require_mode();
      var Utils = require_utils();
      function KanjiData(data) {
        this.mode = Mode.KANJI;
        this.data = data;
      }
      KanjiData.getBitsLength = function getBitsLength(length) {
        return length * 13;
      };
      KanjiData.prototype.getLength = function getLength() {
        return this.data.length;
      };
      KanjiData.prototype.getBitsLength = function getBitsLength() {
        return KanjiData.getBitsLength(this.data.length);
      };
      KanjiData.prototype.write = function(bitBuffer) {
        let i;
        for (i = 0; i < this.data.length; i++) {
          let value = Utils.toSJIS(this.data[i]);
          if (value >= 33088 && value <= 40956) {
            value -= 33088;
          } else if (value >= 57408 && value <= 60351) {
            value -= 49472;
          } else {
            throw new Error(
              "Invalid SJIS character: " + this.data[i] + "\nMake sure your charset is UTF-8"
            );
          }
          value = (value >>> 8 & 255) * 192 + (value & 255);
          bitBuffer.put(value, 13);
        }
      };
      module.exports = KanjiData;
    }
  });

  // node_modules/dijkstrajs/dijkstra.js
  var require_dijkstra = __commonJS({
    "node_modules/dijkstrajs/dijkstra.js"(exports, module) {
      "use strict";
      var dijkstra = {
        single_source_shortest_paths: function(graph, s, d) {
          var predecessors = {};
          var costs = {};
          costs[s] = 0;
          var open = dijkstra.PriorityQueue.make();
          open.push(s, 0);
          var closest, u, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit;
          while (!open.empty()) {
            closest = open.pop();
            u = closest.value;
            cost_of_s_to_u = closest.cost;
            adjacent_nodes = graph[u] || {};
            for (v in adjacent_nodes) {
              if (adjacent_nodes.hasOwnProperty(v)) {
                cost_of_e = adjacent_nodes[v];
                cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
                cost_of_s_to_v = costs[v];
                first_visit = typeof costs[v] === "undefined";
                if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
                  costs[v] = cost_of_s_to_u_plus_cost_of_e;
                  open.push(v, cost_of_s_to_u_plus_cost_of_e);
                  predecessors[v] = u;
                }
              }
            }
          }
          if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
            var msg = ["Could not find a path from ", s, " to ", d, "."].join("");
            throw new Error(msg);
          }
          return predecessors;
        },
        extract_shortest_path_from_predecessor_list: function(predecessors, d) {
          var nodes = [];
          var u = d;
          var predecessor;
          while (u) {
            nodes.push(u);
            predecessor = predecessors[u];
            u = predecessors[u];
          }
          nodes.reverse();
          return nodes;
        },
        find_path: function(graph, s, d) {
          var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
          return dijkstra.extract_shortest_path_from_predecessor_list(
            predecessors,
            d
          );
        },
        /**
         * A very naive priority queue implementation.
         */
        PriorityQueue: {
          make: function(opts) {
            var T = dijkstra.PriorityQueue, t = {}, key;
            opts = opts || {};
            for (key in T) {
              if (T.hasOwnProperty(key)) {
                t[key] = T[key];
              }
            }
            t.queue = [];
            t.sorter = opts.sorter || T.default_sorter;
            return t;
          },
          default_sorter: function(a, b) {
            return a.cost - b.cost;
          },
          /**
           * Add a new item to the queue and ensure the highest priority element
           * is at the front of the queue.
           */
          push: function(value, cost) {
            var item = { value, cost };
            this.queue.push(item);
            this.queue.sort(this.sorter);
          },
          /**
           * Return the highest priority element in the queue.
           */
          pop: function() {
            return this.queue.shift();
          },
          empty: function() {
            return this.queue.length === 0;
          }
        }
      };
      if (typeof module !== "undefined") {
        module.exports = dijkstra;
      }
    }
  });

  // node_modules/qrcode/lib/core/segments.js
  var require_segments = __commonJS({
    "node_modules/qrcode/lib/core/segments.js"(exports) {
      var Mode = require_mode();
      var NumericData = require_numeric_data();
      var AlphanumericData = require_alphanumeric_data();
      var ByteData = require_byte_data();
      var KanjiData = require_kanji_data();
      var Regex = require_regex();
      var Utils = require_utils();
      var dijkstra = require_dijkstra();
      function getStringByteLength(str) {
        return unescape(encodeURIComponent(str)).length;
      }
      function getSegments(regex, mode, str) {
        const segments = [];
        let result;
        while ((result = regex.exec(str)) !== null) {
          segments.push({
            data: result[0],
            index: result.index,
            mode,
            length: result[0].length
          });
        }
        return segments;
      }
      function getSegmentsFromString(dataStr) {
        const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
        const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
        let byteSegs;
        let kanjiSegs;
        if (Utils.isKanjiModeEnabled()) {
          byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
          kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
        } else {
          byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
          kanjiSegs = [];
        }
        const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);
        return segs.sort(function(s1, s2) {
          return s1.index - s2.index;
        }).map(function(obj) {
          return {
            data: obj.data,
            mode: obj.mode,
            length: obj.length
          };
        });
      }
      function getSegmentBitsLength(length, mode) {
        switch (mode) {
          case Mode.NUMERIC:
            return NumericData.getBitsLength(length);
          case Mode.ALPHANUMERIC:
            return AlphanumericData.getBitsLength(length);
          case Mode.KANJI:
            return KanjiData.getBitsLength(length);
          case Mode.BYTE:
            return ByteData.getBitsLength(length);
        }
      }
      function mergeSegments(segs) {
        return segs.reduce(function(acc, curr) {
          const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
          if (prevSeg && prevSeg.mode === curr.mode) {
            acc[acc.length - 1].data += curr.data;
            return acc;
          }
          acc.push(curr);
          return acc;
        }, []);
      }
      function buildNodes(segs) {
        const nodes = [];
        for (let i = 0; i < segs.length; i++) {
          const seg = segs[i];
          switch (seg.mode) {
            case Mode.NUMERIC:
              nodes.push([
                seg,
                { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
                { data: seg.data, mode: Mode.BYTE, length: seg.length }
              ]);
              break;
            case Mode.ALPHANUMERIC:
              nodes.push([
                seg,
                { data: seg.data, mode: Mode.BYTE, length: seg.length }
              ]);
              break;
            case Mode.KANJI:
              nodes.push([
                seg,
                { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
              ]);
              break;
            case Mode.BYTE:
              nodes.push([
                { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
              ]);
          }
        }
        return nodes;
      }
      function buildGraph(nodes, version) {
        const table = {};
        const graph = { start: {} };
        let prevNodeIds = ["start"];
        for (let i = 0; i < nodes.length; i++) {
          const nodeGroup = nodes[i];
          const currentNodeIds = [];
          for (let j = 0; j < nodeGroup.length; j++) {
            const node = nodeGroup[j];
            const key = "" + i + j;
            currentNodeIds.push(key);
            table[key] = { node, lastCount: 0 };
            graph[key] = {};
            for (let n = 0; n < prevNodeIds.length; n++) {
              const prevNodeId = prevNodeIds[n];
              if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
                graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);
                table[prevNodeId].lastCount += node.length;
              } else {
                if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;
                graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) + 4 + Mode.getCharCountIndicator(node.mode, version);
              }
            }
          }
          prevNodeIds = currentNodeIds;
        }
        for (let n = 0; n < prevNodeIds.length; n++) {
          graph[prevNodeIds[n]].end = 0;
        }
        return { map: graph, table };
      }
      function buildSingleSegment(data, modesHint) {
        let mode;
        const bestMode = Mode.getBestModeForData(data);
        mode = Mode.from(modesHint, bestMode);
        if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
          throw new Error('"' + data + '" cannot be encoded with mode ' + Mode.toString(mode) + ".\n Suggested mode is: " + Mode.toString(bestMode));
        }
        if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
          mode = Mode.BYTE;
        }
        switch (mode) {
          case Mode.NUMERIC:
            return new NumericData(data);
          case Mode.ALPHANUMERIC:
            return new AlphanumericData(data);
          case Mode.KANJI:
            return new KanjiData(data);
          case Mode.BYTE:
            return new ByteData(data);
        }
      }
      exports.fromArray = function fromArray(array) {
        return array.reduce(function(acc, seg) {
          if (typeof seg === "string") {
            acc.push(buildSingleSegment(seg, null));
          } else if (seg.data) {
            acc.push(buildSingleSegment(seg.data, seg.mode));
          }
          return acc;
        }, []);
      };
      exports.fromString = function fromString(data, version) {
        const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());
        const nodes = buildNodes(segs);
        const graph = buildGraph(nodes, version);
        const path = dijkstra.find_path(graph.map, "start", "end");
        const optimizedSegs = [];
        for (let i = 1; i < path.length - 1; i++) {
          optimizedSegs.push(graph.table[path[i]].node);
        }
        return exports.fromArray(mergeSegments(optimizedSegs));
      };
      exports.rawSplit = function rawSplit(data) {
        return exports.fromArray(
          getSegmentsFromString(data, Utils.isKanjiModeEnabled())
        );
      };
    }
  });

  // node_modules/qrcode/lib/core/qrcode.js
  var require_qrcode = __commonJS({
    "node_modules/qrcode/lib/core/qrcode.js"(exports) {
      var Utils = require_utils();
      var ECLevel = require_error_correction_level();
      var BitBuffer = require_bit_buffer();
      var BitMatrix = require_bit_matrix();
      var AlignmentPattern = require_alignment_pattern();
      var FinderPattern = require_finder_pattern();
      var MaskPattern = require_mask_pattern();
      var ECCode = require_error_correction_code();
      var ReedSolomonEncoder = require_reed_solomon_encoder();
      var Version = require_version();
      var FormatInfo = require_format_info();
      var Mode = require_mode();
      var Segments = require_segments();
      function setupFinderPattern(matrix, version) {
        const size = matrix.size;
        const pos = FinderPattern.getPositions(version);
        for (let i = 0; i < pos.length; i++) {
          const row = pos[i][0];
          const col = pos[i][1];
          for (let r = -1; r <= 7; r++) {
            if (row + r <= -1 || size <= row + r) continue;
            for (let c = -1; c <= 7; c++) {
              if (col + c <= -1 || size <= col + c) continue;
              if (r >= 0 && r <= 6 && (c === 0 || c === 6) || c >= 0 && c <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c >= 2 && c <= 4) {
                matrix.set(row + r, col + c, true, true);
              } else {
                matrix.set(row + r, col + c, false, true);
              }
            }
          }
        }
      }
      function setupTimingPattern(matrix) {
        const size = matrix.size;
        for (let r = 8; r < size - 8; r++) {
          const value = r % 2 === 0;
          matrix.set(r, 6, value, true);
          matrix.set(6, r, value, true);
        }
      }
      function setupAlignmentPattern(matrix, version) {
        const pos = AlignmentPattern.getPositions(version);
        for (let i = 0; i < pos.length; i++) {
          const row = pos[i][0];
          const col = pos[i][1];
          for (let r = -2; r <= 2; r++) {
            for (let c = -2; c <= 2; c++) {
              if (r === -2 || r === 2 || c === -2 || c === 2 || r === 0 && c === 0) {
                matrix.set(row + r, col + c, true, true);
              } else {
                matrix.set(row + r, col + c, false, true);
              }
            }
          }
        }
      }
      function setupVersionInfo(matrix, version) {
        const size = matrix.size;
        const bits = Version.getEncodedBits(version);
        let row, col, mod;
        for (let i = 0; i < 18; i++) {
          row = Math.floor(i / 3);
          col = i % 3 + size - 8 - 3;
          mod = (bits >> i & 1) === 1;
          matrix.set(row, col, mod, true);
          matrix.set(col, row, mod, true);
        }
      }
      function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
        const size = matrix.size;
        const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
        let i, mod;
        for (i = 0; i < 15; i++) {
          mod = (bits >> i & 1) === 1;
          if (i < 6) {
            matrix.set(i, 8, mod, true);
          } else if (i < 8) {
            matrix.set(i + 1, 8, mod, true);
          } else {
            matrix.set(size - 15 + i, 8, mod, true);
          }
          if (i < 8) {
            matrix.set(8, size - i - 1, mod, true);
          } else if (i < 9) {
            matrix.set(8, 15 - i - 1 + 1, mod, true);
          } else {
            matrix.set(8, 15 - i - 1, mod, true);
          }
        }
        matrix.set(size - 8, 8, 1, true);
      }
      function setupData(matrix, data) {
        const size = matrix.size;
        let inc = -1;
        let row = size - 1;
        let bitIndex = 7;
        let byteIndex = 0;
        for (let col = size - 1; col > 0; col -= 2) {
          if (col === 6) col--;
          while (true) {
            for (let c = 0; c < 2; c++) {
              if (!matrix.isReserved(row, col - c)) {
                let dark = false;
                if (byteIndex < data.length) {
                  dark = (data[byteIndex] >>> bitIndex & 1) === 1;
                }
                matrix.set(row, col - c, dark);
                bitIndex--;
                if (bitIndex === -1) {
                  byteIndex++;
                  bitIndex = 7;
                }
              }
            }
            row += inc;
            if (row < 0 || size <= row) {
              row -= inc;
              inc = -inc;
              break;
            }
          }
        }
      }
      function createData(version, errorCorrectionLevel, segments) {
        const buffer = new BitBuffer();
        segments.forEach(function(data) {
          buffer.put(data.mode.bit, 4);
          buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version));
          data.write(buffer);
        });
        const totalCodewords = Utils.getSymbolTotalCodewords(version);
        const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
        const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
        if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
          buffer.put(0, 4);
        }
        while (buffer.getLengthInBits() % 8 !== 0) {
          buffer.putBit(0);
        }
        const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
        for (let i = 0; i < remainingByte; i++) {
          buffer.put(i % 2 ? 17 : 236, 8);
        }
        return createCodewords(buffer, version, errorCorrectionLevel);
      }
      function createCodewords(bitBuffer, version, errorCorrectionLevel) {
        const totalCodewords = Utils.getSymbolTotalCodewords(version);
        const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
        const dataTotalCodewords = totalCodewords - ecTotalCodewords;
        const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);
        const blocksInGroup2 = totalCodewords % ecTotalBlocks;
        const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
        const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
        const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
        const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
        const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
        const rs = new ReedSolomonEncoder(ecCount);
        let offset = 0;
        const dcData = new Array(ecTotalBlocks);
        const ecData = new Array(ecTotalBlocks);
        let maxDataSize = 0;
        const buffer = new Uint8Array(bitBuffer.buffer);
        for (let b = 0; b < ecTotalBlocks; b++) {
          const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
          dcData[b] = buffer.slice(offset, offset + dataSize);
          ecData[b] = rs.encode(dcData[b]);
          offset += dataSize;
          maxDataSize = Math.max(maxDataSize, dataSize);
        }
        const data = new Uint8Array(totalCodewords);
        let index = 0;
        let i, r;
        for (i = 0; i < maxDataSize; i++) {
          for (r = 0; r < ecTotalBlocks; r++) {
            if (i < dcData[r].length) {
              data[index++] = dcData[r][i];
            }
          }
        }
        for (i = 0; i < ecCount; i++) {
          for (r = 0; r < ecTotalBlocks; r++) {
            data[index++] = ecData[r][i];
          }
        }
        return data;
      }
      function createSymbol(data, version, errorCorrectionLevel, maskPattern) {
        let segments;
        if (Array.isArray(data)) {
          segments = Segments.fromArray(data);
        } else if (typeof data === "string") {
          let estimatedVersion = version;
          if (!estimatedVersion) {
            const rawSegments = Segments.rawSplit(data);
            estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
          }
          segments = Segments.fromString(data, estimatedVersion || 40);
        } else {
          throw new Error("Invalid data");
        }
        const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
        if (!bestVersion) {
          throw new Error("The amount of data is too big to be stored in a QR Code");
        }
        if (!version) {
          version = bestVersion;
        } else if (version < bestVersion) {
          throw new Error(
            "\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: " + bestVersion + ".\n"
          );
        }
        const dataBits = createData(version, errorCorrectionLevel, segments);
        const moduleCount = Utils.getSymbolSize(version);
        const modules = new BitMatrix(moduleCount);
        setupFinderPattern(modules, version);
        setupTimingPattern(modules);
        setupAlignmentPattern(modules, version);
        setupFormatInfo(modules, errorCorrectionLevel, 0);
        if (version >= 7) {
          setupVersionInfo(modules, version);
        }
        setupData(modules, dataBits);
        if (isNaN(maskPattern)) {
          maskPattern = MaskPattern.getBestMask(
            modules,
            setupFormatInfo.bind(null, modules, errorCorrectionLevel)
          );
        }
        MaskPattern.applyMask(maskPattern, modules);
        setupFormatInfo(modules, errorCorrectionLevel, maskPattern);
        return {
          modules,
          version,
          errorCorrectionLevel,
          maskPattern,
          segments
        };
      }
      exports.create = function create(data, options) {
        if (typeof data === "undefined" || data === "") {
          throw new Error("No input text");
        }
        let errorCorrectionLevel = ECLevel.M;
        let version;
        let mask;
        if (typeof options !== "undefined") {
          errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
          version = Version.from(options.version);
          mask = MaskPattern.from(options.maskPattern);
          if (options.toSJISFunc) {
            Utils.setToSJISFunction(options.toSJISFunc);
          }
        }
        return createSymbol(data, version, errorCorrectionLevel, mask);
      };
    }
  });

  // node_modules/qrcode/lib/renderer/utils.js
  var require_utils2 = __commonJS({
    "node_modules/qrcode/lib/renderer/utils.js"(exports) {
      function hex2rgba(hex) {
        if (typeof hex === "number") {
          hex = hex.toString();
        }
        if (typeof hex !== "string") {
          throw new Error("Color should be defined as hex string");
        }
        let hexCode = hex.slice().replace("#", "").split("");
        if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
          throw new Error("Invalid hex color: " + hex);
        }
        if (hexCode.length === 3 || hexCode.length === 4) {
          hexCode = Array.prototype.concat.apply([], hexCode.map(function(c) {
            return [c, c];
          }));
        }
        if (hexCode.length === 6) hexCode.push("F", "F");
        const hexValue = parseInt(hexCode.join(""), 16);
        return {
          r: hexValue >> 24 & 255,
          g: hexValue >> 16 & 255,
          b: hexValue >> 8 & 255,
          a: hexValue & 255,
          hex: "#" + hexCode.slice(0, 6).join("")
        };
      }
      exports.getOptions = function getOptions(options) {
        if (!options) options = {};
        if (!options.color) options.color = {};
        const margin = typeof options.margin === "undefined" || options.margin === null || options.margin < 0 ? 4 : options.margin;
        const width = options.width && options.width >= 21 ? options.width : void 0;
        const scale = options.scale || 4;
        return {
          width,
          scale: width ? 4 : scale,
          margin,
          color: {
            dark: hex2rgba(options.color.dark || "#000000ff"),
            light: hex2rgba(options.color.light || "#ffffffff")
          },
          type: options.type,
          rendererOpts: options.rendererOpts || {}
        };
      };
      exports.getScale = function getScale(qrSize, opts) {
        return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
      };
      exports.getImageWidth = function getImageWidth(qrSize, opts) {
        const scale = exports.getScale(qrSize, opts);
        return Math.floor((qrSize + opts.margin * 2) * scale);
      };
      exports.qrToImageData = function qrToImageData(imgData, qr, opts) {
        const size = qr.modules.size;
        const data = qr.modules.data;
        const scale = exports.getScale(size, opts);
        const symbolSize = Math.floor((size + opts.margin * 2) * scale);
        const scaledMargin = opts.margin * scale;
        const palette = [opts.color.light, opts.color.dark];
        for (let i = 0; i < symbolSize; i++) {
          for (let j = 0; j < symbolSize; j++) {
            let posDst = (i * symbolSize + j) * 4;
            let pxColor = opts.color.light;
            if (i >= scaledMargin && j >= scaledMargin && i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
              const iSrc = Math.floor((i - scaledMargin) / scale);
              const jSrc = Math.floor((j - scaledMargin) / scale);
              pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
            }
            imgData[posDst++] = pxColor.r;
            imgData[posDst++] = pxColor.g;
            imgData[posDst++] = pxColor.b;
            imgData[posDst] = pxColor.a;
          }
        }
      };
    }
  });

  // node_modules/qrcode/lib/renderer/canvas.js
  var require_canvas = __commonJS({
    "node_modules/qrcode/lib/renderer/canvas.js"(exports) {
      var Utils = require_utils2();
      function clearCanvas(ctx, canvas, size) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!canvas.style) canvas.style = {};
        canvas.height = size;
        canvas.width = size;
        canvas.style.height = size + "px";
        canvas.style.width = size + "px";
      }
      function getCanvasElement() {
        try {
          return document.createElement("canvas");
        } catch (e) {
          throw new Error("You need to specify a canvas element");
        }
      }
      exports.render = function render(qrData, canvas, options) {
        let opts = options;
        let canvasEl = canvas;
        if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
          opts = canvas;
          canvas = void 0;
        }
        if (!canvas) {
          canvasEl = getCanvasElement();
        }
        opts = Utils.getOptions(opts);
        const size = Utils.getImageWidth(qrData.modules.size, opts);
        const ctx = canvasEl.getContext("2d");
        const image = ctx.createImageData(size, size);
        Utils.qrToImageData(image.data, qrData, opts);
        clearCanvas(ctx, canvasEl, size);
        ctx.putImageData(image, 0, 0);
        return canvasEl;
      };
      exports.renderToDataURL = function renderToDataURL(qrData, canvas, options) {
        let opts = options;
        if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
          opts = canvas;
          canvas = void 0;
        }
        if (!opts) opts = {};
        const canvasEl = exports.render(qrData, canvas, opts);
        const type = opts.type || "image/png";
        const rendererOpts = opts.rendererOpts || {};
        return canvasEl.toDataURL(type, rendererOpts.quality);
      };
    }
  });

  // node_modules/qrcode/lib/renderer/svg-tag.js
  var require_svg_tag = __commonJS({
    "node_modules/qrcode/lib/renderer/svg-tag.js"(exports) {
      var Utils = require_utils2();
      function getColorAttrib(color, attrib) {
        const alpha = color.a / 255;
        const str = attrib + '="' + color.hex + '"';
        return alpha < 1 ? str + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str;
      }
      function svgCmd(cmd, x, y) {
        let str = cmd + x;
        if (typeof y !== "undefined") str += " " + y;
        return str;
      }
      function qrToPath(data, size, margin) {
        let path = "";
        let moveBy = 0;
        let newRow = false;
        let lineLength = 0;
        for (let i = 0; i < data.length; i++) {
          const col = Math.floor(i % size);
          const row = Math.floor(i / size);
          if (!col && !newRow) newRow = true;
          if (data[i]) {
            lineLength++;
            if (!(i > 0 && col > 0 && data[i - 1])) {
              path += newRow ? svgCmd("M", col + margin, 0.5 + row + margin) : svgCmd("m", moveBy, 0);
              moveBy = 0;
              newRow = false;
            }
            if (!(col + 1 < size && data[i + 1])) {
              path += svgCmd("h", lineLength);
              lineLength = 0;
            }
          } else {
            moveBy++;
          }
        }
        return path;
      }
      exports.render = function render(qrData, options, cb) {
        const opts = Utils.getOptions(options);
        const size = qrData.modules.size;
        const data = qrData.modules.data;
        const qrcodesize = size + opts.margin * 2;
        const bg = !opts.color.light.a ? "" : "<path " + getColorAttrib(opts.color.light, "fill") + ' d="M0 0h' + qrcodesize + "v" + qrcodesize + 'H0z"/>';
        const path = "<path " + getColorAttrib(opts.color.dark, "stroke") + ' d="' + qrToPath(data, size, opts.margin) + '"/>';
        const viewBox = 'viewBox="0 0 ' + qrcodesize + " " + qrcodesize + '"';
        const width = !opts.width ? "" : 'width="' + opts.width + '" height="' + opts.width + '" ';
        const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path + "</svg>\n";
        if (typeof cb === "function") {
          cb(null, svgTag);
        }
        return svgTag;
      };
    }
  });

  // node_modules/qrcode/lib/browser.js
  var require_browser = __commonJS({
    "node_modules/qrcode/lib/browser.js"(exports) {
      var canPromise = require_can_promise();
      var QRCode2 = require_qrcode();
      var CanvasRenderer = require_canvas();
      var SvgRenderer = require_svg_tag();
      function renderCanvas(renderFunc, canvas, text, opts, cb) {
        const args = [].slice.call(arguments, 1);
        const argsNum = args.length;
        const isLastArgCb = typeof args[argsNum - 1] === "function";
        if (!isLastArgCb && !canPromise()) {
          throw new Error("Callback required as last argument");
        }
        if (isLastArgCb) {
          if (argsNum < 2) {
            throw new Error("Too few arguments provided");
          }
          if (argsNum === 2) {
            cb = text;
            text = canvas;
            canvas = opts = void 0;
          } else if (argsNum === 3) {
            if (canvas.getContext && typeof cb === "undefined") {
              cb = opts;
              opts = void 0;
            } else {
              cb = opts;
              opts = text;
              text = canvas;
              canvas = void 0;
            }
          }
        } else {
          if (argsNum < 1) {
            throw new Error("Too few arguments provided");
          }
          if (argsNum === 1) {
            text = canvas;
            canvas = opts = void 0;
          } else if (argsNum === 2 && !canvas.getContext) {
            opts = text;
            text = canvas;
            canvas = void 0;
          }
          return new Promise(function(resolve, reject) {
            try {
              const data = QRCode2.create(text, opts);
              resolve(renderFunc(data, canvas, opts));
            } catch (e) {
              reject(e);
            }
          });
        }
        try {
          const data = QRCode2.create(text, opts);
          cb(null, renderFunc(data, canvas, opts));
        } catch (e) {
          cb(e);
        }
      }
      exports.create = QRCode2.create;
      exports.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
      exports.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
      exports.toString = renderCanvas.bind(null, function(data, _, opts) {
        return SvgRenderer.render(data, opts);
      });
    }
  });

  // src/utils/url-params.ts
  var VALID_MODES = ["standard", "heavy sand", "techno", "moon gravity", "super ball"];
  var VALID_THEMES = ["nixie", "system", "studio", "cyber"];
  var VALID_TIMER_MODES = ["classic", "strict", "seconds", "off"];
  var VALID_APP_MODES = ["timer", "clock"];
  var DEFAULTS = {
    app: "timer",
    t: 3600,
    n: 3600,
    s: 0,
    // 0 means "generate from timestamp"
    rows: 24,
    mode: "standard",
    clock: false,
    theme: "nixie",
    timerMode: "classic",
    glow: 1,
    cs: true,
    friction: 1
  };
  function readParams() {
    const sp = new URLSearchParams(window.location.search);
    const raw = (key, fallback) => {
      const v = sp.get(key);
      if (v === null) return fallback;
      const num = parseInt(v, 10);
      return Number.isFinite(num) ? num : fallback;
    };
    let seed = raw("s", DEFAULTS.s);
    if (seed === 0) {
      seed = Date.now() % 1e6 | 1;
    }
    const appRaw = (sp.get("app") || DEFAULTS.app).toLowerCase().trim();
    const app = VALID_APP_MODES.includes(appRaw) ? appRaw : DEFAULTS.app;
    const modeRaw = (sp.get("mode") || DEFAULTS.mode).toLowerCase().trim();
    const mode = VALID_MODES.includes(modeRaw) ? modeRaw : DEFAULTS.mode;
    const clockRaw = sp.get("clock");
    const clock = clockRaw === null ? DEFAULTS.clock : clockRaw !== "false" && clockRaw !== "0";
    const themeRaw = (sp.get("theme") || DEFAULTS.theme).toLowerCase().trim();
    const theme = VALID_THEMES.includes(themeRaw) ? themeRaw : DEFAULTS.theme;
    const timerModeRaw = (sp.get("timerMode") || DEFAULTS.timerMode).toLowerCase().trim();
    const timerMode = VALID_TIMER_MODES.includes(timerModeRaw) ? timerModeRaw : DEFAULTS.timerMode;
    const glowRaw = sp.get("glow");
    const glow = glowRaw !== null ? Math.max(0, Math.min(2, parseFloat(glowRaw) || DEFAULTS.glow)) : DEFAULTS.glow;
    const csRaw = sp.get("cs");
    const cs = csRaw === null ? DEFAULTS.cs : csRaw !== "false" && csRaw !== "0";
    const frictionRaw = sp.get("friction");
    const friction = frictionRaw !== null ? Math.max(0.5, Math.min(3, parseFloat(frictionRaw) || DEFAULTS.friction)) : DEFAULTS.friction;
    return {
      app,
      t: Math.max(1, raw("t", DEFAULTS.t)),
      n: Math.max(10, Math.min(3600, raw("n", DEFAULTS.n))),
      s: seed,
      rows: Math.max(4, Math.min(64, raw("rows", DEFAULTS.rows))),
      mode,
      clock,
      theme,
      timerMode,
      glow,
      cs,
      friction
    };
  }
  function writeParams(cfg) {
    const sp = new URLSearchParams();
    sp.set("app", cfg.app);
    sp.set("t", String(cfg.t));
    sp.set("n", String(cfg.n));
    sp.set("s", String(cfg.s));
    sp.set("rows", String(cfg.rows));
    sp.set("mode", cfg.mode);
    sp.set("clock", String(cfg.clock));
    sp.set("theme", cfg.theme);
    sp.set("timerMode", cfg.timerMode);
    sp.set("glow", String(cfg.glow));
    sp.set("cs", String(cfg.cs));
    sp.set("friction", String(cfg.friction));
    const url = `${window.location.pathname}?${sp.toString()}`;
    window.history.replaceState(null, "", url);
  }

  // src/utils/seed.ts
  function createPRNG(seed) {
    let s = seed | 0;
    return () => {
      s |= 0;
      s = s + 1831565813 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // src/engine/simulation.ts
  var PRESETS = {
    "Standard": {
      restitution: 0.2,
      restitutionRange: 0.08,
      nudge: 0.08,
      dragX: 3,
      dragY: 1.5,
      dragXSettle: 6,
      dragYSettle: 3,
      gravity: 800
    },
    "Heavy Sand": {
      restitution: 0.01,
      restitutionRange: 0.02,
      nudge: 0.1,
      dragX: 6,
      dragY: 2,
      dragXSettle: 14,
      dragYSettle: 7,
      gravity: 1400
    },
    "Techno": {
      restitution: 0,
      restitutionRange: 0,
      nudge: 0.15,
      dragX: 10,
      dragY: 1,
      dragXSettle: 18,
      dragYSettle: 4,
      gravity: 1600
    },
    "Moon Gravity": {
      restitution: 0.08,
      restitutionRange: 0.03,
      nudge: 0.12,
      dragX: 2,
      dragY: 0.08,
      dragXSettle: 3,
      dragYSettle: 0.8,
      gravity: 50
    },
    "Super Ball": {
      restitution: 0.7,
      restitutionRange: 0.15,
      nudge: 0.04,
      dragX: 0.8,
      dragY: 0.4,
      dragXSettle: 2.5,
      dragYSettle: 1.2,
      gravity: 800
    }
  };
  var PHYSICS = { ...PRESETS["Standard"] };
  function fract(x) {
    return x - Math.floor(x);
  }
  function timeToHit(y, vy, g, targetY) {
    const dy = targetY - y;
    if (dy <= 0) return 0;
    if (Math.abs(g) < 1e-6) {
      return vy > 1e-9 ? dy / vy : Infinity;
    }
    const disc = vy * vy + 2 * g * dy;
    if (disc < 0) return Infinity;
    const sqrtDisc = Math.sqrt(disc);
    const t1 = (-vy + sqrtDisc) / g;
    const t2 = (-vy - sqrtDisc) / g;
    let t = Infinity;
    if (t1 > 1e-9) t = t1;
    if (t2 > 1e-9 && t2 < t) t = t2;
    return t;
  }
  function maxBinProbability(numRows) {
    const k = Math.floor(numRows / 2);
    let logC = 0;
    for (let i = 1; i <= numRows; i++) logC += Math.log(i);
    for (let i = 1; i <= k; i++) logC -= Math.log(i);
    for (let i = 1; i <= numRows - k; i++) logC -= Math.log(i);
    return Math.exp(logC - numRows * Math.LN2);
  }
  var PEG_COLLISION_FRAC = 0.3;
  var Simulation = class {
    constructor(cfg) {
      this.activeParticles = [];
      this.emittedCount = 0;
      this.elapsedMs = 0;
      this.allEmitted = false;
      this.allSettled = false;
      this.numRows = cfg.numRows;
      this.totalParticles = cfg.totalParticles;
      this.totalTimeMs = cfg.totalTimeSec * 1e3;
      this.rng = cfg.rng;
      this.binCounts = new Array(cfg.numRows + 1).fill(0);
      this.emitIntervalMs = this.totalTimeMs / cfg.totalParticles;
    }
    /**
     * Advance simulation. Returns newly-settled particles for baking.
     *
     * IMPORTANT: This method does NOT advance elapsedMs.
     * elapsedMs is set exclusively by the Worker timer via setElapsedMs().
     * Emission is derived from the current elapsedMs value.
     */
    update(dtMs, geom, getGroundY) {
      const dt = Math.min(dtMs, 100) / 1e3;
      const settled = [];
      if (!this.allEmitted) {
        const expectedEmitted = Math.min(
          this.totalParticles,
          Math.floor(this.elapsedMs / this.emitIntervalMs)
        );
        const toEmit = expectedEmitted - this.emittedCount;
        for (let i = 0; i < toEmit; i++) {
          this.activeParticles.push(this.createParticle(geom));
        }
        if (this.emittedCount >= this.totalParticles) this.allEmitted = true;
      }
      const alive = [];
      const halfBoard = geom.pegSpacing * (this.numRows / 2 + 1.5);
      const pegR = geom.pegSpacing * PEG_COLLISION_FRAC;
      for (const p of this.activeParticles) {
        const g = PHYSICS.gravity;
        const settling = p.pegIndex >= this.numRows;
        const dxCoeff = settling ? PHYSICS.dragXSettle : PHYSICS.dragX;
        const dyCoeff = settling ? PHYSICS.dragYSettle : PHYSICS.dragY;
        p.vx *= Math.exp(-dxCoeff * dt);
        p.vy *= Math.exp(-dyCoeff * dt);
        let remainDt = dt;
        let didSettle = false;
        const MAX_CCD_ITER = this.numRows + 2;
        for (let iter = 0; iter < MAX_CCD_ITER && remainDt > 0; iter++) {
          if (p.pegIndex < this.numRows) {
            const pegRowY = geom.pegY(p.pegIndex);
            const tHit = timeToHit(p.y, p.vy, g, pegRowY);
            if (tHit > remainDt) {
              p.x += p.vx * remainDt;
              p.y += p.vy * remainDt + 0.5 * g * remainDt * remainDt;
              p.vy += g * remainDt;
              remainDt = 0;
              break;
            }
            p.x += p.vx * tHit;
            p.vy += g * tHit;
            p.y = pegRowY;
            remainDt -= tHit;
            const dir = p.path[p.pegIndex];
            const bj = fract(p.jitter * 997 + p.pegIndex * 7.31);
            let hIdx = 0;
            for (let i = 0; i < p.pegIndex; i++) hIdx += p.path[i];
            const pegCX = geom.pegX(p.pegIndex, hIdx);
            const nudge = PHYSICS.nudge;
            p.x = p.x * (1 - nudge) + pegCX * nudge;
            let dx = p.x - pegCX;
            const minOff = pegR * (0.1 + 0.12 * bj);
            if (dir === 1 && dx < minOff) dx = minOff;
            if (dir === 0 && dx > -minOff) dx = -minOff;
            dx = Math.max(-pegR, Math.min(pegR, dx));
            const frac = dx / pegR;
            const nx = frac;
            const ny = -Math.sqrt(Math.max(0, 1 - frac * frac));
            const vDotN = p.vx * nx + p.vy * ny;
            if (vDotN < 0) {
              const e = PHYSICS.restitution + PHYSICS.restitutionRange * bj;
              p.vx -= (1 + e) * vDotN * nx;
              p.vy -= (1 + e) * vDotN * ny;
            }
            p.pegIndex++;
          } else {
            const groundY = getGroundY(p.x);
            const tGround = timeToHit(p.y, p.vy, g, groundY);
            if (tGround > remainDt) {
              p.x += p.vx * remainDt;
              p.y += p.vy * remainDt + 0.5 * g * remainDt * remainDt;
              p.vy += g * remainDt;
              remainDt = 0;
              break;
            }
            p.x += p.vx * tGround;
            p.y = groundY;
            p.settled = true;
            this.binCounts[p.bin]++;
            settled.push(p);
            didSettle = true;
            break;
          }
        }
        if (didSettle) continue;
        p.x = Math.max(geom.emitX - halfBoard, Math.min(geom.emitX + halfBoard, p.x));
        alive.push(p);
      }
      this.activeParticles = alive;
      if (this.allEmitted && alive.length === 0) this.allSettled = true;
      return settled;
    }
    getRemainingTimeSec() {
      return Math.max(0, (this.totalTimeMs - this.elapsedMs) / 1e3);
    }
    /**
     * Set elapsed time from Worker tick.
     * This is the SOLE source of truth for elapsed time.
     */
    setElapsedMs(ms) {
      this.elapsedMs = ms;
    }
    /** Add time to total duration and recalculate emission interval. */
    addTime(ms) {
      this.totalTimeMs += ms;
      this.emitIntervalMs = this.totalTimeMs / this.totalParticles;
    }
    /**
     * Instant-snap: emit all particles that SHOULD have been emitted by now
     * (based on current elapsedMs) but weren't. Skip physics; settle immediately.
     * Used after tab-hidden restore when elapsedMs has advanced but update() didn't run.
     */
    instantSnap(geom) {
      const expectedEmitted = Math.min(
        this.totalParticles,
        Math.floor(this.elapsedMs / this.emitIntervalMs)
      );
      const toEmit = expectedEmitted - this.emittedCount;
      if (toEmit <= 0) return [];
      const settled = [];
      for (let i = 0; i < toEmit; i++) {
        const p = this.createParticle(geom);
        p.settled = true;
        p.pegIndex = this.numRows;
        this.binCounts[p.bin]++;
        settled.push(p);
      }
      if (this.emittedCount >= this.totalParticles) this.allEmitted = true;
      return settled;
    }
    /**
     * Force-settle all active (in-flight) particles immediately.
     * Returns them for baking. Used when restoring from hidden tab.
     */
    forceSettleActive() {
      const settled = [];
      for (const p of this.activeParticles) {
        p.settled = true;
        p.pegIndex = this.numRows;
        this.binCounts[p.bin]++;
        settled.push(p);
      }
      this.activeParticles = [];
      return settled;
    }
    /** Reset simulation to initial state — all particles removed, counters zeroed. */
    reset() {
      this.activeParticles = [];
      this.binCounts.fill(0);
      this.emittedCount = 0;
      this.elapsedMs = 0;
      this.allEmitted = false;
      this.allSettled = false;
    }
    createParticle(geom) {
      const path = [];
      let bin = 0;
      for (let i = 0; i < this.numRows; i++) {
        const d = this.rng() < 0.5 ? 0 : 1;
        path.push(d);
        bin += d;
      }
      this.emittedCount++;
      return {
        path,
        bin,
        x: geom.emitX,
        y: geom.emitY,
        vx: 0,
        vy: 0,
        pegIndex: 0,
        settled: false,
        jitter: this.rng()
      };
    }
  };

  // src/engine/seven-seg.ts
  var DIGIT_SEGMENTS = [
    [true, true, true, true, true, true, false],
    // 0
    [false, true, true, false, false, false, false],
    // 1
    [true, true, false, true, true, false, true],
    // 2
    [true, true, true, true, false, false, true],
    // 3
    [false, true, true, false, false, true, true],
    // 4
    [true, false, true, true, false, true, true],
    // 5
    [true, false, true, true, true, true, true],
    // 6
    [true, true, true, false, false, false, false],
    // 7
    [true, true, true, true, true, true, true],
    // 8
    [true, true, true, true, false, true, true]
    // 9
  ];
  var CLOCK_THEMES = [
    { name: "Nixie", segmentRGB: [255, 147, 41], grainRGB: [255, 180, 100], glowIntensity: 1.2 },
    { name: "System", segmentRGB: [0, 255, 65], grainRGB: [120, 255, 140], glowIntensity: 0.8 },
    { name: "Studio", segmentRGB: [220, 220, 230], grainRGB: [230, 230, 240], glowIntensity: 1 },
    { name: "Cyber", segmentRGB: [0, 150, 255], grainRGB: [80, 180, 255], glowIntensity: 1 }
  ];
  function getThemeByName(name) {
    const lower = name.toLowerCase();
    return CLOCK_THEMES.find((t) => t.name.toLowerCase() === lower) || CLOCK_THEMES[0];
  }
  function drawSegmentPath(ctx, x, y, w, h, segIndex, thickness) {
    const ht = thickness / 2;
    const margin = thickness * 0.3;
    let sx, sy, len, horizontal;
    switch (segIndex) {
      case 0:
        sx = x + margin;
        sy = y;
        len = w - margin * 2;
        horizontal = true;
        break;
      case 1:
        sx = x + w;
        sy = y + margin;
        len = h / 2 - margin * 2;
        horizontal = false;
        break;
      case 2:
        sx = x + w;
        sy = y + h / 2 + margin;
        len = h / 2 - margin * 2;
        horizontal = false;
        break;
      case 3:
        sx = x + margin;
        sy = y + h;
        len = w - margin * 2;
        horizontal = true;
        break;
      case 4:
        sx = x;
        sy = y + h / 2 + margin;
        len = h / 2 - margin * 2;
        horizontal = false;
        break;
      case 5:
        sx = x;
        sy = y + margin;
        len = h / 2 - margin * 2;
        horizontal = false;
        break;
      case 6:
        sx = x + margin;
        sy = y + h / 2;
        len = w - margin * 2;
        horizontal = true;
        break;
      default:
        return;
    }
    if (horizontal) {
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + ht, sy - ht);
      ctx.lineTo(sx + len - ht, sy - ht);
      ctx.lineTo(sx + len, sy);
      ctx.lineTo(sx + len - ht, sy + ht);
      ctx.lineTo(sx + ht, sy + ht);
      ctx.closePath();
    } else {
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - ht, sy + ht);
      ctx.lineTo(sx - ht, sy + len - ht);
      ctx.lineTo(sx, sy + len);
      ctx.lineTo(sx + ht, sy + len - ht);
      ctx.lineTo(sx + ht, sy + ht);
      ctx.closePath();
    }
  }
  function drawDigit(ctx, x, y, w, h, segments, rgb, glowIntensity) {
    const thickness = Math.max(1.2, w * 0.07);
    const glowScales = [5.5, 4.5, 3.5, 2.8, 2.2, 1.8];
    const glowAlphaFactors = [0.5, 0.7, 1, 1, 1.2, 1.2];
    for (let s = 0; s < 7; s++) {
      if (segments[s]) {
        const glowAlpha = 0.09 * glowIntensity;
        for (let pass = 0; pass < 6; pass++) {
          ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(glowAlpha * glowAlphaFactors[pass]).toFixed(4)})`;
          ctx.beginPath();
          drawSegmentPath(ctx, x, y, w, h, s, thickness * glowScales[pass]);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.85)`;
        ctx.beginPath();
        drawSegmentPath(ctx, x, y, w, h, s, thickness);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.02)`;
        ctx.beginPath();
        drawSegmentPath(ctx, x, y, w, h, s, thickness);
        ctx.fill();
      }
    }
  }
  function drawColon(ctx, x, y, dotR, rgb, glowIntensity, digitH) {
    const topY = y - digitH * 0.2;
    const botY = y + digitH * 0.2;
    const alpha = 0.4;
    const glowAlpha = 0.09 * glowIntensity;
    for (const dy of [topY, botY]) {
      for (let pass = 0; pass < 3; pass++) {
        const scale = [3, 2.2, 1.6][pass];
        const factor = [0.6, 0.9, 1.1][pass];
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(glowAlpha * factor).toFixed(4)})`;
        ctx.beginPath();
        ctx.arc(x, dy, dotR * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.beginPath();
      ctx.arc(x, dy, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawClock(ctx, totalSec, cx, cy, digitH, theme, centiseconds) {
    const hh = Math.floor(totalSec / 3600);
    const mm = Math.floor(totalSec % 3600 / 60);
    const ss = Math.floor(totalSec % 60);
    const digitW = digitH * 0.5;
    const pairGap = digitW * 0.35;
    const groupGap = digitW * 1.3;
    const rgb = theme.segmentRGB;
    const glow = theme.glowIntensity;
    let groups;
    if (centiseconds !== void 0) {
      groups = [
        [Math.floor(mm / 10), mm % 10],
        [Math.floor(ss / 10), ss % 10],
        [Math.floor(centiseconds / 10), centiseconds % 10]
      ];
    } else if (hh > 0) {
      groups = [
        [Math.floor(hh / 10), hh % 10],
        [Math.floor(mm / 10), mm % 10],
        [Math.floor(ss / 10), ss % 10]
      ];
    } else {
      groups = [
        [Math.floor(mm / 10), mm % 10],
        [Math.floor(ss / 10), ss % 10]
      ];
    }
    const numGroups = groups.length;
    const pairW = digitW * 2 + pairGap;
    const totalW = pairW * numGroups + groupGap * (numGroups - 1);
    const startX = cx - totalW / 2;
    const startY = cy - digitH / 2;
    let dx = startX;
    const dotR = Math.max(1.2, digitW * 0.08);
    for (let g = 0; g < numGroups; g++) {
      const [d1, d2] = groups[g];
      drawDigit(ctx, dx, startY, digitW, digitH, DIGIT_SEGMENTS[d1], rgb, glow);
      dx += digitW + pairGap;
      drawDigit(ctx, dx, startY, digitW, digitH, DIGIT_SEGMENTS[d2], rgb, glow);
      dx += digitW;
      if (g < numGroups - 1) {
        const colonX = dx + groupGap / 2;
        drawColon(ctx, colonX, cy, dotR, rgb, glow, digitH);
        dx += groupGap;
      }
    }
  }

  // src/engine/layout.ts
  var SQRT3_2 = Math.sqrt(3) / 2;
  function computeLayout(w, h, dpr, numRows, totalParticles) {
    const centerX = w / 2;
    const marginX = w * 0.15;
    const contentW = w - marginX * 2;
    const topMargin = h * 0.05;
    const bottomMargin = h * 0.15;
    const safeH = h - topMargin - bottomMargin;
    const dxFromWidth = contentW / (numRows + 2);
    const inlineTimerH = h * 0.06;
    const gapBudget = h * 0.03;
    const availableForSystem = safeH - inlineTimerH - gapBudget;
    const boardH_target = availableForSystem * 3 / 5;
    const dxFromRatio = numRows > 1 ? boardH_target / ((numRows - 1) * SQRT3_2) : dxFromWidth;
    const pegSpacing = Math.min(dxFromWidth, dxFromRatio);
    const rowSpacingY = pegSpacing * SQRT3_2;
    const boardH = numRows > 1 ? (numRows - 1) * rowSpacingY : 0;
    const grainRadius = Math.max(1.2, Math.min(3.5, pegSpacing * 0.09));
    const pegRadius = Math.max(1.5, Math.min(5, pegSpacing * 0.12));
    const nozzleHW = pegSpacing * 0.8;
    const gridHW = numRows * pegSpacing / 2;
    const hopperTopHW = Math.max(pegSpacing * 4, gridHW * 1.3);
    const hopperRectHW = hopperTopHW;
    const taperH = Math.max(boardH / 3, pegSpacing * 2.5);
    const hopperToGrid = Math.max(pegSpacing * 0.6, h * 0.012);
    const gridToAcc = Math.max(pegSpacing * 0.7, h * 0.015);
    const accBottom = h - bottomMargin;
    const aboveAccH = inlineTimerH + taperH + hopperToGrid + boardH + gridToAcc;
    const accHeight_available = safeH - aboveAccH;
    const accHeight = Math.max(pegSpacing * 2, Math.min(accHeight_available, boardH / 2));
    const maxProb = maxBinProbability(numRows);
    const maxBinCount = maxProb * totalParticles * 1.15;
    const accTop = accBottom - accHeight;
    const boardBottom = accTop - gridToAcc;
    const boardTopY = boardBottom - boardH;
    const hopperBottom = boardTopY - hopperToGrid;
    const hopperTop = hopperBottom - taperH;
    const hopperJunction = hopperTop;
    const emitY = hopperBottom + hopperToGrid * 0.55;
    const inlineTimerY = Math.max(topMargin + inlineTimerH * 0.5, hopperTop - inlineTimerH * 0.6);
    const stackScale = accHeight * 0.85 / (maxProb * totalParticles);
    const d_natural = grainRadius * 1.6;
    const rowH_natural = d_natural * SQRT3_2;
    const peakCeiling = accHeight * 0.95;
    const stackRowH = maxBinCount > 0 ? Math.min(rowH_natural, peakCeiling / maxBinCount) : rowH_natural;
    const miniGrainR = Math.max(0.8, grainRadius * 0.55);
    let finalHopperTop = hopperTop;
    let finalHopperJunction = hopperJunction;
    let finalHopperBottom = hopperBottom;
    let finalEmitY = emitY;
    let finalBoardTop = boardTopY;
    let finalBoardBottom = boardBottom;
    let finalAccTop = accTop;
    let finalAccBottom = accBottom;
    let finalInlineTimerY = inlineTimerY;
    const contentTop = finalInlineTimerY - inlineTimerH * 0.5;
    const contentBottom = finalAccBottom;
    const totalContentH = contentBottom - contentTop;
    const idealOffsetY = (h - totalContentH) / 2 - contentTop;
    const uiSafeBottom = h * 0.12;
    const maxOffset = h - uiSafeBottom - finalAccBottom;
    const minOffset = topMargin - contentTop;
    const offsetY = Math.max(minOffset, Math.min(idealOffsetY, maxOffset));
    finalHopperTop += offsetY;
    finalHopperJunction += offsetY;
    finalHopperBottom += offsetY;
    finalEmitY += offsetY;
    finalBoardTop += offsetY;
    finalBoardBottom += offsetY;
    finalAccTop += offsetY;
    finalAccBottom += offsetY;
    finalInlineTimerY += offsetY;
    return {
      width: w,
      height: h,
      dpr,
      centerX,
      contentW,
      hopperTop: finalHopperTop,
      hopperJunction: finalHopperJunction,
      hopperBottom: finalHopperBottom,
      hopperRectHW,
      hopperTopHW: hopperRectHW,
      nozzleHW,
      hopperSigma: taperH * 0.47 / pegSpacing,
      emitY: finalEmitY,
      boardTop: finalBoardTop,
      boardBottom: finalBoardBottom,
      accTop: finalAccTop,
      accBottom: finalAccBottom,
      accHeight,
      inlineTimerY: finalInlineTimerY,
      pegSpacing,
      rowSpacingY,
      numRows,
      pegRadius,
      grainRadius,
      settledDiameter: stackRowH,
      settledRadius: stackRowH / 2,
      stackScale,
      stackRowH,
      miniGrainR
    };
  }
  function pegX(L, row, index) {
    return L.centerX + (index - row / 2) * L.pegSpacing;
  }
  function pegY(L, row) {
    return L.boardTop + row * L.rowSpacingY;
  }
  function gaussianHW(y, L) {
    const totalH = L.hopperBottom - L.hopperTop;
    if (totalH <= 0) return L.nozzleHW;
    const t = Math.max(0, Math.min(1, (L.hopperBottom - y) / totalH));
    const sigPx = L.hopperSigma * L.pegSpacing;
    const d = t * totalH;
    const gaussVal = 1 - Math.exp(-(d * d) / (2 * sigPx * sigPx));
    return L.nozzleHW + (L.hopperTopHW - L.nozzleHW) * gaussVal;
  }
  function computeHopperGrains(L, totalCount, grainR) {
    const grains = [];
    const d = grainR * 2.1;
    const rowH = d * SQRT3_2;
    const cx = L.centerX;
    const trapH = L.hopperBottom - L.hopperJunction;
    let row = 0;
    let y = L.hopperBottom - grainR * 1.5;
    while (grains.length < totalCount) {
      const hw = gaussianHW(y, L);
      const usableW = hw * 0.88;
      const xOff = row % 2 === 1 ? d * 0.5 : 0;
      const nCols = Math.max(1, Math.floor(usableW * 2 / d));
      for (let c = 0; c < nCols && grains.length < totalCount; c++) {
        const gx = cx - usableW + xOff + c * d + grainR;
        const seed = row * 1009 + c * 7919 + 31337 & 2147483647;
        const jx = (seed % 1e3 / 1e3 - 0.5) * grainR * 0.5;
        const jy = ((seed * 1103515245 + 12345 & 2147483647) % 1e3 / 1e3 - 0.5) * grainR * 0.4;
        grains.push({ x: gx + jx, y: y + jy });
      }
      y -= rowH;
      row++;
    }
    return grains;
  }
  function stackJitterX(bin, k, maxJitter) {
    const hash = bin * 2654435761 + k * 340573321 >>> 0 & 2147483647;
    return (hash % 1e4 / 1e4 - 0.5) * 2 * maxJitter;
  }
  function stackJitterY(bin, k, maxJitter) {
    const hash = bin * 1103515245 + k * 1299709 >>> 0 & 2147483647;
    return (hash % 1e4 / 1e4 - 0.5) * 2 * maxJitter;
  }

  // src/engine/grain-renderer.ts
  var PI2 = Math.PI * 2;
  var GRAIN_ALPHA = 0.85;
  var GRAIN_GLOW_ALPHA = 0.06;
  var GRAIN_GLOW_SCALE = 2.5;
  var STATIC_GRAIN_ALPHA = 1;
  var GrainRenderer = class {
    // opaque — for baked stack grains
    constructor(container2) {
      /** Hopper grain positions (pre-computed). */
      this.hopperGrainCache = [];
      // ── Purge drain animation ──
      this.purgeOffsets = [];
      this.purgeVelocities = [];
      this.purgeDelays = [];
      this.purgeAlphas = [];
      this.purging = false;
      // ── Grain colors ──
      this.grainCoreFill = "";
      this.grainGlowFill = "";
      this.staticGrainFill = "";
      this.staticCanvas = document.createElement("canvas");
      this.dynamicCanvas = document.createElement("canvas");
      for (const c of [this.staticCanvas, this.dynamicCanvas]) {
        c.style.position = "absolute";
        c.style.top = "0";
        c.style.left = "0";
        container2.appendChild(c);
      }
      this.sCtx = this.staticCanvas.getContext("2d");
      this.dCtx = this.dynamicCanvas.getContext("2d");
      this.binCounts = [];
    }
    updateGrainColors(theme) {
      const [r, g, b] = theme.grainRGB;
      this.grainCoreFill = `rgba(${r},${g},${b},${GRAIN_ALPHA})`;
      this.grainGlowFill = `rgba(${r},${g},${b},${GRAIN_GLOW_ALPHA})`;
      this.staticGrainFill = `rgba(${r},${g},${b},${STATIC_GRAIN_ALPHA})`;
    }
    applyLayout(L, totalParticles) {
      const w = L.width;
      const h = L.height;
      const dpr = L.dpr;
      for (const c of [this.staticCanvas, this.dynamicCanvas]) {
        c.width = w * dpr;
        c.height = h * dpr;
        c.style.width = w + "px";
        c.style.height = h + "px";
      }
      this.sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.dCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.binCounts = new Array(L.numRows + 1).fill(0);
      this.sCtx.clearRect(0, 0, w, h);
      this.hopperGrainCache = computeHopperGrains(L, totalParticles, L.miniGrainR);
    }
    getBinCounts() {
      return this.binCounts;
    }
    // ── Baking — grain with slot-width X jitter ──
    bakeParticle(L, p) {
      const bin = p.bin;
      this.binCounts[bin]++;
      const count = this.binCounts[bin];
      const binX = pegX(L, L.numRows - 1, bin);
      const mr = L.miniGrainR;
      const d = mr * 2.1;
      const rowH = L.stackRowH;
      const maxJitterX = Math.min(4, mr * 2.5);
      const maxJitterY = rowH * 0.18;
      const hexOff = count % 2 === 0 ? d * 0.5 : 0;
      const jx = stackJitterX(bin, count, maxJitterX);
      const jy = stackJitterY(bin, count, maxJitterY);
      const grainX = binX + hexOff + jx;
      const grainY = L.accBottom - (count - 0.5) * rowH + jy;
      const ctx = this.sCtx;
      ctx.fillStyle = this.staticGrainFill;
      ctx.beginPath();
      ctx.arc(grainX, grainY, mr, 0, PI2);
      ctx.fill();
    }
    /** Rebake all settled grains with current grain color. */
    rebakeStatic(L, _theme) {
      if (!L) return;
      this.sCtx.clearRect(0, 0, L.width, L.height);
      const mr = L.miniGrainR;
      const d = mr * 2.1;
      const rowH = L.stackRowH;
      const maxJitterX = Math.min(4, mr * 2.5);
      const maxJitterY = rowH * 0.18;
      this.sCtx.fillStyle = this.staticGrainFill;
      this.sCtx.beginPath();
      for (let bin = 0; bin <= L.numRows; bin++) {
        const binX = pegX(L, L.numRows - 1, bin);
        for (let k = 1; k <= this.binCounts[bin]; k++) {
          const hexOff = k % 2 === 0 ? d * 0.5 : 0;
          const jx = stackJitterX(bin, k, maxJitterX);
          const jy = stackJitterY(bin, k, maxJitterY);
          const gx = binX + hexOff + jx;
          const gy = L.accBottom - (k - 0.5) * rowH + jy;
          this.sCtx.moveTo(gx + mr, gy);
          this.sCtx.arc(gx, gy, mr, 0, PI2);
        }
      }
      this.sCtx.fill();
    }
    drawHopper(ctx, L, emitted, total) {
      const cx = L.centerX;
      ctx.save();
      const visTop = Math.max(0, L.hopperTop);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 0.5;
      const nSamples = 40;
      ctx.beginPath();
      for (let i = 0; i <= nSamples; i++) {
        const y = visTop + (L.hopperBottom - visTop) * (i / nSamples);
        const hw = gaussianHW(y, L);
        if (i === 0) ctx.moveTo(cx + hw, y);
        else ctx.lineTo(cx + hw, y);
      }
      for (let i = nSamples; i >= 0; i--) {
        const y = visTop + (L.hopperBottom - visTop) * (i / nSamples);
        const hw = gaussianHW(y, L);
        ctx.lineTo(cx - hw, y);
      }
      ctx.closePath();
      ctx.stroke();
      const remaining = Math.max(0, total - emitted);
      const visibleCount = Math.min(remaining, this.hopperGrainCache.length);
      if (visibleCount > 0) {
        const r = L.miniGrainR;
        ctx.fillStyle = this.grainGlowFill;
        ctx.beginPath();
        for (let i = 0; i < visibleCount; i++) {
          const g = this.hopperGrainCache[i];
          if (g.y < -r * 3) continue;
          ctx.moveTo(g.x + r * GRAIN_GLOW_SCALE, g.y);
          ctx.arc(g.x, g.y, r * GRAIN_GLOW_SCALE, 0, PI2);
        }
        ctx.fill();
        ctx.fillStyle = this.grainCoreFill;
        ctx.beginPath();
        for (let i = 0; i < visibleCount; i++) {
          const g = this.hopperGrainCache[i];
          if (g.y < -r) continue;
          ctx.moveTo(g.x + r, g.y);
          ctx.arc(g.x, g.y, r, 0, PI2);
        }
        ctx.fill();
      }
      if (remaining > 0) {
        const now = performance.now();
        const r = L.miniGrainR;
        const streamCount = remaining < 10 ? Math.max(1, Math.ceil(remaining / 3)) : 4;
        for (let i = 0; i < streamCount; i++) {
          const phase = (now * 3e-3 + i * 0.25) % 1;
          const sy = L.hopperBottom + (L.emitY - L.hopperBottom) * phase;
          ctx.globalAlpha = 0.4 * (1 - phase * 0.8);
          ctx.fillStyle = this.grainCoreFill;
          ctx.beginPath();
          ctx.arc(cx, sy, r * 0.7, 0, PI2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    drawPegs(ctx, L, theme, pegAlphaOverride) {
      const [pr, pg, pb] = theme.segmentRGB;
      const alpha = pegAlphaOverride !== void 0 ? pegAlphaOverride : 0.15;
      const themeWeight = pegAlphaOverride !== void 0 && pegAlphaOverride > 0.5 ? 0.6 : 0.3;
      const grayWeight = 1 - themeWeight;
      const blendR = Math.round(pr * themeWeight + 180 * grayWeight);
      const blendG = Math.round(pg * themeWeight + 180 * grayWeight);
      const blendB = Math.round(pb * themeWeight + 180 * grayWeight);
      ctx.fillStyle = `rgba(${blendR},${blendG},${blendB},${alpha.toFixed(3)})`;
      ctx.beginPath();
      for (let row = 0; row < L.numRows; row++) {
        for (let j = 0; j <= row; j++) {
          const x = pegX(L, row, j);
          const y = pegY(L, row);
          ctx.moveTo(x + L.pegRadius, y);
          ctx.arc(x, y, L.pegRadius, 0, PI2);
        }
      }
      ctx.fill();
    }
    drawParticles(ctx, L, particles) {
      if (particles.length === 0) return;
      const r = L.grainRadius;
      ctx.fillStyle = this.grainGlowFill;
      ctx.beginPath();
      for (const p of particles) {
        ctx.moveTo(p.x + r * GRAIN_GLOW_SCALE, p.y);
        ctx.arc(p.x, p.y, r * GRAIN_GLOW_SCALE, 0, PI2);
      }
      ctx.fill();
      ctx.fillStyle = this.grainCoreFill;
      ctx.beginPath();
      for (const p of particles) {
        ctx.moveTo(p.x + r, p.y);
        ctx.arc(p.x, p.y, r, 0, PI2);
      }
      ctx.fill();
    }
    drawRainParticles(ctx, L, rain, theme) {
      const r = L.miniGrainR;
      const [gr, gg, gb] = theme.grainRGB;
      for (const p of rain) {
        ctx.globalAlpha = p.alpha * (GRAIN_GLOW_ALPHA / GRAIN_ALPHA);
        ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * GRAIN_GLOW_SCALE, 0, PI2);
        ctx.fill();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, PI2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // ── Purge drain animation ──
    beginPurge(L) {
      const numBins = L.numRows + 1;
      this.purgeOffsets = new Array(numBins).fill(0);
      this.purgeVelocities = new Array(numBins).fill(0);
      this.purgeDelays = [];
      this.purgeAlphas = new Array(numBins).fill(1);
      for (let i = 0; i < numBins; i++) {
        const hash = i * 2654435761 >>> 0 & 2147483647;
        this.purgeDelays.push(hash % 1e3 / 1e3 * 0.2);
      }
      this.purging = true;
    }
    /**
     * Drain animation: each bin's grains fall with gravity.
     * Returns true when fully drained.
     */
    purgeStacks(L, dt, theme) {
      this.sCtx.clearRect(0, 0, L.width, L.height);
      if (!this.purging) {
        this.binCounts.fill(0);
        return true;
      }
      const mr = L.miniGrainR;
      const d = mr * 2.1;
      const rowH = L.stackRowH;
      const maxJitterX = Math.min(4, mr * 2.5);
      const maxJitterY = rowH * 0.18;
      const gravity = 1500;
      let allDone = true;
      for (let bin = 0; bin <= L.numRows; bin++) {
        if (this.binCounts[bin] === 0) continue;
        if (this.purgeDelays[bin] > 0) {
          this.purgeDelays[bin] -= dt;
          allDone = false;
          continue;
        }
        this.purgeVelocities[bin] += gravity * dt;
        this.purgeOffsets[bin] += this.purgeVelocities[bin] * dt;
        this.purgeAlphas[bin] = Math.max(0, 1 - this.purgeOffsets[bin] / (L.height * 0.6));
        if (this.purgeAlphas[bin] > 0) {
          allDone = false;
        }
      }
      if (allDone) {
        this.binCounts.fill(0);
        this.purging = false;
        return true;
      }
      const [gr, gg, gb] = theme.grainRGB;
      this.sCtx.beginPath();
      let anyGlow = false;
      for (let bin = 0; bin <= L.numRows; bin++) {
        const alpha = this.purgeAlphas[bin];
        if (alpha <= 0 || this.binCounts[bin] === 0) continue;
        const offset = this.purgeOffsets[bin];
        const binX = pegX(L, L.numRows - 1, bin);
        for (let k = 0; k < this.binCounts[bin]; k++) {
          const kk = k + 1;
          const hexOff = kk % 2 === 0 ? d * 0.5 : 0;
          const jx = stackJitterX(bin, kk, maxJitterX);
          const jy = stackJitterY(bin, kk, maxJitterY);
          const gx = binX + hexOff + jx;
          const gy = L.accBottom - (k + 0.5) * rowH + jy + offset;
          if (gy > L.height + mr * 3) continue;
          if (!anyGlow) {
            anyGlow = true;
          }
          this.sCtx.moveTo(gx + mr * GRAIN_GLOW_SCALE, gy);
          this.sCtx.arc(gx, gy, mr * GRAIN_GLOW_SCALE, 0, PI2);
        }
      }
      if (anyGlow) {
        this.sCtx.fillStyle = `rgba(${gr},${gg},${gb},${GRAIN_GLOW_ALPHA})`;
        this.sCtx.fill();
      }
      for (let bin = 0; bin <= L.numRows; bin++) {
        const alpha = this.purgeAlphas[bin];
        if (alpha <= 0 || this.binCounts[bin] === 0) continue;
        const offset = this.purgeOffsets[bin];
        const binX = pegX(L, L.numRows - 1, bin);
        this.sCtx.fillStyle = `rgba(${gr},${gg},${gb},${(GRAIN_ALPHA * alpha).toFixed(3)})`;
        this.sCtx.beginPath();
        for (let k = 0; k < this.binCounts[bin]; k++) {
          const kk = k + 1;
          const hexOff = kk % 2 === 0 ? d * 0.5 : 0;
          const jx = stackJitterX(bin, kk, maxJitterX);
          const jy = stackJitterY(bin, kk, maxJitterY);
          const gx = binX + hexOff + jx;
          const gy = L.accBottom - (k + 0.5) * rowH + jy + offset;
          if (gy > L.height + mr) continue;
          this.sCtx.moveTo(gx + mr, gy);
          this.sCtx.arc(gx, gy, mr, 0, PI2);
        }
        this.sCtx.fill();
      }
      return false;
    }
    clearStatic(L) {
      this.binCounts.fill(0);
      this.sCtx.clearRect(0, 0, L.width, L.height);
      this.purging = false;
    }
    /** Ground height based on nearest bin's grain count. */
    getGroundY(L, x) {
      const numBins = L.numRows + 1;
      let nearestBin = 0;
      let minDist = Infinity;
      for (let b = 0; b < numBins; b++) {
        const bx = pegX(L, L.numRows - 1, b);
        const dist = Math.abs(x - bx);
        if (dist < minDist) {
          minDist = dist;
          nearestBin = b;
        }
      }
      return L.accBottom - this.binCounts[nearestBin] * L.stackRowH;
    }
  };

  // src/engine/renderer.ts
  var Renderer = class {
    constructor(container2, numRows, totalParticles, _seed) {
      // ── Theme & clock ──
      this.clockEnabled = true;
      this.currentTheme = CLOCK_THEMES[0];
      // ── Alarm ──
      this.alarmActive = false;
      this.alarmFlashStart = 0;
      this.alarmHighlight = false;
      this.totalParticles = totalParticles;
      this.gr = new GrainRenderer(container2);
      this.gr.updateGrainColors(this.currentTheme);
      this.resize(numRows);
    }
    setClockEnabled(v) {
      this.clockEnabled = v;
    }
    setTheme(theme) {
      this.currentTheme = theme;
      this.gr.updateGrainColors(theme);
      const [r, g, b] = theme.segmentRGB;
      document.documentElement.style.setProperty(
        "--bg",
        `rgb(${Math.round(r * 0.02)},${Math.round(g * 0.02)},${Math.round(b * 0.02)})`
      );
      this.gr.rebakeStatic(this.layout, theme);
    }
    setThemeByName(name) {
      this.setTheme(getThemeByName(name));
    }
    setGlowIntensity(v) {
      this.currentTheme = { ...this.currentTheme, glowIntensity: v };
    }
    getTheme() {
      return this.currentTheme;
    }
    resize(numRows) {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.layout = computeLayout(w, h, dpr, numRows, this.totalParticles);
      this.gr.applyLayout(this.layout, this.totalParticles);
    }
    // ── Geometry for simulation ──
    pegX(row, index) {
      return pegX(this.layout, row, index);
    }
    pegY(row) {
      return pegY(this.layout, row);
    }
    getGeom() {
      return {
        emitX: this.layout.centerX,
        emitY: this.layout.emitY,
        pegX: (r, i) => this.pegX(r, i),
        pegY: (r) => this.pegY(r),
        pegSpacing: this.layout.pegSpacing,
        numRows: this.layout.numRows,
        accBottom: this.layout.accBottom
      };
    }
    /** Ground height based on nearest bin's grain count. */
    getGroundY(x) {
      return this.gr.getGroundY(this.layout, x);
    }
    // ── Baking ──
    bakeParticle(p) {
      this.gr.bakeParticle(this.layout, p);
    }
    // ── Frame drawing ──
    drawFrame(particles, remainingSec, totalParticles, emittedCount, _paused, totalMs, rain, centiseconds, wallClockSec) {
      const L = this.layout;
      const ctx = this.gr.dCtx;
      ctx.clearRect(0, 0, L.width, L.height);
      if (totalMs !== void 0 && totalMs > 0) {
        this.drawProgressBar(ctx, remainingSec * 1e3, totalMs);
      }
      if (this.clockEnabled) {
        if (wallClockSec !== void 0) {
          this.drawSevenSegClock(ctx, wallClockSec, void 0);
        } else {
          this.drawSevenSegClock(ctx, remainingSec, centiseconds);
        }
      }
      if (wallClockSec !== void 0) {
        this.drawInlineTimer(ctx, wallClockSec, void 0);
      } else {
        this.drawInlineTimer(ctx, remainingSec, centiseconds);
      }
      this.gr.drawHopper(ctx, L, emittedCount, totalParticles);
      let pegAlpha;
      if (this.alarmActive) {
        const elapsed = performance.now() - this.alarmFlashStart;
        const flashDuration = 200;
        const totalFlashes = 10;
        const flashIndex = elapsed / flashDuration;
        if (flashIndex < totalFlashes) {
          const phase = flashIndex % 1;
          const wave = Math.sin(phase * Math.PI);
          pegAlpha = 0.15 + 0.7 * wave;
        } else {
          pegAlpha = 0.55;
          this.alarmHighlight = true;
        }
      }
      this.gr.drawPegs(ctx, L, this.currentTheme, pegAlpha);
      this.gr.drawParticles(ctx, L, particles);
      if (rain && rain.length > 0) {
        this.gr.drawRainParticles(ctx, L, rain, this.currentTheme);
      }
    }
    drawProgressBar(ctx, remainingMs, totalMs) {
      const progress = Math.max(0, Math.min(1, 1 - remainingMs / totalMs));
      const [r, g, b] = this.currentTheme.segmentRGB;
      ctx.fillStyle = `rgba(${r},${g},${b},0.60)`;
      ctx.fillRect(0, 0, this.layout.width * progress, 2);
    }
    drawSevenSegClock(ctx, sec, centiseconds) {
      const L = this.layout;
      const digitH = Math.min(L.width * 0.22, L.height * 0.25);
      drawClock(ctx, Math.floor(sec), L.centerX, L.height / 2, digitH, this.currentTheme, centiseconds);
    }
    drawInlineTimer(ctx, sec, centiseconds) {
      if (sec <= 0) return;
      const L = this.layout;
      const digitH = L.height * 0.04;
      drawClock(ctx, Math.floor(sec), L.centerX, L.inlineTimerY, digitH, this.currentTheme, centiseconds);
    }
    // ── Rain particles (refill — identical grain rendering) ──
    drawRainParticles(ctx, rainParticles2) {
      this.gr.drawRainParticles(ctx, this.layout, rainParticles2, this.currentTheme);
    }
    // ── Purge ──
    beginPurge() {
      this.gr.beginPurge(this.layout);
    }
    purgeStacks(dt) {
      return this.gr.purgeStacks(this.layout, dt, this.currentTheme);
    }
    // ── Alarm ──
    startAlarm() {
      this.alarmActive = true;
      this.alarmFlashStart = performance.now();
      this.alarmHighlight = false;
    }
    stopAlarm() {
      this.alarmActive = false;
      this.alarmHighlight = false;
    }
    /** Clear baked grains and reset all state. */
    clearStatic() {
      this.gr.clearStatic(this.layout);
    }
  };

  // src/engine/timer-bridge.ts
  var TimerBridge = class {
    constructor() {
      this.onTick = null;
      this.onDone = null;
      this.worker = new Worker("dist/timer-worker.js");
      this.worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === "TICK") {
          this.onTick?.(msg.remainingMs, msg.elapsedMs);
        } else if (msg.type === "DONE") {
          this.onDone?.();
        }
      };
    }
    start(totalMs) {
      this.worker.postMessage({
        type: "START",
        totalMs,
        startAbsMs: performance.now()
      });
    }
    addTime(addMs) {
      this.worker.postMessage({ type: "ADD_TIME", addMs });
    }
    pause() {
      this.worker.postMessage({ type: "PAUSE" });
    }
    resume() {
      this.worker.postMessage({
        type: "RESUME",
        resumeAbsMs: performance.now()
      });
    }
    reset() {
      this.worker.postMessage({ type: "RESET" });
    }
  };

  // src/components/console.ts
  var import_qrcode = __toESM(require_browser());
  function injectStyles() {
    if (document.getElementById("gt-console-style")) return;
    const style = document.createElement("style");
    style.id = "gt-console-style";
    style.textContent = `
    /* \u2500\u2500 On-screen controls \u2500\u2500 */
    .gt-controls {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      display: flex;
      gap: 20px;
      align-items: center;
      user-select: none;
      transition: opacity 0.4s ease;
    }
    .gt-controls.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .gt-ctrl-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.12);
      background: transparent;
      color: rgba(255,255,255,0.45);
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s, color 0.2s, border-color 0.2s;
      padding: 0;
      line-height: 1;
    }
    .gt-ctrl-btn:hover {
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.80);
      border-color: rgba(255,255,255,0.25);
    }
    .gt-ctrl-btn:active {
      background: rgba(255,255,255,0.14);
    }
    .gt-ctrl-btn svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }

    /* \u2500\u2500 Side Drawer (Glassmorphism) \u2500\u2500 */
    .gt-drawer-overlay {
      position: fixed;
      inset: 0;
      z-index: 600;
      background: rgba(0,0,0,0.35);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .gt-drawer-overlay.open {
      opacity: 1;
      pointer-events: auto;
    }
    .gt-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 300px;
      max-width: 82vw;
      z-index: 601;
      background: rgba(8,8,12,0.72);
      border-left: 1px solid rgba(255,255,255,0.05);
      backdrop-filter: blur(32px) saturate(1.4);
      -webkit-backdrop-filter: blur(32px) saturate(1.4);
      transform: translateX(100%);
      transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
      display: flex;
      flex-direction: column;
      font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', monospace;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.06) transparent;
    }
    .gt-drawer.open {
      transform: translateX(0);
    }
    .gt-drawer-content {
      padding: 40px 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 36px;
    }

    /* \u2500\u2500 Section headings \u2500\u2500 */
    .gt-section-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.25);
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .gt-section {
      display: flex;
      flex-direction: column;
    }

    /* \u2500\u2500 Field rows \u2500\u2500 */
    .gt-field-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 36px;
      margin-bottom: 4px;
    }
    .gt-field-label {
      font-size: 11px;
      font-weight: 400;
      color: rgba(255,255,255,0.40);
      flex-shrink: 0;
      letter-spacing: 0.5px;
    }
    .gt-field-select {
      flex: 1;
      max-width: 150px;
      padding: 6px 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 6px;
      color: rgba(255,255,255,0.60);
      font-family: inherit;
      font-size: 11px;
      outline: none;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .gt-field-select:focus {
      border-color: rgba(255,255,255,0.15);
    }
    .gt-field-select option {
      background: #0c0c0e;
      color: #bbb;
    }

    /* \u2500\u2500 Theme strip \u2500\u2500 */
    .gt-theme-strip {
      display: flex;
      gap: 0;
      margin-bottom: 4px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .gt-theme-chip {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 10px 0;
      font-size: 8.5px;
      font-weight: 500;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      font-family: inherit;
      color: rgba(255,255,255,0.30);
      background: rgba(255,255,255,0.02);
      border: none;
      border-right: 1px solid rgba(255,255,255,0.04);
      cursor: pointer;
      transition: all 0.25s;
    }
    .gt-theme-chip:last-child {
      border-right: none;
    }
    .gt-theme-chip .gt-led {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      flex-shrink: 0;
      opacity: 0.45;
      transition: opacity 0.25s, box-shadow 0.25s;
    }
    .gt-theme-chip:hover {
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.55);
    }
    .gt-theme-chip:hover .gt-led {
      opacity: 0.7;
    }
    .gt-theme-chip.active {
      color: rgba(255,255,255,0.85);
      background: color-mix(in srgb, var(--tc) 6%, transparent);
      box-shadow: inset 0 0 12px color-mix(in srgb, var(--tc) 8%, transparent);
    }
    .gt-theme-chip.active .gt-led {
      opacity: 1;
      box-shadow: 0 0 4px var(--tc), 0 0 8px color-mix(in srgb, var(--tc) 50%, transparent);
    }

    /* \u2500\u2500 Sliders \u2500\u2500 */
    .gt-slider-row {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 32px;
      margin-bottom: 4px;
    }
    .gt-slider-label {
      font-size: 10px;
      font-weight: 400;
      color: rgba(255,255,255,0.30);
      width: 52px;
      flex-shrink: 0;
      text-align: right;
      letter-spacing: 0.3px;
    }
    .gt-slider-input {
      -webkit-appearance: none;
      appearance: none;
      flex: 1;
      height: 2px;
      background: rgba(255,255,255,0.08);
      border-radius: 1px;
      outline: none;
      cursor: pointer;
    }
    .gt-slider-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255,255,255,0.40);
      cursor: pointer;
      transition: background 0.15s;
    }
    .gt-slider-input::-webkit-slider-thumb:hover {
      background: rgba(255,255,255,0.65);
    }
    .gt-slider-input::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255,255,255,0.40);
      cursor: pointer;
      border: none;
    }
    .gt-slider-val {
      font-size: 10px;
      font-weight: 400;
      color: rgba(255,255,255,0.22);
      width: 38px;
      text-align: left;
      letter-spacing: 0.3px;
    }

    /* \u2500\u2500 Duration control \u2500\u2500 */
    .gt-dur-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 36px;
      margin-bottom: 4px;
    }
    .gt-dur-btn {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.08);
      background: transparent;
      color: rgba(255,255,255,0.35);
      font-size: 16px;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      flex-shrink: 0;
      transition: all 0.15s;
    }
    .gt-dur-btn:hover {
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.70);
      border-color: rgba(255,255,255,0.15);
    }
    .gt-dur-btn:active {
      background: rgba(255,255,255,0.10);
    }
    .gt-dur-display {
      width: 56px;
      padding: 0;
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.70);
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 1.5px;
      outline: none;
      text-align: center;
      flex-shrink: 0;
      caret-color: rgba(255,255,255,0.40);
    }
    .gt-dur-display:focus {
      color: rgba(255,255,255,0.90);
    }

    /* \u2500\u2500 System buttons \u2500\u2500 */
    .gt-sys-btn {
      width: 100%;
      padding: 10px 0;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 8px;
      color: rgba(255,255,255,0.35);
      font-family: inherit;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 1px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.15s;
      margin-bottom: 8px;
    }
    .gt-sys-btn:hover {
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.60);
      border-color: rgba(255,255,255,0.10);
    }
    .gt-sys-btn:active {
      background: rgba(255,255,255,0.08);
    }

    /* \u2500\u2500 Fixed credits \u2500\u2500 */
    .gt-credits {
      position: fixed;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 9px;
      color: rgba(255,255,255,0.12);
      letter-spacing: 1.5px;
      z-index: 1;
      pointer-events: none;
      font-family: 'JetBrains Mono', 'SF Mono', monospace;
    }
  `;
    document.head.appendChild(style);
  }
  function fmtMmSs(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  function parseMmSs(str) {
    const parts = str.split(":");
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10);
      const s = parseInt(parts[1], 10);
      if (Number.isFinite(m) && Number.isFinite(s)) return m * 60 + s;
    }
    const v = parseInt(str, 10);
    return Number.isFinite(v) ? v : null;
  }
  function createConsole(initialMode, initialTheme = "Nixie", initialDurationSec = 3600, initialCs = true, initialAppMode = "timer", initialFriction = 1) {
    injectStyles();
    let isPaused = false;
    let currentDuration = Math.min(initialDurationSec, 3600);
    const creditsEl = document.createElement("div");
    creditsEl.className = "gt-credits";
    creditsEl.textContent = "Crafted by Tipsy Tap Studio";
    document.body.appendChild(creditsEl);
    const controls = document.createElement("div");
    controls.className = "gt-controls";
    function makeBtn(svg, title) {
      const btn = document.createElement("button");
      btn.className = "gt-ctrl-btn";
      btn.innerHTML = svg;
      btn.title = title;
      return btn;
    }
    const startBtn = makeBtn(
      '<svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20"/></svg>',
      "Start"
    );
    const pauseBtn = makeBtn(
      '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="4" height="16"/><rect x="15" y="4" width="4" height="16"/></svg>',
      "Pause"
    );
    const stopBtn = makeBtn(
      '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>',
      "Stop"
    );
    const settingsBtn = makeBtn(
      '<svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
      "Settings"
    );
    startBtn.addEventListener("click", () => ctrl.onStart?.());
    pauseBtn.addEventListener("click", () => ctrl.onPause?.());
    stopBtn.addEventListener("click", () => ctrl.onStop?.());
    settingsBtn.addEventListener("click", () => toggleDrawer());
    controls.appendChild(startBtn);
    controls.appendChild(pauseBtn);
    controls.appendChild(stopBtn);
    controls.appendChild(settingsBtn);
    document.body.appendChild(controls);
    const overlay = document.createElement("div");
    overlay.className = "gt-drawer-overlay";
    overlay.addEventListener("click", () => closeDrawer());
    const drawer = document.createElement("div");
    drawer.className = "gt-drawer";
    const drawerContent = document.createElement("div");
    drawerContent.className = "gt-drawer-content";
    const timerSection = document.createElement("div");
    timerSection.className = "gt-section";
    timerSection.innerHTML = '<div class="gt-section-title">Timer</div>';
    const appRow = document.createElement("div");
    appRow.className = "gt-field-row";
    appRow.innerHTML = '<span class="gt-field-label">App</span>';
    const appSelect = document.createElement("select");
    appSelect.className = "gt-field-select";
    for (const [val, label] of [["timer", "Timer"], ["clock", "Clock"]]) {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = label;
      if (val === initialAppMode) opt.selected = true;
      appSelect.appendChild(opt);
    }
    appSelect.addEventListener("change", () => {
      ctrl.onAppModeChange?.(appSelect.value);
      updateClockModeVisibility();
      renderQR();
    });
    appRow.appendChild(appSelect);
    timerSection.appendChild(appRow);
    const durLabel = document.createElement("div");
    durLabel.className = "gt-field-row";
    durLabel.innerHTML = '<span class="gt-field-label">Duration</span>';
    durLabel.style.marginBottom = "0";
    const durRow = document.createElement("div");
    durRow.className = "gt-dur-row";
    const durMinusBtn = document.createElement("button");
    durMinusBtn.className = "gt-dur-btn";
    durMinusBtn.textContent = "\u2212";
    const durSlider = document.createElement("input");
    durSlider.type = "range";
    durSlider.className = "gt-slider-input";
    durSlider.min = "1";
    durSlider.max = "3600";
    durSlider.step = "1";
    durSlider.value = String(currentDuration);
    durSlider.style.flex = "1";
    const durDisplay = document.createElement("input");
    durDisplay.className = "gt-dur-display";
    durDisplay.type = "text";
    durDisplay.value = fmtMmSs(currentDuration);
    const durPlusBtn = document.createElement("button");
    durPlusBtn.className = "gt-dur-btn";
    durPlusBtn.textContent = "+";
    function setDuration(sec) {
      sec = Math.max(1, Math.min(3600, sec));
      currentDuration = sec;
      durSlider.value = String(sec);
      durDisplay.value = fmtMmSs(sec);
      ctrl.onDurationChange?.(sec);
      renderQR();
    }
    durSlider.addEventListener("input", () => {
      const v = parseInt(durSlider.value, 10);
      currentDuration = v;
      durDisplay.value = fmtMmSs(v);
      ctrl.onDurationChange?.(v);
      renderQR();
    });
    durDisplay.addEventListener("change", () => {
      const parsed = parseMmSs(durDisplay.value);
      if (parsed !== null) {
        setDuration(parsed);
      } else {
        durDisplay.value = fmtMmSs(currentDuration);
      }
    });
    let holdInterval = null;
    function startHold(delta) {
      setDuration(currentDuration + delta);
      holdInterval = setInterval(() => setDuration(currentDuration + delta), 80);
    }
    function stopHold() {
      if (holdInterval !== null) {
        clearInterval(holdInterval);
        holdInterval = null;
      }
    }
    durMinusBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      startHold(-1);
    });
    durMinusBtn.addEventListener("pointerup", stopHold);
    durMinusBtn.addEventListener("pointerleave", stopHold);
    durPlusBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      startHold(1);
    });
    durPlusBtn.addEventListener("pointerup", stopHold);
    durPlusBtn.addEventListener("pointerleave", stopHold);
    durRow.appendChild(durMinusBtn);
    durRow.appendChild(durSlider);
    durRow.appendChild(durDisplay);
    durRow.appendChild(durPlusBtn);
    timerSection.appendChild(durLabel);
    timerSection.appendChild(durRow);
    const csRow = document.createElement("div");
    csRow.className = "gt-field-row";
    csRow.innerHTML = '<span class="gt-field-label">Centiseconds</span>';
    const csSelect = document.createElement("select");
    csSelect.className = "gt-field-select";
    csSelect.innerHTML = '<option value="on">ON</option><option value="off">OFF</option>';
    csSelect.value = initialCs ? "on" : "off";
    csSelect.addEventListener("change", () => {
      ctrl.onCentisecondsToggle?.(csSelect.value === "on");
      renderQR();
    });
    csRow.appendChild(csSelect);
    timerSection.appendChild(csRow);
    const physModeRow = document.createElement("div");
    physModeRow.className = "gt-field-row";
    physModeRow.innerHTML = '<span class="gt-field-label">Preset</span>';
    const physModeSelect = document.createElement("select");
    physModeSelect.className = "gt-field-select";
    for (const name of Object.keys(PRESETS)) {
      const opt = document.createElement("option");
      opt.value = name.toLowerCase();
      opt.textContent = name;
      if (name.toLowerCase() === initialMode.toLowerCase()) opt.selected = true;
      physModeSelect.appendChild(opt);
    }
    physModeSelect.addEventListener("change", () => {
      ctrl.onModeChange?.(physModeSelect.value);
      updateBaseFromPreset();
      syncPhysicsSliders();
      renderQR();
    });
    physModeRow.appendChild(physModeSelect);
    timerSection.appendChild(physModeRow);
    function updateClockModeVisibility() {
      const isClock = appSelect.value === "clock";
      durLabel.style.display = isClock ? "none" : "";
      durRow.style.display = isClock ? "none" : "";
      csRow.style.display = isClock ? "none" : "";
    }
    updateClockModeVisibility();
    drawerContent.appendChild(timerSection);
    const themeSection = document.createElement("div");
    themeSection.className = "gt-section";
    themeSection.innerHTML = '<div class="gt-section-title">Theme</div>';
    const themeStrip = document.createElement("div");
    themeStrip.className = "gt-theme-strip";
    const themeChips = [];
    const LED_COLORS = {
      nixie: "#FF8C00",
      system: "#00FF41",
      studio: "#FFFFFF",
      cyber: "#00D1FF"
    };
    for (const t of CLOCK_THEMES) {
      const chip = document.createElement("button");
      chip.className = "gt-theme-chip";
      const tc = LED_COLORS[t.name.toLowerCase()] || "#fff";
      chip.style.setProperty("--tc", tc);
      if (t.name.toLowerCase() === initialTheme.toLowerCase()) chip.classList.add("active");
      const led = document.createElement("span");
      led.className = "gt-led";
      led.style.background = tc;
      chip.appendChild(led);
      const label = document.createElement("span");
      label.textContent = t.name;
      chip.appendChild(label);
      chip.addEventListener("click", () => {
        themeChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        ctrl.onThemeChange?.(t.name);
        renderQR();
      });
      themeStrip.appendChild(chip);
      themeChips.push(chip);
    }
    themeSection.appendChild(themeStrip);
    drawerContent.appendChild(themeSection);
    const physSection = document.createElement("div");
    physSection.className = "gt-section";
    physSection.innerHTML = '<div class="gt-section-title">Physics</div>';
    let baseDragX = PHYSICS.dragX;
    let baseDragY = PHYSICS.dragY;
    let baseDragXSettle = PHYSICS.dragXSettle;
    let baseDragYSettle = PHYSICS.dragYSettle;
    let currentFriction = initialFriction;
    function updateBaseFromPreset() {
      baseDragX = PHYSICS.dragX;
      baseDragY = PHYSICS.dragY;
      baseDragXSettle = PHYSICS.dragXSettle;
      baseDragYSettle = PHYSICS.dragYSettle;
    }
    function applyFriction(f) {
      currentFriction = f;
      PHYSICS.dragX = baseDragX * f;
      PHYSICS.dragY = baseDragY * f;
      PHYSICS.dragXSettle = baseDragXSettle * f;
      PHYSICS.dragYSettle = baseDragYSettle * f;
    }
    if (initialFriction !== 1) {
      applyFriction(initialFriction);
    }
    const gravRow = document.createElement("div");
    gravRow.className = "gt-slider-row";
    const gravLabel = document.createElement("span");
    gravLabel.className = "gt-slider-label";
    gravLabel.textContent = "Gravity";
    const gravInput = document.createElement("input");
    gravInput.type = "range";
    gravInput.className = "gt-slider-input";
    gravInput.min = "50";
    gravInput.max = "3000";
    gravInput.step = "10";
    gravInput.value = String(PHYSICS.gravity);
    const gravVal = document.createElement("span");
    gravVal.className = "gt-slider-val";
    gravVal.textContent = String(Math.round(PHYSICS.gravity));
    gravInput.addEventListener("input", () => {
      const v = parseFloat(gravInput.value);
      PHYSICS.gravity = v;
      gravVal.textContent = String(Math.round(v));
      ctrl.onGravityChange?.(v);
      renderQR();
    });
    gravRow.appendChild(gravLabel);
    gravRow.appendChild(gravInput);
    gravRow.appendChild(gravVal);
    physSection.appendChild(gravRow);
    const bounceRow = document.createElement("div");
    bounceRow.className = "gt-slider-row";
    const bounceLabel = document.createElement("span");
    bounceLabel.className = "gt-slider-label";
    bounceLabel.textContent = "Bounce";
    const bounceInput = document.createElement("input");
    bounceInput.type = "range";
    bounceInput.className = "gt-slider-input";
    bounceInput.min = "0";
    bounceInput.max = "1.0";
    bounceInput.step = "0.01";
    bounceInput.value = String(PHYSICS.restitution);
    const bounceVal = document.createElement("span");
    bounceVal.className = "gt-slider-val";
    bounceVal.textContent = PHYSICS.restitution.toFixed(2);
    bounceInput.addEventListener("input", () => {
      const v = parseFloat(bounceInput.value);
      PHYSICS.restitution = v;
      bounceVal.textContent = v.toFixed(2);
      ctrl.onBouncinessChange?.(v);
      renderQR();
    });
    bounceRow.appendChild(bounceLabel);
    bounceRow.appendChild(bounceInput);
    bounceRow.appendChild(bounceVal);
    physSection.appendChild(bounceRow);
    const fricRow = document.createElement("div");
    fricRow.className = "gt-slider-row";
    const fricLabel = document.createElement("span");
    fricLabel.className = "gt-slider-label";
    fricLabel.textContent = "Flow";
    const fricInput = document.createElement("input");
    fricInput.type = "range";
    fricInput.className = "gt-slider-input";
    fricInput.min = "0.5";
    fricInput.max = "3.0";
    fricInput.step = "0.05";
    fricInput.value = String(currentFriction);
    const fricVal = document.createElement("span");
    fricVal.className = "gt-slider-val";
    fricVal.textContent = `\xD7${currentFriction.toFixed(2)}`;
    fricInput.addEventListener("input", () => {
      const v = parseFloat(fricInput.value);
      applyFriction(v);
      fricVal.textContent = `\xD7${v.toFixed(2)}`;
      ctrl.onFrictionChange?.(v);
      renderQR();
    });
    fricRow.appendChild(fricLabel);
    fricRow.appendChild(fricInput);
    fricRow.appendChild(fricVal);
    physSection.appendChild(fricRow);
    const physResetBtn = document.createElement("button");
    physResetBtn.className = "gt-sys-btn";
    physResetBtn.textContent = "Reset Physics";
    physResetBtn.style.marginTop = "12px";
    physResetBtn.addEventListener("click", () => {
      applyPreset(physModeSelect.value);
      updateBaseFromPreset();
      currentFriction = 1;
      applyFriction(1);
      syncPhysicsSliders();
      renderQR();
    });
    physSection.appendChild(physResetBtn);
    function syncPhysicsSliders() {
      gravInput.value = String(PHYSICS.gravity);
      gravVal.textContent = String(Math.round(PHYSICS.gravity));
      bounceInput.value = String(PHYSICS.restitution);
      bounceVal.textContent = PHYSICS.restitution.toFixed(2);
      fricInput.value = String(currentFriction);
      fricVal.textContent = `\xD7${currentFriction.toFixed(2)}`;
    }
    drawerContent.appendChild(physSection);
    const sysSection = document.createElement("div");
    sysSection.className = "gt-section";
    sysSection.innerHTML = '<div class="gt-section-title">System</div>';
    const shareBtn = document.createElement("button");
    shareBtn.className = "gt-sys-btn";
    shareBtn.textContent = "Share URL";
    shareBtn.addEventListener("click", () => {
      ctrl.onShareURL?.();
      shareBtn.textContent = "Copied!";
      setTimeout(() => {
        shareBtn.textContent = "Share URL";
      }, 1500);
      renderQR();
    });
    sysSection.appendChild(shareBtn);
    const resetBtn = document.createElement("button");
    resetBtn.className = "gt-sys-btn";
    resetBtn.textContent = "Reset to Default";
    resetBtn.addEventListener("click", () => {
      ctrl.onResetDefaults?.();
      renderQR();
    });
    sysSection.appendChild(resetBtn);
    drawerContent.appendChild(sysSection);
    const qrSection = document.createElement("div");
    qrSection.style.marginTop = "24px";
    qrSection.style.paddingTop = "20px";
    qrSection.style.borderTop = "1px solid #333";
    qrSection.style.display = "flex";
    qrSection.style.flexDirection = "column";
    qrSection.style.alignItems = "center";
    qrSection.style.gap = "10px";
    const qrLabel = document.createElement("span");
    qrLabel.textContent = "Scan to open";
    qrLabel.style.fontSize = "9px";
    qrLabel.style.color = "#888";
    qrLabel.style.letterSpacing = "1px";
    qrSection.appendChild(qrLabel);
    const qrCanvas = document.createElement("canvas");
    qrSection.appendChild(qrCanvas);
    drawerContent.appendChild(qrSection);
    function renderQR(attempt = 0) {
      if (!qrCanvas.isConnected && attempt < 5) {
        setTimeout(() => renderQR(attempt + 1), 100);
        return;
      }
      import_qrcode.default.toCanvas(qrCanvas, window.location.href, {
        width: 140,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" }
      });
    }
    drawer.appendChild(drawerContent);
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    let drawerOpen = false;
    function toggleDrawer() {
      drawerOpen = !drawerOpen;
      drawer.classList.toggle("open", drawerOpen);
      overlay.classList.toggle("open", drawerOpen);
      if (drawerOpen) {
        syncPhysicsSliders();
        renderQR();
      }
    }
    function closeDrawer() {
      drawerOpen = false;
      drawer.classList.remove("open");
      overlay.classList.remove("open");
    }
    const ctrl = {
      el: controls,
      show() {
        controls.classList.remove("hidden");
      },
      hide() {
        controls.classList.add("hidden");
        if (drawerOpen) closeDrawer();
      },
      setTime(_remainingMs) {
      },
      setStatus(_status) {
      },
      onModeChange: null,
      onPause: null,
      onStart: null,
      onStop: null,
      onThemeChange: null,
      onDurationChange: null,
      onCentisecondsToggle: null,
      onResetDefaults: null,
      onShareURL: null,
      onAppModeChange: null,
      onGravityChange: null,
      onBouncinessChange: null,
      onFrictionChange: null,
      setPaused(p) {
        isPaused = p;
        startBtn.style.display = p ? "" : "none";
        pauseBtn.style.display = p ? "none" : "";
      },
      setThemeName(name) {
        themeChips.forEach((c) => {
          c.classList.toggle("active", c.textContent?.toLowerCase() === name.toLowerCase());
        });
      },
      setAccentColor(rgb) {
        const [r, g, b] = rgb;
        const accentBorder = `rgba(${r},${g},${b},0.30)`;
        const accentColor = `rgba(${r},${g},${b},0.70)`;
        for (const btn of [startBtn, pauseBtn, stopBtn, settingsBtn]) {
          btn.style.borderColor = accentBorder;
          btn.style.color = accentColor;
        }
      },
      closeDrawer
    };
    startBtn.style.display = "none";
    return ctrl;
  }
  function applyPreset(modeName) {
    const key = Object.keys(PRESETS).find(
      (k) => k.toLowerCase() === modeName.toLowerCase()
    );
    if (!key) return;
    const preset = PRESETS[key];
    for (const k of Object.keys(preset)) {
      PHYSICS[k] = preset[k];
    }
  }

  // src/main.ts
  var params = readParams();
  var isClockMode = params.app === "clock";
  if (isClockMode) {
    params.n = 3600;
    params.t = 3600;
  } else if (params.timerMode === "seconds") {
    params.n = params.t;
  }
  writeParams(params);
  var rng = createPRNG(params.s);
  var sim = new Simulation({
    numRows: params.rows,
    totalParticles: params.n,
    totalTimeSec: params.t,
    rng
  });
  var container = document.getElementById("app");
  var renderer = new Renderer(container, params.rows, params.n, params.s);
  renderer.setThemeByName(params.theme);
  renderer.setClockEnabled(params.clock);
  renderer.setGlowIntensity(1);
  applyPreset(params.mode);
  var timerBridge = new TimerBridge();
  var workerRemainingMs = params.t * 1e3;
  var clockElapsedOffset = 0;
  timerBridge.onTick = (remainingMs, elapsedMs) => {
    workerRemainingMs = remainingMs;
    sim.setElapsedMs(elapsedMs + clockElapsedOffset);
    consoleCtrl.setTime(remainingMs);
  };
  timerBridge.onDone = () => {
    workerRemainingMs = 0;
    consoleCtrl.setTime(0);
    if (isClockMode) {
      startTheLoop();
    } else {
      renderer.startAlarm();
      consoleCtrl.setStatus("alarm");
    }
  };
  var consoleCtrl = createConsole(
    params.mode,
    params.theme,
    params.t,
    params.cs,
    params.app,
    params.friction
  );
  consoleCtrl.setAccentColor(getThemeByName(params.theme).segmentRGB);
  var hideTimeout = null;
  function showConsole() {
    consoleCtrl.show();
    if (hideTimeout !== null) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => consoleCtrl.hide(), 5e3);
  }
  document.addEventListener("mousemove", showConsole);
  document.addEventListener("touchstart", showConsole);
  showConsole();
  consoleCtrl.onModeChange = (modeName) => {
    applyPreset(modeName);
    params.mode = modeName;
    writeParams(params);
  };
  consoleCtrl.onThemeChange = (themeName) => {
    renderer.setThemeByName(themeName);
    consoleCtrl.setThemeName(themeName);
    consoleCtrl.setAccentColor(getThemeByName(themeName).segmentRGB);
    params.theme = themeName.toLowerCase();
    writeParams(params);
  };
  consoleCtrl.onCentisecondsToggle = (enabled) => {
    params.cs = enabled;
    writeParams(params);
  };
  consoleCtrl.onDurationChange = (sec) => {
    params.t = sec;
    writeParams(params);
  };
  consoleCtrl.onAppModeChange = (mode) => {
    params.app = mode;
    writeParams(params);
    window.location.reload();
  };
  consoleCtrl.onGravityChange = (_value) => {
  };
  consoleCtrl.onFrictionChange = (value) => {
    params.friction = value;
    writeParams(params);
  };
  consoleCtrl.onPause = () => togglePause();
  consoleCtrl.onStart = () => {
    if (paused) togglePause();
    else if (appState === "idle" || sim.allSettled) startTheLoop();
  };
  consoleCtrl.onStop = () => startTheLoop();
  consoleCtrl.onShareURL = () => {
    writeParams(params);
    navigator.clipboard.writeText(window.location.href).catch(() => {
    });
  };
  consoleCtrl.onResetDefaults = () => {
    window.location.search = "";
  };
  var appState = "idle";
  var lastTime = null;
  var paused = false;
  var rafId = 0;
  var rainParticles = [];
  var refillElapsed = 0;
  function getCs() {
    if (isClockMode) return void 0;
    if (!params.cs) return void 0;
    return Math.floor(workerRemainingMs % 1e3 / 10);
  }
  function getWallClockSec() {
    if (!isClockMode) return void 0;
    const now = /* @__PURE__ */ new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  }
  function togglePause() {
    if (appState === "purging" || appState === "refilling") return;
    if (sim.allSettled) return;
    paused = !paused;
    consoleCtrl.setPaused(paused);
    if (paused) {
      appState = "paused";
      timerBridge.pause();
      cancelAnimationFrame(rafId);
      renderer.drawFrame(
        sim.activeParticles,
        workerRemainingMs / 1e3,
        sim.totalParticles,
        sim.emittedCount,
        true,
        sim.totalTimeMs,
        void 0,
        getCs(),
        getWallClockSec()
      );
    } else {
      appState = "running";
      timerBridge.resume();
      lastTime = null;
      rafId = requestAnimationFrame(frame);
    }
  }
  function startTheLoop() {
    timerBridge.reset();
    cancelAnimationFrame(rafId);
    renderer.stopAlarm();
    renderer.beginPurge();
    appState = "purging";
    consoleCtrl.setStatus("ending");
    lastTime = null;
    rafId = requestAnimationFrame(frame);
  }
  function beginRefill() {
    appState = "refilling";
    refillElapsed = 0;
    rainParticles = [];
    const L = renderer.layout;
    const hopperHW = L.hopperTopHW;
    const count = Math.min(Math.round(params.n * 0.15), 400);
    for (let i = 0; i < count; i++) {
      const tx = (Math.random() - 0.5) * 2;
      rainParticles.push({
        x: L.centerX + tx * hopperHW * 0.85,
        y: L.hopperTop - 5 - Math.random() * 25,
        vx: (Math.random() - 0.5) * 8,
        vy: 300 + Math.random() * 50,
        alpha: 0.5 + Math.random() * 0.3,
        bounces: 0
      });
    }
  }
  function startFresh() {
    sim.reset();
    renderer.clearStatic();
    renderer.resize(params.rows);
    workerRemainingMs = params.t * 1e3;
    paused = false;
    appState = "running";
    consoleCtrl.setPaused(false);
    consoleCtrl.setStatus("ready");
    consoleCtrl.setTime(params.t * 1e3);
    setTimeout(() => {
      if (appState === "running") {
        consoleCtrl.setStatus("running");
      }
    }, 1e3);
    if (isClockMode) {
      const now = /* @__PURE__ */ new Date();
      const min = now.getMinutes();
      const sec = now.getSeconds();
      const ms = now.getMilliseconds();
      const elapsedInHourMs = (min * 60 + sec) * 1e3 + ms;
      const remainingMs = 36e5 - elapsedInHourMs;
      clockElapsedOffset = elapsedInHourMs;
      timerBridge.start(remainingMs);
      workerRemainingMs = remainingMs;
      sim.setElapsedMs(elapsedInHourMs);
      const geom = renderer.getGeom();
      const snapped = sim.instantSnap(geom);
      for (const p of snapped) {
        renderer.bakeParticle(p);
      }
    } else {
      clockElapsedOffset = 0;
      timerBridge.start(params.t * 1e3);
    }
    lastTime = null;
    rafId = requestAnimationFrame(frame);
  }
  function bakeSettledBatch(particles) {
    for (const p of particles) {
      renderer.bakeParticle(p);
    }
  }
  window.addEventListener("resize", () => {
    renderer.resize(params.rows);
    if (paused || sim.allSettled) {
      renderer.drawFrame(
        sim.activeParticles,
        workerRemainingMs / 1e3,
        sim.totalParticles,
        sim.emittedCount,
        paused,
        sim.totalTimeMs,
        void 0,
        getCs(),
        getWallClockSec()
      );
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      togglePause();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      if (appState !== "running") {
        if (appState === "purging" || appState === "refilling") {
          lastTime = null;
          rafId = requestAnimationFrame(frame);
        }
        return;
      }
      const geom = renderer.getGeom();
      const forcedSettled = sim.forceSettleActive();
      bakeSettledBatch(forcedSettled);
      const snapped = sim.instantSnap(geom);
      bakeSettledBatch(snapped);
      renderer.drawFrame(
        sim.activeParticles,
        workerRemainingMs / 1e3,
        sim.totalParticles,
        sim.emittedCount,
        false,
        sim.totalTimeMs,
        void 0,
        getCs(),
        getWallClockSec()
      );
      lastTime = null;
      rafId = requestAnimationFrame(frame);
    }
  });
  function frame(now) {
    if (appState === "paused" || appState === "idle") return;
    if (lastTime === null) lastTime = now;
    const dtMs = Math.min(now - lastTime, 100);
    const dtSec = dtMs / 1e3;
    lastTime = now;
    if (appState === "purging") {
      const done = renderer.purgeStacks(dtSec);
      renderer.drawFrame([], 0, sim.totalParticles, sim.totalParticles, false, sim.totalTimeMs);
      if (done) {
        beginRefill();
      }
      rafId = requestAnimationFrame(frame);
      return;
    }
    if (appState === "refilling") {
      refillElapsed += dtMs;
      const L = renderer.layout;
      const gravity = 400;
      for (const p of rainParticles) {
        p.vy += gravity * dtSec;
        p.x += p.vx * dtSec;
        p.y += p.vy * dtSec;
        if (p.y >= L.hopperBottom) {
          p.y = L.hopperBottom - 1;
          if (p.bounces < 3 && Math.abs(p.vy) > 15) {
            const e = 0.15 + Math.random() * 0.3;
            p.vy = -Math.abs(p.vy) * e;
            p.vx = (Math.random() - 0.5) * 60;
            p.bounces++;
          } else {
            p.vy = 0;
            p.vx = 0;
            p.alpha = Math.max(0, p.alpha - dtSec * 1.8);
          }
        }
        const hw = gaussianHW(p.y, L);
        const maxX = L.centerX + hw * 0.88;
        const minX = L.centerX - hw * 0.88;
        if (p.x > maxX) {
          p.x = maxX;
          p.vx = -Math.abs(p.vx) * 0.3;
        }
        if (p.x < minX) {
          p.x = minX;
          p.vx = Math.abs(p.vx) * 0.3;
        }
      }
      rainParticles = rainParticles.filter((p) => p.alpha > 0.01);
      renderer.drawFrame([], params.t, sim.totalParticles, 0, false, sim.totalTimeMs, rainParticles);
      if (refillElapsed >= 800) {
        startFresh();
        return;
      }
      rafId = requestAnimationFrame(frame);
      return;
    }
    const geom = renderer.getGeom();
    const settled = sim.update(dtMs, geom, (x) => renderer.getGroundY(x));
    for (const p of settled) {
      renderer.bakeParticle(p);
    }
    renderer.drawFrame(
      sim.activeParticles,
      workerRemainingMs / 1e3,
      sim.totalParticles,
      sim.emittedCount,
      false,
      sim.totalTimeMs,
      void 0,
      getCs(),
      getWallClockSec()
    );
    if (!sim.allSettled) {
      rafId = requestAnimationFrame(frame);
    } else {
      consoleCtrl.setStatus("ending");
    }
  }
  startFresh();
})();
//# sourceMappingURL=bundle.js.map
