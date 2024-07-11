![niftybundles logo](niftybundles-logo.webp)

# NiftyBundles CLI
A tool to bundle future transactions into a fixed size merkle tree and validate merkle proofs using a zksnark on-chain

NiftyBundles CLI is used for development for different applications where valid transactions are predetermined and distributed off-chain to users.

Use cases include
* Airdrops that can be emailed or physically distributed and then claimed after
* NFTs attached to real world objects. A QR code could be attached to physical goods. E.g: A bottle of wine with a qr code to mint an nft
* Combining blockchain with real life activities like games - Physically discoverable transactions distributed over an area to enhance a physical game with blockchain rewards.Qr codes scattered around in cities or placed in mazes for people to find checkpoints, use them to mint proof of attendance tokens etc.
* Pre-minting in-game assets which could be purchased with traditional finance.
* Dead man's switches or other deposits where the bundled txs could represent partial amounts of the total deposit.
* Intent based architecture where the proofs represent future transaction intents that can be trustlessly processed by relayers using wallet abstraction
* Voting systems where the bundle contains a right to vote, which can be distributed on multiple channels and decoupled from a wallet when voting, to preserve on-chain anonymity.

And many more!

# Features

The application is a command line toolkit aimed at developers to add to their projects. 
It is  a zero code circom code generating tool, bundle and merkle tree generator, smart contract creator and powers of tau ceremony server.
It also generates dependencies for front end integration and allows users to fully manage their bundles.

It currently supports groth16 proving system with cosmwasm contracts and it's aimed to be used together with another scaffolding tool for the smart contract environment, it will generate a verifier contract but the actual implementation is left to the developer

# Dependencies
It depends on nodejs and npm and will install additional dependencies to package.json including circom, circomlibjs, snarkjs
# Commands

`niftybundles init` - Run the initialization script to scaffold a new project or alternatively add the dependencies to the local directory. This command will generate the circuits and accepts additional inputs for circom circuit templating
The users are prompted to download a ptau file which is needed for the ceremony

`niftybundles ptaufiles` - Display information about the ptau files available for download, used for the powers of tau ceremnoy. The files were created as a phase 1 ceremony for Polygon Hermez and more information can be found about them in the Snarkjs repository

`niftybundles ceremony` - Run a phase2 ceremony server for the circom curcuits. It supports groth-16 proving system. The ceremony server hosts a webpage that allows for contributions and supports ngrok for local hosting

`niftybundles finalize` - Run the finalization for the circuits after the phase2 ceremony has been finished

`niftybundles genbundle` - Generate a fixed sized merkle tree transaction bundle. This will generate the secrets used for the proving system, the public merkle tree and generates client side code for parsing the secrets in the format of crypto notes.
It will generate a client side dependency for parsing bundled crypto notes

`niftybundles gencontract` - Generate the smart contract used for verifying the proofs created with the bundle. Supports cosmwasm and solidity contracts