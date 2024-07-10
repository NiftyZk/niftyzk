//Generates metadata about the contents of the config file for the circuits

function generateMetadata({ extraPublicInputs }) {
    const json = {
        extraPublicInputs
    }
    return JSON.stringify(json)
}
