const path = require("path")

const PTAUFILESDIR = path.join(process.cwd(), "ptau");
const UNIVERSALSETUPFILESDIR = path.join(process.cwd(), "setupfiles")
const ZKEYSDIR = path.join(process.cwd(), "circuits", "compiled", "zkeys")
const LOGSDIR = path.join(process.cwd(), "circuits", "compiled", "contributions");
const COMPILEDDIR = path.join(process.cwd(), "circuits", "compiled")
const COMPILEDDIRWITHCUSTOMDIR = (dirname) => path.join(process.cwd(), dirname, "circuits", "compiled")
const CIRCUITSDIR = path.join(process.cwd(), "circuits");
const CIRCUITSDIRWITHCUSTOMDIR = (dirname) => path.join(process.cwd(), dirname, "circuits");
const LIBPATH = path.join(process.cwd(), "lib");
const LIBPATHWITHCUSTOMDIR = (dirname) => path.join(process.cwd(), dirname, "lib");
const TESTPATH = path.join(process.cwd(), "test");
const TESTPATHWITHCUSTOMDIR = (dirname) => path.join(process.cwd(), dirname, "test");
const READMEPATH = path.join(process.cwd(), "readme.md")
const INPUTPATH = path.join(process.cwd(), "test", "input.js");
const INPUTPATHWITHCUSTOMDIR = (dirname) => path.join(process.cwd(), dirname, "test", "input.js");
module.exports = { UNIVERSALSETUPFILESDIR,INPUTPATHWITHCUSTOMDIR, TESTPATHWITHCUSTOMDIR, LIBPATHWITHCUSTOMDIR, COMPILEDDIRWITHCUSTOMDIR, CIRCUITSDIRWITHCUSTOMDIR, INPUTPATH, TESTPATH, LIBPATH, PTAUFILESDIR, ZKEYSDIR, LOGSDIR, COMPILEDDIR, PTAUFILESDIR, CIRCUITSDIR, READMEPATH }