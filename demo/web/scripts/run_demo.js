const child_process = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..", "..", "..");

let outputDirectory = path.join(__dirname, "..", "models");
if (fs.existsSync(outputDirectory)) {
  fs.readdirSync(outputDirectory).forEach((f) => {
    fs.unlinkSync(path.join(outputDirectory, f));
  });
} else {
  fs.mkdirSync(outputDirectory, { recursive: true });
}

const modelDir = path.join(rootDir, "lib", "common");
const modelName = "falcon_params.pv";
fs.copyFileSync(
  path.join(modelDir, modelName),
  path.join(outputDirectory, modelName),
);

fs.writeFileSync(
  path.join(outputDirectory, "falconModel.js"),
  `const falconModel = {
  publicPath: "models/${modelName}",
  forceWrite: true,
};

(function () {
  if (typeof module !== "undefined" && typeof module.exports !== "undefined")
    module.exports = falconModel;
})();`,
);

child_process.execSync(`node server.js -a localhost -p 5000`, {
  shell: true,
  stdio: "inherit",
});
