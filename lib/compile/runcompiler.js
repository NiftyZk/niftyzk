const chalk = require("chalk");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer").default;
const { zKey, plonk } = require("snarkjs");
const { COMPILEDDIR, PTAUFILESDIR, ZKEYSDIR } = require("../paths");
const Logger = require("logplease");
const logger = Logger.create("niftyzk", { showTimestamp: false })

function compileCircuits(filePath, setupPlonk) {
    if (!fs.existsSync(PTAUFILESDIR)) {
        ptauNotFountErrors()
        return;
    }
    const ptaufiles = getPtauFiles();
    if (ptaufiles.length === 0) {
        ptauNotFountErrors();
        return;
    }

    if (!fs.existsSync(COMPILEDDIR)) {
        fs.mkdirSync(COMPILEDDIR)
    }

    let compileOut;
    try {
        compileOut = execSync(`circom ${filePath === "" ? "./circuits/circuit.circom" : filePath} --r1cs --wasm --sym -o ./circuits/compiled`)
    } catch (err) {
        console.log(err)
        return;
    }
    console.log(compileOut.toString())


    inquirer.prompt([
        {
            type: "list",
            name: "ptaufile",
            message: "Select the ptau file to use for the groth-16 setup",
            choices: ptaufiles
        }
    ]).then(async (answers) => {

        const filename = answers.ptaufile;
        const r1csFilename = getR1CSFileName()
        makeZkeysDir()

        const r1csPath = path.join(process.cwd(), "circuits", "compiled", r1csFilename)
        const ptauPath = path.join(process.cwd(), "ptau", filename)
        if (setupPlonk) {
            const zkeyPath = path.join(process.cwd(), "circuits", "compiled", "zkeys", "circuit.final.zkey")

            const res = await plonk.setup(
                r1csPath,
                ptauPath,
                zkeyPath,
                logger
            ).catch((err) => {
                console.log(chalk.red("An error occurred while setting up PLONK"))
                return -1
            })
            if (res === -1) {
                throw new Error("ZKey generation failed")
            }
            console.log(chalk.green("Generated Final zkey"))
            console.log("Run ", chalk.blue("niftyzk vkey --final"), " next to export the verification key. It requires no more setup.")
            process.exit(0)
        } else {
            const zkeyPath = path.join(process.cwd(), "circuits", "compiled", "zkeys", "circuit_0000.zkey")
            let res = await zKey.newZKey(r1csPath, ptauPath, zkeyPath, { error: console.log, info: console.log, debug: console.log })
            if (res === -1) {
                throw new Error("ZKey generation failed");
            }
            console.log(chalk.green("Ready to start Phase-2 ceremony"))
            console.log("Run ", chalk.blue("niftyzk ceremony"), "to start a ceremony server")
            process.exit(0)
        }

    }).catch((err) => {
        console.log(err)
        console.log("Circuit setup aborted")
        process.exit(1)
    })


}

function getPtauFiles() {
    const filenames = fs.readdirSync(PTAUFILESDIR)
    let foundFiles = [];
    for (let i = 0; i < filenames.length; i++) {
        if (filenames[i].slice(-5) === ".ptau") {
            foundFiles.push(filenames[i])
        }
    }
    return foundFiles
}

function getR1CSFileName() {
    const filenames = fs.readdirSync(COMPILEDDIR);
    let r1csfile = "";
    for (let i = 0; i < filenames.length; i++) {
        if (filenames[i].slice(-5) === ".r1cs") {
            r1csfile = filenames[i]
            break;
        }
    }
    return r1csfile;
}

function makeZkeysDir() {
    if (!fs.existsSync(ZKEYSDIR)) {
        fs.mkdirSync(ZKEYSDIR)
    }
}

function ptauNotFountErrors() {
    console.log(chalk.red("You need to download a ptau file"))
    console.log("Run ", chalk.blue("niftyzk ptaufiles"))
}

module.exports = { compileCircuits, getR1CSFileName, getPtauFiles }