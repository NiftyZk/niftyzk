const chalk = require("chalk");
const { exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer").default;
const { zKey } = require("snarkjs")

function compileCircuits(filePath) {
    if (!fs.existsSync(path.join(process.cwd(), "ptau"))) {
        ptauNotFountErrors()
        return;
    }
    const ptaufiles = getPtauFiles();
    if (ptaufiles.length === 0) {
        ptauNotFountErrors();
        return;
    }

    if (!fs.existsSync(path.join(process.cwd(), "./circuits/compiled"))) {
        fs.mkdirSync(path.join(process.cwd(), "./circuits/compiled"))
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
        const zkey = path.join(process.cwd(), "circuits", "compiled", "zkeys", "circuit_0000.zkey")
        await zKey.newZKey(r1csPath, ptauPath, zkey, { error: console.log, info: console.log, debug: console.log })
        console.log(chalk.green("Ready to start Phase-2 ceremony"))
        console.log("Run ", chalk.blue("niftyzk ceremony"), "to start a ceremony server")
        process.exit(0)

    }).catch((err) => {
        console.log(err)
        console.log("Groth16 setup aborted")
        process.exit(1)
    })


}

function getPtauFiles() {
    const filenames = fs.readdirSync(path.join(process.cwd(), "ptau"))
    let foundFiles = [];
    for (let i = 0; i < filenames.length; i++) {
        if (filenames[i].slice(-5) === ".ptau") {
            foundFiles.push(filenames[i])
        }
    }
    return foundFiles
}

function getR1CSFileName() {
    const filenames = fs.readdirSync(path.join(process.cwd(), "circuits", "compiled"));
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
    if (!fs.existsSync(path.join(process.cwd(), "circuits", "compiled", "zkeys"))) {
        fs.mkdirSync(path.join(process.cwd(), "circuits", "compiled", "zkeys"))
    }
}

function ptauNotFountErrors() {
    console.log(chalk.red("You need to download a ptau file"))
    console.log("Run ", chalk.blue("niftyzk ptaufiles"))
}

module.exports = { compileCircuits }