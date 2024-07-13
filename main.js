const { Command } = require("commander");
const figlet = require("figlet");
const { setupWithCurrentDir, setupWithNewDir, checkIfCircomIsInstalled } = require("./lib/init/packages");
const { explainPtauFiles, selectPtauFileToDownload } = require("./lib/loaders/ptauLoader")
const chalk = require("chalk");
const { circuitPrompts } = require("./lib/gencircuit/circuitprompt");
console.log(figlet.textSync("NiftyZK"))

const program = new Command();
program.version("0.0.1")
    .description("Bundle future transactions into a fixed size merkle tree for off-chain distribution. Run zkp Ceremonies and generate verifier smart-contracts that validate merkle proofs using zksnarks")
    .name("NiftyBundles")

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
    .description("Generate the circuit to use with a nifty bundle")
    .action(() => {
        circuitPrompts()
    })

program.command("genwitness")
    .description("Compile the circuits and generate the witness")
    .action(() => { })

program
    .command("ceremony")
    .description("Runs a phase 2 ceremony server that accepts anonymized contributions via a website")
    .option("--ngrok", "Host the server locally using ngrok")
    .option("--port", "The port to host the ceremony")
    .option("--page", "Path to a html component to customize the hosted ceremony page")
    .action(() => {
        //Run the the ceremony server
    })

program.command("finalizecircuit")
    .description("Finalize the circuit after the phase2 ceremony is finished")
    .action(() => {
        //Run circom to finalize the circuit
    })

program.command("gencontract")
    .description("Generate the cosmwasm or solidity smart contracts to verify the transactions on-chain for the bundle")
    .option("--bundle", "Specify the path of the bundle to generate a smart contract for.")
    .option("--cosmwasm", "Generate a cosmwasm smart contract template")
    .option("--solidity", "Generate a solidity smart contract template")
    .action(() => {
        //Generate the smart contract, this should be rerun when the circuit is finalized always
        //Output the generated contracts
    })

program.parse();
