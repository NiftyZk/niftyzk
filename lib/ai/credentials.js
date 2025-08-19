const passwordPrompt = require("password-prompt");
const fs = require('fs');
const path = require('path')
const { getClient } = require("./openai");


async function promptPassword() {
  const key = await passwordPrompt('Enter the OpenAI API keys: ', { method: 'mask', mask: '*' });
  return key
}


//TODO: make a prompt history folder too that can be gitignored if the user wants to
const filename = '.niftyzkai';  // The file you want to create and ignore

function saveAICredentials(fileContent) {
  // Step 1: Create the file
  fs.writeFileSync(path.join(process.cwd(), filename), fileContent, { flag: 'w' });
  console.log(`Created file: ${filename} with credentials`);
  // Step 2: Update or create .gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore');

  let gitignoreContent = '';
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }

  const lines = gitignoreContent.split(/\r?\n/);
  if (!lines.includes(filename)) {
    lines.push(filename);
    fs.writeFileSync(gitignorePath, lines.filter(Boolean).join('\n') + '\n');
    console.log(`Added "${filename}" to .gitignore`);
  } else {
    console.log(`"${filename}" is already in .gitignore`);
  }
}

/**
 * Reads the content of a file in the current working directory.
 * @param {string} filename - The name of the file to read.
 * @returns {string} The content of the file.
 * @throws Will throw an error if the file cannot be read.
 */
function readAICredentials() {
  const filePath = path.join(process.cwd(), filename);
  return fs.readFileSync(filePath, 'utf8');
}


async function prepareClient() {
  let apiKey = ""
  let client;
  let wasNotFOund = false;
  try {
    apiKey = readAICredentials();
  } catch (err) {
    wasNotFOund = true
    console.error('OpenAi API key not found.');
    const creds = await promptPassword();

    //Check if the api key is correct
    client = await getClient(creds)
    try {
      await client.models.list();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('API key is invalid or unauthorized.');
        return
      } else {
        console.log('Error while validating API key:', error.message);
        return;
      }
    }

    await saveAICredentials(creds)
    apiKey = creds

  }

  if (!wasNotFOund && apiKey !== "") {
    return await getClient(apiKey)
  } else {
    return client
  }

}


module.exports = {
  prepareClient
}

