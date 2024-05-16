import { addLogMessageMetadata, LogMessageLevel } from "./log";
import licenseChecker from "license-checker";
import path from "path";
import fs from "fs";
import MarkdownIt from "markdown-it";

const md = MarkdownIt();
const licenseNameRegEx =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?([a-z0-9-~][a-z0-9-._~]*)(@[\d\.]*)(-rc\.[0-9]*)?$/g;

interface LicenseData {
  [key: string]: {
    homepage: string | Promise<unknown>;
    license: string | Promise<unknown>;
  };
}

async function getLicenses() {
  return new Promise((resolve, reject) => {
    licenseChecker.init(
      {
        start: path.join(__dirname, "..", "..", "..")
      },
      async function (error: Error, packages: object) {
        if (error) {
          console.log(
            addLogMessageMetadata(error.stack, LogMessageLevel.ERROR)
          );
        } else {
          let licensesToReturn = <LicenseData>{};
          let moduleNames: Array<string> = [];
          for (const key of Object.keys(packages)) {
            let toAdd = key;
            toAdd = toAdd.replace(licenseNameRegEx, "$1$2");
            moduleNames.push(toAdd);
          }
          moduleNames = moduleNames.filter((moduleName) => {
            return !(moduleName.indexOf("mathematicalbasedefenders.com") > -1);
          });
          for (let moduleName of moduleNames) {
            licensesToReturn[moduleName.toString()] = {
              homepage: await getRepositoryLink(
                path.join(
                  __dirname,
                  "..",
                  "..",
                  "..",

                  "/node_modules/",
                  moduleName,
                  "/package.json"
                )
              ),
              license: await readLicenseFile(
                path.join(
                  __dirname,
                  "..",
                  "..",
                  "..",
                  "/node_modules/",
                  moduleName
                )
              )
            };
          }
          resolve(licensesToReturn);
        }
      }
    );
  });
}

async function getRepositoryLink(path: string): Promise<string> {
  try {
    let data = fs.readFileSync(path, "utf8");
    if (data == null) {
      // (No repository link found.)
      return "";
    }
    return JSON.parse(data)?.repository?.url;
  } catch (error) {
    log.warn(`No node_modules directory for ${path} found.`);
  }
  // (Error loading repository link.)
  return "";
}

async function readLicenseFile(path: string): Promise<string> {
  let licenseFileNames: Array<string> = [
    "LICENSE",
    "LICENSE.md",
    "LICENCE",
    "LICENCE.md"
  ];
  try {
    for (let fileName of licenseFileNames) {
      if (fs.existsSync(`${path}/${fileName}`)) {
        let content = fs.readFileSync(`${path}/${fileName}`, "utf8");
        if (content === "") {
          continue;
        }
        return md.render(content);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      log.error(error.stack);
    } else {
      log.error(`Unknown license error: ${error}`);
    }
    return "(Error loading LICENSE file.)";
  }
  return "(No LICENSE file found.)";
}

export { getLicenses };
