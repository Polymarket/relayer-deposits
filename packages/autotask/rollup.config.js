import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import builtins from "builtin-modules";

export default {
  input: "src/index.ts",
  output: {
    //   file: 'dist/index.js',
    format: "cjs",
    dir: "./dist",
  },
  plugins: [
    resolve({ preferBuiltins: true }),
    commonjs(),
    json({ compact: true }),
    typescript(),
  ],
  external: [
    ...builtins,
    "ethers",
    "@ethersproject/bignumber",
    "@ethersproject/abstract-provider",
    /^defender-relay-client(\/.*)?$/,
  ],
};
