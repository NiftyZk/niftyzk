const { plonk } = require("snarkjs")
const Logger = require("logplease");
const logger = Logger.create("niftyzk", { showTimestamp: false });
const path = require("path");
const { getR1CSFileName, getPtauFiles } = require("./runcompiler");
const chalk = require("chalk");

const { ZKEYSDIR, COMPILEDDIR, PTAUFILESDIR } = require("../paths");

//Name is string or undefined
async function setup_plonk(_name) {

    const ptauFiles = getPtauFiles()

    if (ptauFiles.length === 0) {
        console.log(chalk.red("Ptau file missing"))
        return;
    }
    if (ptauFiles.length > 1) {
        console.log(chalk.red("Too many ptau files detected"));
        return;
    }
    const ptauFileName = ptauFiles[0];
    const r1csFile = getR1CSFileName();

    let name = "circuit"
    if (name !== undefined) {
        name = _name;
    }
    const res = await plonk.setup(
        path.join(COMPILEDDIR, r1csFile),
        path.join(PTAUFILESDIR, ptauFileName),
        path.join(COMPILEDDIR, `${name}.final.zkey`),
        logger
    ).catch((err) => {
        console.log(chalk.red("An error occurred while setting up PLONK"))
        return -1;
    })

    if (res === -1) {
        process.exit(-1)
    } else {
        console.log(chalk.green("Generated Final zkey"))
        console.log("Run ", chalk.blue("niftyzk vkey"), " next to export the verification key")
        process.exit(0)
    }
}

module.exports = { setup_plonk }