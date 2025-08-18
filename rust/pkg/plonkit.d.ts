/* tslint:disable */
/* eslint-disable */
export function export_verification_key(setupfile: string, r1cs_file: string, vk_out: string): boolean;
export function prove(setupfile_bytes: Uint8Array, r1cs_bytes: Uint8Array, witness_bytes: Uint8Array): Uint8Array;
export function verify(vk_bytes: Uint8Array, proof_bytes: Uint8Array): boolean;
