const path = require("path")

const PTAUFILESDIR = path.join(process.cwd(), "ptau");
const ZKEYSDIR = path.join(process.cwd(), "circuits", "compiled", "zkeys")
const LOGSDIR = path.join(process.cwd(), "circuits", "compiled", "contributions");
const COMPILEDDIR = path.join(process.cwd(), "circuits", "compiled")
const CIRCUITSDIR = path.join(process.cwd(), "circuits");
const LIBPATH = path.join(process.cwd(), "lib");
const TESTPATH = path.join(process.cwd(), "test");
const READMEPATH = path.join(process.cwd(), "readme.md")
const DEVJSPATH = path.join(process.cwd(), "dev.js");
module.exports = { DEVJSPATH, TESTPATH, LIBPATH, PTAUFILESDIR, ZKEYSDIR, LOGSDIR, COMPILEDDIR, PTAUFILESDIR, CIRCUITSDIR, READMEPATH }