'use strict';

// Nest 12 packages are ESM-only and use import.meta.url, which ts-jest leaves
// untouched when compiling to CommonJS. Rewrite it to the CommonJS equivalent.
const tsJest = require('ts-jest').default;

const OWN_REQUIRE = /^const require = createRequire\(import\.meta\.url\);$/gm;
const IMPORT_META_URL = /\bimport\.meta\.url\b/g;

const toCommonJs = (source) =>
  source
    .replace(OWN_REQUIRE, '')
    .replace(IMPORT_META_URL, "require('url').pathToFileURL(__filename).href");

module.exports = {
  createTransformer(tsJestConfig) {
    const transformer = tsJest.createTransformer(tsJestConfig);
    return {
      process: (source, path, options) =>
        transformer.process(toCommonJs(source), path, options),
      getCacheKey: (source, path, options) =>
        transformer.getCacheKey(toCommonJs(source), path, options),
    };
  },
};
