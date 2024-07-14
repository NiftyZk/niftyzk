
const fs = require("fs");

// Adds a script tag line to the html. This is called during build and it exists because 
// if parcel finds the snarkjs.min.js dependency it will minifyit and wrap it and it will be buggy
// so the script tag for the dependency is appended after parcel finishes the build, before I copy the files to the server.

function appendScriptTag() {
    const tag = `<script src="/snarkjs.min.js"></script>\n</html>`;
    fs.readFile("./dist/index.html", (err, data) => {
        if (err) throw err;
        const str = data.toString();
        const htmlCloseTagIndex = str.indexOf("</html>");
        let appendTo = str.slice(0, htmlCloseTagIndex);
        appendTo += tag;

        fs.writeFile("./dist/index.html", appendTo, "utf8", (err) => {
            if (err) throw err;
        })
    })
}

appendScriptTag();