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
    circomlib: "^2.0.5",
    circomlibjs: "^0.1.7",
    ffjavascript: "^0.3.0",
    snarkjs: "^0.7.4"
}

async function setupWithCurrentDir() {
    console.log("Setting up your current directory")

    if (packageJsonExists()) {
        const pkgjson = await PackageJson.load(process.cwd())

        pkgjson.update({
            dependencies: {
                ...dependencies,
                ...pkgjson.content.dependencies
            }
        })
        await pkgjson.save()
    } else {
        Fs.writeFileSync(path.join(process.cwd(), newEmptyPkgJson(path.basename(process.cwd()))))
        const pkgjson = await PackageJson.load(path.join(process.cwd(), dirname))
        pkgjson.update({ dependencies })
        await pkgjson.save()
    }

}

async function setupWithNewDir(dirname) {
    console.log("Creating a new directory with name ", dirname)
    if (!Fs.existsSync(dirname)) {
        Fs.mkdirSync(dirname)
    }

    const packageJsonPath = path.join(dirname, "package.json")

    if (!Fs.existsSync(packageJsonPath)) {
        Fs.writeFileSync(path.join(dirname, "package.json"), newEmptyPkgJson(dirname))
    }

    const pkgjson = await PackageJson.load(path.join(process.cwd(), dirname))
    pkgjson.update(
        {
            dependencies: {
                ...dependencies,
                ...pkgjson.content.dependencies
            }
        }
    )
    await pkgjson.save()

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