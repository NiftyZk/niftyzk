const { Command } = require("commander");
const figlet = require("figlet");
const { setupWithCurrentDir, setupWithNewDir, checkIfCircomIsInstalled } = require("./lib/init/packages");
const { explainPtauFiles, selectPtauFileToDownload } = require("./lib/loaders/ptauLoader")
const chalk = require("chalk");
const { circuitPrompts } = require("./lib/gencircuit/circuitprompt");
const { compileCircuits } = require("./lib/compile/runcompiler");
const { runServer } = require("./lib/phase2ceremony/server");
const { finalize } = require("./lib/compile/finalize");
const { verificationKey } = require("./lib/compile/verificationkey");

console.log(figlet.textSync("NiftyZK"))

const program = new Command();
program.version("0.0.1")
    .description("Scaffold a new Circom project, compile and run phase-2 ceremonies. Generate a verifier written in rust for Groth-16 proving system.")
    .name("niftyzk")

program
    .command("init")
    .description("Initialize a new project")
    .action(async (_, options) => {

        async function onSuccess() {

            if (options.args.length === 0) {
                await setupWithCurrentDir();
            } else {
                const dirname = options.args[0];
                await setupWithNewDir(dirname)
            }
            console.log(`Run ${chalk.blue("npm install")} in your project folder`)
        }

        checkIfCircomIsInstalled(onSuccess)

    })

program
    .command("ptaufiles")
    .description("Display information about the downloadable ptau files")
    .action(() => {
        explainPtauFiles()
        selectPtauFileToDownload()
    })

program.command("gencircuit")
    .description("Generate circom circuits and javascript tests")
    .action(() => {
        circuitPrompts()
    })

program.command("compile")
    .description("Compile the circuits")
    .option("--circuit [path]", "Specify the location for the circuit. Defaults to circuits/circuit.circom")
    .action((options, command) => {
        if (options.circuit) {
            //Path was specified. compile circuit with that path
            compileCircuits(options.circuit)
        } else {
            //Use default path
            compileCircuits("")
        }

    })

program
    .command("ceremony")
    .description("Runs a phase 2 ceremony server that accepts anonymized contributions via a website. Default port is 3000. Prefix the command with PORT=number to change the default port")
    .action(() => {
        //Run the the ceremony server
        runServer()
    })

program.command("finalize")
    .description("Finalize the circuit after the phase2 ceremony is finished")
    .action(() => {
        //Run circom to finalize the circuit
        finalize()
    })

program
    .command("verificationkey")
    .description("Generate the verification key for this circuit")
    .option("--final", "Export the final verification key after the phase2 ceremony")
    .action(async (options) => {
        await verificationKey(options.final ?? false).then(() => process.exit(0))
    })

program.command("genverifier")
    .description("Generate a Rust verifier, compatible with cosmwasm smart contracts")
    .action(() => {
        //Generate the smart contract, this should be rerun when the circuit is finalized always
        //Output the generated contracts
    })

program.parse();
