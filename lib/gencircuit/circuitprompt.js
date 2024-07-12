const chalk = require("chalk");

const inquirer = require("inquirer").default

const fs = require("fs")
const path = require("path")

function circuitPrompts() {
    console.log("Generating a generic circuit with a commitment reveal scheme and a nullifier.")
    console.log("Do you wish to add public inputs for tamperproofing?")
    inquirer.prompt([
        {
            type: "confirm",
            name: "addpubinputs",
            message: "Do you wish to add public inputs for tamperproofing? (E.g: walletAddress): ",
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
            console.log(chalk.green("Generating circuits"))
        }
    }).catch(err => {
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

module.exports = { circuitPrompts }