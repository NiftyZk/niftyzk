const OpenAI = require("openai")

function getClient(apiKey) {
   return client = new OpenAI({
        apiKey: apiKey
    });
}

const CodeType = {
    circom: "circom",
    cosmwasm: "cosmwasm"
}

async function getResponse(
    client,
    prompt,
    preserve,
    content,
    fileExists,
    codeType
) {
    let instructions;
    let input;
    if (preserve) {
        instructions = `You are a coding assistant and ${codeType} expert. Analyze the code for mistakes and answer the prompt.`
        input = `Here is the code: ${content}. Question: `
    } else {

        if (fileExists) {
            instructions = `You are a coding assistant and ${codeType} expert. Update the provided code and output only code that can be directly saved to a file into a ${codeType === CodeType.circom ? ".circom" : ".rs"} file`
            input = `Here is the code: ${content}. Your task: `
        } else {
            instructions = `You are a coding assistant and ${codeType} expert. Create a new circom circuit and output only code that can be directly saved to a file into a ${codeType === CodeType.circom ? ".circom" : ".rs"} file`
            input = `Here is the code: ${content}. Your task: `
        }

    }
    const response = await client.responses.create({
        model: "gpt-5",
        instructions,
        input: input + prompt
    })
    return response.output_text
}

module.exports = {
    getClient,
    getResponse
}