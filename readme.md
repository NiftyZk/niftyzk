# NiftyBundles CLI
A tool to bundle future transactions into a fixed size merkle tree and validate merkle proofs using a zksnark on-chain

NiftyBundles CLI is used for development for different applications where valid transactions are predetermined and distributed off-chain to users.

Use cases include
* Airdrops that can be emailed or physically distributed and then claimed later
* NFTs attached to real world objects. It could be attached to physical goods or linked to servces.
* Combining blockchain with real life activities like games - Valid proofs could be distributed as qr codes over an area to enhance a physical game with blockchain rewards, scattered around cities for people to find checkpoints and use them to mint proof of attendance tokens.
* Pre-minting in-game assets
* Dead man's switches where the recipients don't have to own a crypto wallet, bundled txs could represent the withdrawal of partial amounts of the total deposit.
* Intent based architecture where the proofs represent future transactions that can be trustlessly processed by relayers using wallet abstraction
* Voting systems where the bundle contains a right to vote, which can be distributed on multiple channels and decoupled from a wallet when voting to preserve on-chain anonymity, while the voting service can KYC at will

And many more!

Design decisions

The application is a command line toolkit aimed at developers to build upon, a zero code circom code generating tool. It will generate all required code for the front-end,circuits and smart contracts and lead the users through the process of a powersoftau ceremony

It currently supports groth16 proving system with cosmwasm contracts and it's aimed to be used together with another scaffolding tool for the smart contract environment, it will only generate an example contract to use