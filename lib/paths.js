const path = require("path")

const PTAUFILESDIR = path.join(process.cwd(), "ptau");
const ZKEYSDIR = path.join(process.cwd(), "circuits", "compiled", "zkeys")
const LOGSDIR = path.join(process.cwd(), "circuits", "compiled", "contributions");
const COMPILEDDIR = path.join(process.cwd(), "circuits", "compiled")
const NIFTYJSON = path.join(process.cwd(), "niftycircuit.json");
const CIRCUITSDIR = path.join(process.cwd(), "circuits");
const LIBPATH = path.join(process.cwd(), "lib");
const TESTPATH = path.join(process.cwd(), "test");
const CONTRACTPATH = path.join(process.cwd(), "contract")

module.exports = { TESTPATH, LIBPATH, PTAUFILESDIR, ZKEYSDIR, LOGSDIR, COMPILEDDIR, PTAUFILESDIR, NIFTYJSON, CIRCUITSDIR,CONTRACTPATH }