# NiftyBundles CLI
A tool to bundle future transactions into a fixed size merkle tree and validate merkle proofs using a zksnark on-chain

NiftyBundles CLI is used for development for different applications where valid transactions are predetermined and distributed off-chain.
Use cases include
* Airdrops where proofs are emailed or physically distributed and then can be claimed by consuming the proofs on-chain
* NFTs attached to real world objects - similar to airdrops, an NFT could be attached to physical goods or assets that are tokenized on-chain which can be used to mint an NFT, transfer it or do a similar action
* Combining blockchain with real life activities, games - Valid proofs could be distributed as qr codes over an area to enhance a physical game with blockchain rewards, scattered around cities for people to find checkpoints and use them to mint proof of attendance tokens.
* Dead man's switches where proofs could be used to withdraw partial amounts of deposits for an on-chain will fulfillment system
* Intent based architecture where the proofs represent future transactions that can be trustlessly processed by relayers using wallet abstraction
And many more!

Design decisions

The application is a command line toolkit aimed at developers to build upon, a zero code circom code generating tool. It will generate all required code for the front-end,circuits and smart contracts and lead the users through the process of a powersoftau ceremony

It currently supports groth16 proving system with cosmwasm contracts and it's aimed to be used together with another scaffolding tool for the smart contract environment, it will only generate an example contract to use