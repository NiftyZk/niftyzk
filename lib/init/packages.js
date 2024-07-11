const Fs = require("fs")
const PackageJson = require('@npmcli/package-json')
const path = require("path")
const { exec } = require("child_process");
const chalk = require("chalk");

const newEmptyPkgJson = (name) => `{
  "name": "${name}",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "author": "",
  "license": "ISC"
}`

const dependencies = {

}

async function setupWithCurrentDir() {
    console.log("Setting up your current directory")

    const pkgjson = await PackageJson.load(process.cwd())
    // console.log(pkgjson.content)
    if (packageJsonExists()) {

    } else {

    }

}

async function setupWithNewDir(dirname) {
    console.log("Creating a new directory with name ", dirname)
    //Make a new directory, 
    //set up a new package.json
    if (!Fs.existsSync(dirname)) {
        Fs.mkdirSync(dirname)
    }

    const packageJsonPath = path.join(dirname, "package.json")

    if (!Fs.existsSync(packageJsonPath)) {
        Fs.writeFileSync(path.join(dirname, "package.json"), newEmptyPkgJson(dirname))
    }

    const pkgjson = await PackageJson.load(path.join(process.cwd(), dirname))
    console.log(pkgjson)

}

function packageJsonExists() {
    return Fs.existsSync("./package.json")
}

function addDependenciesToPackageJson() { }

function checkIfCircomIsInstalled(onSuccess) {
    exec('circom --version', (err, stdout, stderr) => {
        if (err) {
            console.log(chalk.red("Circom not found"))
            console.log(chalk.blue("Install circom using the installation guide"))
            console.log("https://docs.circom.io/getting-started/installation/")
            return;
        }
        onSuccess()
    })
}

module.exports = { setupWithCurrentDir, setupWithNewDir, checkIfCircomIsInstalled }