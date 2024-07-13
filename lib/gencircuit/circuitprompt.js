const chalk = require("chalk");

const inquirer = require("inquirer").default

const fs = require("fs")
const path = require("path");
const { getPoseidonCommitmentHasher, getGenericCircuit } = require("../templates/circom/genericCommitmentVerifier.js");

const { generateCircuitMetadata } = require("../templates/circom/metadata.js");
const { getJsLib, getTests } = require("../templates/js/templates.js");

function circuitPrompts() {
    console.log("Generating a generic circuit with a commitment reveal scheme and a nullifier.")
    inquirer.prompt([
        {
            type: "confirm",
            name: "addpubinputs",
            message: "Do you wish to add tamperproof public inputs? (E.g: walletaddress): ",
            default: true
        },
        {
            type: "input",
            name: "pubInputs",
            message: "Enter the name of the public inputs in a comma separated list (no numbers or special characters): ",
            when(answers) {
                return answers["addpubinputs"];
            }
        }
    ]).then(async (answers) => {
        configExists()
        const { addpubinputs, pubInputs } = answers;
        if (addpubinputs) {
            const publicInputsArr = sanitizePublicInputs(pubInputs)
            genCircuits(publicInputsArr)


            genJs(publicInputsArr)

            console.log(chalk.green("Done"))
        } else {
            genCircuits([])
            genJs([])
        }

    }).catch(err => {
        console.log(err)
        console.log("Aborted")
    })
}

function sanitizePublicInputs(pubInputString) {
    const array = pubInputString.toLowerCase().replaceAll(" ", "").split(",")
    for (let i = 0; i < array.length; i++) {
        if (!onlyLowercaseLetters(array[i])) {
            console.log(`Invalid public input name ${chalk.red(array[i])}`)
            throw new Error("Invalid input")
        }
    }
    //remove duplicates
    return Array.from(new Set(array));
}

function onlyLowercaseLetters(str) {
    return /^[a-z]*$/.test(str)
}

function configExists() {
    if (!fs.existsSync(path.join(process.cwd(), "niftycircuit.json"))) {
        console.log(chalk.red("niftycircuit.json not found"))
        throw new Error("niftycircuit.json not found")
    }
}

function genCircuits(publicInputsArr) {
    console.log(chalk.yellow("Generating circuits"))

    const circuitsDir = path.join(process.cwd(), "circuits");
    if (!fs.existsSync(circuitsDir)) {
        fs.mkdirSync(circuitsDir)
    }
    const metadata = generateCircuitMetadata({ extraPublicInputsArr: publicInputsArr })
    const circuitTemplates = [
        {
            name: "commitment_hasher.circom",
            content: getPoseidonCommitmentHasher()
        },
        {
            name: "commitment_reveal_scheme.circom",
            content: getGenericCircuit(publicInputsArr)
        }
    ]

    //write the circuits to file

    fs.writeFileSync(path.join(circuitsDir, circuitTemplates[0].name), circuitTemplates[0].content)
    fs.writeFileSync(path.join(circuitsDir, circuitTemplates[1].name), circuitTemplates[1].content)

    fs.writeFileSync(path.join(process.cwd(), "niftycircuit.json"), metadata)

}

function genJs(extraPublicInputsArr) {
    console.log(chalk.yellow("Generating javascript"))
    const libPath = path.join(process.cwd(), "lib");
    if (!fs.existsSync(libPath)) {
        fs.mkdirSync(libPath)
    }
    const testpath = path.join(process.cwd(), "tests");
    if (!fs.existsSync(testpath)) {
        fs.mkdirSync(testpath)
    }

    const lib = getJsLib(extraPublicInputsArr)
    const tests = getTests(extraPublicInputsArr)

    fs.writeFileSync(path.join(libPath, "index.js"), lib)
    fs.writeFileSync(path.join(testpath, "index.test.js"), tests)
}

module.exports = { circuitPrompts }