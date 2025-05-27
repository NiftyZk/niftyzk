const { Command } = require("commander");
const figlet = require("figlet");
const { setupWithCurrentDir, setupWithNewDir, checkIfCircomIsInstalled } = require("./lib/init/packages");
const { explainPtauFiles, selectPtauFileToDownload, isValidPtauFilename, downloadPtauFile } = require("./lib/loaders/ptauLoader")
const chalk = require("chalk");
const { circuitPrompts } = require("./lib/gencircuit/circuitprompt");
const { compileCircuits } = require("./lib/compile/runcompiler");
const { runServer } = require("./lib/phase2ceremony/server");
const { finalize } = require("./lib/compile/finalize");
const { verificationKey } = require("./lib/compile/verificationkey");
const { genContract } = require("./lib/compile/contract");
const { hotReload } = require("./lib/dev/hotreload");

console.log(figlet.textSync("NiftyZK"))

const program = new Command();
program.version("0.2.0")
    .description("Scaffold a new Circom project and circuits, compile it and run Powers of Tau Phase-2 ceremonies. Generate a cosmwasm verifier contract. Supports Groth-16 with a BN128 curve")
    .name("niftyzk")

program
    .command("init")
    .description("Initialize and scaffold a new project")
    .action(async (_, options) => {
        async function onSuccess() {

            if (options.args.length === 0) {
                await setupWithCurrentDir().then(() => {
                    circuitPrompts(undefined)
                });
            } else {
                const dirname = options.args[0];
                await setupWithNewDir(dirname).then(() => {
                    circuitPrompts(dirname)
                })
            }
        }

        checkIfCircomIsInstalled(onSuccess)

    })

program
    .command("ptaufiles")
    .description("Display information and download ptau files")
    .option("-f, --filename [filename]", "The file to download")
    .action(async (option) => {
        if (
            typeof option.filename === "string" &&
            isValidPtauFilename(option.filename)) {
            await downloadPtauFile(option.filename)
        } else {
            explainPtauFiles()
            selectPtauFileToDownload()
        }

    })

program.command("gencircuit")
    .description("Generate circom circuits and javascript tests for the current directory")
    .action(() => {
        circuitPrompts(undefined)
    })

program.command("dev")
    .description("Hot reload for circuit development. input.js must contain a valid circuit input")
    .option("--circuit [path]", "The circuit to test. Defaults to circuits/circuit.circom")
    .option("--assertout", "Asserts the output of the circuit. The output must be exported from a getOutput() function from input.js")
    .option("--verbose", "Show extra information for debugging")
    .action(async (options) => {
        await hotReload(options.circuit, options.assertout, options.verbose);
    })


program.command("compile")
    .description("Compile the circuits. Defaults to Groth16 with a BN254 curve. Use the setup plonk flag if you want to use plonk")
    .option("--circuit [path]", "Specify the location for the circuit. Defaults to circuits/circuit.circom")
    .option("--setup-plonk", "Setup the circuit with PLONK. It creates the final circuit. There is no need for a ceremony.")
    .action((options, command) => {
        if (options.circuit) {
            //Path was specified. compile circuit with that path
            compileCircuits(options.circuit, options.setupPlonk)
        } else {
            //Use default path
            compileCircuits("", options.setupPlonk)
        }
    })

program
    .command("ceremony")
    .description("Only for Groth16. Runs a phase 2 ceremony server that accepts anonymized contributions via a website. Default port is 3000. Prefix the command with PORT=number to change the default port")
    .action(() => {
        //Run the the ceremony server
        runServer()
    })

program.command("finalize")
    .description("Only for Groth16. Finalize the circuit after the phase2 ceremony is finished")
    .option("-b, --beacon [string]", "A random beacon to use for finalizing the ceremony. For example a block hash or a hex number outputted by a Verifiable Delay Function (VDF)")
    .option("-i, --iter [num]", "Number of iterations")
    .option("-n, --name [string]", "The name of the final contribution")
    .action(async (options) => {
        if (!options.beacon) {
            console.log(chalk.red("Missing beacon option"))
            return;
        }
        console.log(options)
        if (typeof options.beacon === "boolean") {
            console.log("Missing beacon value")
            return;
        }

        if (options.beacon.length < 10) {
            console.log(chalk.red("Beacon too short"))
            return;
        }

        //TODO: Check if the beacon is a valid hex string

        await finalize(options.beacon, options.iter, options.name)
    })


program
    .command("vkey")
    .description("Generate the verification key for this circuit.")
    .option("--final", "Export the final verification key for PLONK or after the Phase2 ceremony")
    .action(async (options) => {
        await verificationKey(options.final ?? false).catch(err => {
            console.log(err.message)
        }).then(() => process.exit(0))
    })

program.command("gencontract")
    .description("Generate a cosmwasm verifier smart contract")
    .option("--circuit", "The full name of the circuit file to use. Defaults to circuit.circom")
    .option("--ark", "Use the Arkworks Groth-16 verifier implementation")
    .option("--bellman", "Use the Bellman Groth-16 verifier implementation")
    .option("--overwrite", "If a contract directory already exists, you are required use this option to overwrite it.")
    .option("--folder [name]", "Specify the name of the generated contract's folder")
    .action(async (options) => {

        //TODO: Read if it's groth16 or plonk from the verification key and generate the contract

        if (!options.ark && !options.bellman) {
            console.log(chalk.red("You need to use either --ark or --bellman implementations!"))
            return;
        }
        if (options.ark && options.bellman) {
            console.log(chalk.red("Can't use --ark and --bellman at the same time. Select one."))
            return;
        }
        if (!options.folder) {
            console.log(chalk.red("Use the --folder flag to specify the name of the contract directory"))
            return;
        }

        if (typeof options.folder !== "string") {
            console.log(chalk.red("Must specify the name of the folder to generate the contracts to."))
            return;
        }


        await genContract(options)
    })


program.parse();
