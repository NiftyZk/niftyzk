const chalk = require("chalk");

const ptauFiles = [
    {
        power: 8,
        maxConstraints: "256",
        name: "powersOfTau28_hez_final_08.ptau",
        hash: "d6a8fb3a04feb600096c3b791f936a578c4e664d262e4aa24beed1b7a9a96aa5eb72864d628db247e9293384b74b36ffb52ca8d148d6e1b8b51e279fdf57b583",
        size: 378008
    },
    {
        power: 9,
        maxConstraints: "512",
        name: "powersOfTau28_hez_final_09.ptau",
        hash: "94f108a80e81b5d932d8e8c9e8fd7f46cf32457e31462deeeef37af1b71c2c1b3c71fb0d9b59c654ec266b042735f50311f9fd1d4cadce47ab234ad163157cb5",
        size: 672920
    },
    {
        power: 10,
        maxConstraints: "1K",
        name: "powersOfTau28_hez_final_10.ptau",
        hash: "6cfeb8cda92453099d20120bdd0e8a5c4e7706c2da9a8f09ccc157ed2464d921fd0437fb70db42104769efd7d6f3c1f964bcf448c455eab6f6c7d863e88a5849",
        size: 1262744
    },
    {
        power: 11,
        maxConstraints: "2K",
        name: "powersOfTau28_hez_final_11.ptau",
        hash: "47c282116b892e5ac92ca238578006e31a47e7c7e70f0baa8b687f0a5203e28ea07bbbec765a98dcd654bad618475d4661bfaec3bd9ad2ed12e7abc251d94d33",
        size: 2442392
    },
    {
        power: 12,
        maxConstraints: "4K",
        name: "powersOfTau28_hez_final_12.ptau",
        hash: "ded2694169b7b08e898f736d5de95af87c3f1a64594013351b1a796dbee393bd825f88f9468c84505ddd11eb0b1465ac9b43b9064aa8ec97f2b73e04758b8a4a",
        size: 4801688
    },
    {
        power: 13,
        maxConstraints: "8K",
        name: "powersOfTau28_hez_final_13.ptau",
        hash: "58efc8bf2834d04768a3d7ffcd8e1e23d461561729beaac4e3e7a47829a1c9066d5320241e124a1a8e8aa6c75be0ba66f65bc8239a0542ed38e11276f6fdb4d9",
        size: 9520280
    },
    {
        power: 14,
        maxConstraints: "16K",
        name: "powersOfTau28_hez_final_14.ptau",
        hash: "eeefbcf7c3803b523c94112023c7ff89558f9b8e0cf5d6cdcba3ade60f168af4a181c9c21774b94fbae6c90411995f7d854d02ebd93fb66043dbb06f17a831c1",
        size: 18957464
    },
    {
        power: 15,
        maxConstraints: "32K",
        name: "powersOfTau28_hez_final_15.ptau",
        hash: "982372c867d229c236091f767e703253249a9b432c1710b4f326306bfa2428a17b06240359606cfe4d580b10a5a1f63fbed499527069c18ae17060472969ae6e",
        size: 37831832
    },
    {
        power: 16,
        maxConstraints: "64K",
        name: "powersOfTau28_hez_final_16.ptau",
        hash: "6a6277a2f74e1073601b4f9fed6e1e55226917efb0f0db8a07d98ab01df1ccf43eb0e8c3159432acd4960e2f29fe84a4198501fa54c8dad9e43297453efec125",
        size: 75580568
    },
    {
        power: 17,
        maxConstraints: "128K",
        name: "powersOfTau28_hez_final_17.ptau",
        hash: "6247a3433948b35fbfae414fa5a9355bfb45f56efa7ab4929e669264a0258976741dfbe3288bfb49828e5df02c2e633df38d2245e30162ae7e3bcca5b8b49345",
        size: 151078040
    },
    {
        power: 18,
        maxConstraints: "256K",
        name: "powersOfTau28_hez_final_18.ptau",
        hash: "7e6a9c2e5f05179ddfc923f38f917c9e6831d16922a902b0b4758b8e79c2ab8a81bb5f29952e16ee6c5067ed044d7857b5de120a90704c1d3b637fd94b95b13e",
        size: 302072984
    },
    {
        power: 19,
        maxConstraints: "512K",
        name: "powersOfTau28_hez_final_19.ptau",
        hash: "bca9d8b04242f175189872c42ceaa21e2951e0f0f272a0cc54fc37193ff6648600eaf1c555c70cdedfaf9fb74927de7aa1d33dc1e2a7f1a50619484989da0887",
        size: 604062872
    },
    {
        power: 20,
        maxConstraints: "1M",
        name: "powersOfTau28_hez_final_20.ptau",
        hash: "89a66eb5590a1c94e3f1ee0e72acf49b1669e050bb5f93c73b066b564dca4e0c7556a52b323178269d64af325d8fdddb33da3a27c34409b821de82aa2bf1a27b",
        size: 1208042648
    },
    {
        power: 21,
        maxConstraints: "2M",
        name: "powersOfTau28_hez_final_21.ptau",
        hash: "9aef0573cef4ded9c4a75f148709056bf989f80dad96876aadeb6f1c6d062391f07a394a9e756d16f7eb233198d5b69407cca44594c763ab4a5b67ae73254678",
        size: 2416002200
    },
    {
        power: 22,
        maxConstraints: "4M",
        name: "powersOfTau28_hez_final_22.ptau",
        hash: "0d64f63dba1a6f11139df765cb690da69d9b2f469a1ddd0de5e4aa628abb28f787f04c6a5fb84a235ec5ea7f41d0548746653ecab0559add658a83502d1cb21b",
        size: 4831921304
    },
    {
        power: 23,
        maxConstraints: "8M",
        name: "powersOfTau28_hez_final_23.ptau",
        hash: "3063a0bd81d68711197c8820a92466d51aeac93e915f5136d74f63c394ee6d88c5e8016231ea6580bec02e25d491f319d92e77f5c7f46a9caa8f3b53c0ea544f",
        size: 9663759512
    },
    {
        power: 24,
        maxConstraints: "16M",
        name: "powersOfTau28_hez_final_24.ptau",
        hash: "fa404d140d5819d39984833ca5ec3632cd4995f81e82db402371a4de7c2eae8687c62bc632a95b0c6aadba3fb02680a94e09174b7233ccd26d78baca2647c733",
        size: 19327435928
    },
    {
        power: 25,
        maxConstraints: "32M",
        name: "powersOfTau28_hez_final_25.ptau",
        hash: "0377d860cdb09a8a31ea1b0b8c04335614c8206357181573bf294c25d5ca7dff72387224fbd868897e6769f7805b3dab02854aec6d69d7492883b5e4e5f35eeb",
        size: 38654788760
    },
    {
        power: 26,
        maxConstraints: "64M",
        name: "powersOfTau28_hez_final_26.ptau",
        hash: "418dee4a74b9592198bd8fd02ad1aea76f9cf3085f206dfd7d594c9e264ae919611b1459a1cc920c2f143417744ba9edd7b8d51e44be9452344a225ff7eead19",
        size: 77309494424
    },
    {
        power: 27,
        maxConstraints: "128M",
        name: "powersOfTau28_hez_final_27.ptau",
        hash: "10ffd99837c512ef99752436a54b9810d1ac8878d368fb4b806267bdd664b4abf276c9cd3c4b9039a1fa4315a0c326c0e8e9e8fe0eb588ffd4f9021bf7eae1a1",
        size: 154618905752
    },
    {
        power: 28,
        maxConstraints: "256M",
        name: "powersOfTau28_hez_final.ptau",
        hash: "55c77ce8562366c91e7cda394cf7b7c15a06c12d8c905e8b36ba9cf5e13eb37d1a429c589e8eaba4c591bc4b88a0e2828745a53e170eac300236f5c1a326f41a",
        size: 309237728408
    }
]


function getDownloadLink(name) {
    return `https://https://storage.googleapis.com/zkevm/ptau/${name}`
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function explainPtauFiles() {
    console.log("Available Powers of Tau ceremony files")

    for (let i = 0; i < ptauFiles.length; i++) {
        console.log(`## ${ptauFiles[i].name}`)
        console.log(`Hash ${ptauFiles[i].hash}`)
        console.log(`Power: ${chalk.blue(ptauFiles[i].power)}, Max Constraints: ${chalk.blue(ptauFiles[i].maxConstraints)}`)
        console.log()
        console.log(chalk.blue)

    }
}


module.exports = { ptauFiles, getDownloadLink, formatBytes, explainPtauFiles }