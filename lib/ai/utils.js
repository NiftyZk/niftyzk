const path = require('path')
function isInCwd(inputPath) {
    const cwd = process.cwd();
    const resolvedPath = path.resolve(cwd, inputPath);

    // Normalize both paths to avoid issues with trailing slashes or ".."
    const normalizedCwd = path.normalize(cwd + path.sep);
    const normalizedPath = path.normalize(resolvedPath + path.sep);

    return normalizedPath.startsWith(normalizedCwd);
}

module.exports = { isInCwd }