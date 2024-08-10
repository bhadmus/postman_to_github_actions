#!/usr/bin/env node

import fs from "fs-extra";
import path from "path";
import fetch from "node-fetch";
import inquirer from "inquirer";
import { config } from "dotenv";
import {
  generateGithubActionsYaml,
  makeCommit,
  exportPostmanCollection,
  createGithubRepo,
  verifyGithubActionsWorkflow,
  initializeRepoWithReadme,
  readmeExists,
  createAndInstallPackageJson,
  exportPostmanEnvironment,
} from "./helperFunctions.mjs";

// Load environment variables
config();

async function main() {
  try {
    // Check for GitHub token
    let githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      const { token } = await inquirer.prompt({
        type: "input",
        name: "token",
        message: "Enter your GitHub token:",
      });
      githubToken = token;
      process.env.GITHUB_TOKEN = githubToken;
      fs.appendFileSync(
        path.join(process.env.HOME, ".bashrc"),
        `\nexport GITHUB_TOKEN=${githubToken}\n`
      );
    }

    // Check if the collection requires an environment
    const { environmentRequired } = await inquirer.prompt({
      type: "confirm",
      name: "environmentRequired",
      message: "Does the Postman collection need an environment?",
      default: false,
    });

    // Ask if the Postman collection is from UID or file
    const { collectionSource } = await inquirer.prompt({
      type: "list",
      name: "collectionSource",
      message: "Is the Postman collection from UID or filepath?",
      choices: ["UID", "filepath"],
      default: "UID",
    });

    let collectionFilePath;
    let environmentFilePath;
    if (!environmentRequired) {
      if (collectionSource === "UID") {
        let postmanApiKey = process.env.POSTMAN_API_KEY;
        if (!postmanApiKey) {
          const { apiKey } = await inquirer.prompt({
            type: "input",
            name: "apiKey",
            message: "Enter your Postman API key:",
          });
          postmanApiKey = apiKey;
          process.env.POSTMAN_API_KEY = postmanApiKey;
          fs.appendFileSync(
            path.join(process.env.HOME, ".bashrc"),
            `\nexport POSTMAN_API_KEY=${postmanApiKey}\n`
          );
        }
        const { collectionId } = await inquirer.prompt({
          type: "input",
          name: "collectionId",
          message: "Enter the Postman collection ID:",
        });
        collectionFilePath = "collection.json";
        await exportPostmanCollection(
          postmanApiKey,
          collectionId,
          collectionFilePath
        );
      } else if (collectionSource === "filepath") {
        const { filePath } = await inquirer.prompt({
          type: "input",
          name: "filePath",
          message: "Enter the path to the Postman collection JSON file:",
        });
        collectionFilePath = filePath;
      } else {
        console.log("Invalid option. Exiting.");
        return;
      }
    } else {
      // Ask if the Postman environment is from UID or file
      const { environmentSource } = await inquirer.prompt({
        type: "list",
        name: "environmentSource",
        message: "Is the Postman environment from UID or filepath?",
        choices: ["UID", "filepath"],
        default: "UID",
      });
      if (environmentSource === "UID" && collectionSource === "UID") {
        let postmanApiKey = process.env.POSTMAN_API_KEY;
        if (!postmanApiKey) {
          const { apiKey } = await inquirer.prompt({
            type: "input",
            name: "apiKey",
            message: "Enter your Postman API key:",
          });
          postmanApiKey = apiKey;
          process.env.POSTMAN_API_KEY = postmanApiKey;
          fs.appendFileSync(
            path.join(process.env.HOME, ".bashrc"),
            `\nexport POSTMAN_API_KEY=${postmanApiKey}\n`
          );
        }
        const { collectionId } = await inquirer.prompt({
          type: "input",
          name: "collectionId",
          message: "Enter the Postman collection ID:",
        });
        collectionFilePath = "collection.json";
        const { environmentId } = await inquirer.prompt({
          type: "input",
          name: "environmentId",
          message: "Enter the Postman environment ID:",
        });
        environmentFilePath = "environment.json";
        await exportPostmanCollection(
          postmanApiKey,
          collectionId,
          collectionFilePath
        );
        await exportPostmanEnvironment(
          postmanApiKey,
          environmentId,
          environmentFilePath
        );
      } else if (environmentSource === "filepath" && collectionSource === "filepath"){
        const { filePath } = await inquirer.prompt({
          type: "input",
          name: "filePath",
          message: "Enter the path to the Postman collection JSON file:",
        });
        collectionFilePath = filePath;
        const { envPath } = await inquirer.prompt({
          type: "input",
          name: "envPath",
          message: "Enter the path to the Postman environment JSON file:",
        });
        environmentFilePath = envPath;

      }else if (environmentSource === "filepath" && collectionSource === "UID"){
        let postmanApiKey = process.env.POSTMAN_API_KEY;
        if (!postmanApiKey) {
          const { apiKey } = await inquirer.prompt({
            type: "input",
            name: "apiKey",
            message: "Enter your Postman API key:",
          });
          postmanApiKey = apiKey;
          process.env.POSTMAN_API_KEY = postmanApiKey;
          fs.appendFileSync(
            path.join(process.env.HOME, ".bashrc"),
            `\nexport POSTMAN_API_KEY=${postmanApiKey}\n`
          );
        }
        const { collectionId } = await inquirer.prompt({
          type: "input",
          name: "collectionId",
          message: "Enter the Postman collection ID:",
        });
        collectionFilePath = "collection.json";
        const { envPath } = await inquirer.prompt({
          type: "input",
          name: "envPath",
          message: "Enter the path to the Postman environment JSON file:",
        });
        environmentFilePath = envPath;
        await exportPostmanCollection(
          postmanApiKey,
          collectionId,
          collectionFilePath
        );

      }else if (environmentSource === "UID" && collectionSource === "filepath"){
        let postmanApiKey = process.env.POSTMAN_API_KEY;
        if (!postmanApiKey) {
          const { apiKey } = await inquirer.prompt({
            type: "input",
            name: "apiKey",
            message: "Enter your Postman API key:",
          });
          postmanApiKey = apiKey;
          process.env.POSTMAN_API_KEY = postmanApiKey;
          fs.appendFileSync(
            path.join(process.env.HOME, ".bashrc"),
            `\nexport POSTMAN_API_KEY=${postmanApiKey}\n`
          );
        }
        const { filePath } = await inquirer.prompt({
          type: "input",
          name: "filePath",
          message: "Enter the path to the Postman collection JSON file:",
        });
        collectionFilePath = filePath;
        const { environmentId } = await inquirer.prompt({
          type: "input",
          name: "environmentId",
          message: "Enter the Postman environment ID:",
        });
        environmentFilePath = "environment.json";
        await exportPostmanEnvironment(
          postmanApiKey,
          environmentId,
          environmentFilePath
        );

      }
    }

/**
 * CONTINUE LATER TODAY WITH THE FOLLOWING:
 * ENV=FILEPATH && COL=UID.
 * ENV=UID && COL=FILEPATH
 */

    // Verify if collection.json file is created and exists locally
    if (!fs.existsSync(collectionFilePath)) {
      throw new Error("Collection file not found. Exiting.");
    }

    // Ask if it is a new or existing GitHub repo
    const { repoChoice } = await inquirer.prompt({
      type: "list",
      name: "repoChoice",
      message: "Is it an existing or new GitHub repo?",
      choices: ["existing", "new"],
      default: "new",
    });

    let repoFullName;
    if (repoChoice === "existing") {
      const { repoName } = await inquirer.prompt({
        type: "input",
        name: "repoName",
        message: "Enter the full repository name (e.g., username/repo):",
      });
      repoFullName = repoName;
      // Check if README.md exists in the repository
      if (!(await readmeExists(githubToken, repoFullName))) {
        // Initialize the repository if README.md does not exist
        if (!(await initializeRepoWithReadme(githubToken, repoFullName))) {
          return;
        }
      }
    } else if (repoChoice === "new") {
      const { repoName } = await inquirer.prompt({
        type: "input",
        name: "repoName",
        message: "Enter the repository name:",
      });
      repoFullName = await createGithubRepo(githubToken, repoName);
      if (!repoFullName) {
        console.log("Failed to create the repository. Exiting.");
        return;
      }
      // Initialize the new repository with a README
      if (!(await initializeRepoWithReadme(githubToken, repoFullName))) {
        return;
      }
    } else {
      console.log("Invalid option. Exiting.");
      return;
    }

    // Generate GitHub Actions YAML file
    const githubDir = path.join(process.cwd(), ".github", "workflows");
    fs.ensureDirSync(githubDir); // Ensure the directory exists
    const outputYamlFilePath = path.join(githubDir, "postman-tests.yml");
    generateGithubActionsYaml(
      collectionFilePath,
      environmentFilePath,
      outputYamlFilePath
    );

    // Verify if the YAML file is created and exists locally
    if (!fs.existsSync(outputYamlFilePath)) {
      throw new Error("GitHub Actions YAML file not found. Exiting.");
    }

    // Create and install package.json with dependencies
    const projectDir = process.cwd();
    createAndInstallPackageJson(projectDir, { collectionFilePath });

    // Verify if package.json and package-lock.json are created and exist locally
    if (
      !fs.existsSync(path.join(projectDir, "package.json")) ||
      !fs.existsSync(path.join(projectDir, "package-lock.json"))
    ) {
      throw new Error("package.json or package-lock.json not found. Exiting.");
    }

    // Commit changes to the repository
    let commitFiles;
    if(environmentFilePath){
      commitFiles = [
      outputYamlFilePath,
      collectionFilePath,
      environmentFilePath,
      path.join(projectDir, "package.json"),
      path.join(projectDir, "package-lock.json"),
    ];

    }else{
      commitFiles = [
        outputYamlFilePath,
        collectionFilePath,
        path.join(projectDir, "package.json"),
        path.join(projectDir, "package-lock.json"),
      ];
    }
    const commitMessage = "Create Pipeline Config";
    await makeCommit(githubToken, repoFullName, commitFiles, commitMessage);

    // Wait to ensure that the workflow file is processed by GitHub
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds

    // Verify GitHub Actions workflow
    const workflowCreated = await verifyGithubActionsWorkflow(repoFullName);
    if (workflowCreated) {
      console.log("GitHub Actions workflow was successfully created.");
    } else {
      console.log("Failed to create GitHub Actions workflow.");
    }
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}

// Run the main function
main().catch((error) => console.error(error));
