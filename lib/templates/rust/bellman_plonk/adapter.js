const { utils, buildBn128, buildBls12381 } = require("ffjavascript");
const { unstringifyBigInts } = utils;

async function getCurveFromName(name) {
    let curve;
    const normName = name.toUpperCase().match(/[A-Za-z0-9]+/g).join("");
    if (["BN128", "BN254", "ALTBN128"].includes(normName)) {
        curve = await buildBn128();
    } else if (["BLS12381"].includes(normName)) {
        curve = await buildBls12381();
    } else {
        throw new Error(`Curve not supported: ${name}`);
    }
    return curve;
}


async function vkeyToVkeyStr(vkey) {
    const curve = await buildBn128();

    function parseG1(point) {
        const arr = point.map(BigInt);
        const p = curve.G1.fromObject(arr);
        return Array.from(curve.G1.toUncompressed(p));
    }

    function parseG2(point) {
        const p = curve.G2.fromObject([
            [BigInt(point[0][0]), BigInt(point[0][1])],
            [BigInt(point[1][0]), BigInt(point[1][1])]
        ]);

        return Array.from(curve.G2.toUncompressed(p));
    }

    // return

    const selector_commitments = [
        parseG1(vkey.Qm),
        parseG1(vkey.Ql),
        parseG1(vkey.Qr),
        parseG1(vkey.Qo),
        parseG1(vkey.Qc),
    ];

    const permutation_commitments = [
        parseG1(vkey.S1),
        parseG1(vkey.S2),
        parseG1(vkey.S3),
    ];

    // next_step_selector_commitments is empty in this case
    const next_step_selector_commitments = [];

    // non_residues - provide as string or default for BN254
    const non_residues = ["11", "13", "16"]; // example - replace with actual values you use

    const g2_elements = parseG2(vkey.X_2)//   vkey.X_2.map(parseG2);

    return {
        n: 1 << vkey.power,   // 2^power
        num_inputs: vkey.nPublic,
        selector_commitments,
        next_step_selector_commitments,
        permutation_commitments,
        non_residues,
        g2_elements,
    };
}


async function pointToUncompressed(point, G1) {
    const p = G1.fromObject(point);  // convert to curve point
    return G1.toUncompressed(p);
}

async function convertSnarkjsProof(proof, publicSignals) {
    const bn128 = await buildBn128();
    const G1 = bn128.G1;

    return {
        num_inputs: publicSignals.length,
        input_values: publicSignals.map(String),

        wire_commitments: [
            await pointToUncompressed(proof.A, G1),
            await pointToUncompressed(proof.B, G1),
            await pointToUncompressed(proof.C, G1),
        ],

        grand_product_commitment: await pointToUncompressed(proof.Z, G1),

        quotient_poly_commitments: [
            await pointToUncompressed(proof.T1, G1),
            await pointToUncompressed(proof.T2, G1),
            await pointToUncompressed(proof.T3, G1),
        ],

        wire_values_at_z: [
            proof.eval_a,
            proof.eval_b,
            proof.eval_c,
        ].map(String),

        wire_values_at_z_omega: [
            proof.eval_s1,
            proof.eval_s2,
        ].map(String),

        grand_product_at_z_omega: String(proof.eval_zw),

        quotient_polynomial_at_z: "", // not available from snarkjs proof
        linearization_polynomial_at_z: "", // not available
        permutation_polynomials_at_z: [], // not available

        opening_at_z_proof: await pointToUncompressed(proof.Wxi, G1),

        opening_at_z_omega_proof: await pointToUncompressed(proof.Wxiw, G1),
    };
}

module.exports = { vkeyToVkeyStr, convertSnarkjsProof }
