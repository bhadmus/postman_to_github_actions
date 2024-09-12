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
    let githubToken,
      environmentRequired,
      postmanApiKey,
      collectionSource,
      collectionFilePath,
      environmentFilePath,
      repoChoice,
      repoNewName;

    // Define a prompt flow using a switch case to control the prompt sequence.
    let promptStep = "githubToken"; // Initial step
    // async function promptApiKey () {}
    while (promptStep) {
      switch (promptStep) {
        case "githubToken":
          // Check for GitHub token
          githubToken =
            process.env.GITHUB_TOKEN ||
            (await inquirer
              .prompt({
                type: "input",
                name: "token",
                message: "Enter your GitHub token:",
              })
              .then(({ token }) => token));

          fs.appendFileSync(
            path.join(process.env.HOME, ".bashrc"),
            `\nexport GITHUB_TOKEN=${githubToken}\n`
          );
          promptStep = "environmentRequired";
          break;

        case "environmentRequired":
          // Check if the collection requires an environment
          environmentRequired =
            process.env.ENVIRONMENT_REQUIRED ||
            (await inquirer
              .prompt({
                type: "list",
                name: "environmentRequired",
                message: "Does the Postman collection need an environment?",
                choices: ["YES", "NO"],
                default: "NO",
              })
              .then(({ environmentRequired }) => environmentRequired));
          promptStep = "collectionSource";
          break;

        case "collectionSource":
          // Ask if the Postman collection is from UID or file
          collectionSource =
            process.env.COLLECTION_SOURCE ||
            (await inquirer
              .prompt({
                type: "list",
                name: "collectionSource",
                message: "Is the Postman collection from UID or filepath?",
                choices: ["UID", "filepath"],
                default: "UID",
              })
              .then(({ collectionSource }) => collectionSource));

          if (collectionSource === "UID") {
            promptStep = "postmanApiKey";
          } else {
            promptStep = "collectionFilePath";
          }
          break;

        case "postmanApiKey":
          // Prompt for Postman API key if required
          postmanApiKey =
            process.env.POSTMAN_API_KEY ||
            (await inquirer
              .prompt({
                type: "input",
                name: "postmanApiKey",
                message: "Enter your Postman API key:",
              })
              .then(({ postmanApiKey }) => postmanApiKey));
          fs.appendFileSync(
            path.join(process.env.HOME, ".bashrc"),
            `\nexport POSTMAN_API_KEY=${postmanApiKey}\n`
          );
          promptStep = "collectionId";
          break;

        case "collectionId":
          if (collectionSource === "UID" && environmentRequired === "NO") {
            const collectionId =
              process.env.COLLECTION_ID ||
              (await inquirer
                .prompt({
                  type: "input",
                  name: "collectionId",
                  message: "Enter the Postman collection ID:",
                })
                .then(({ collectionId }) => collectionId));

            collectionFilePath = "collection.json";
            await exportPostmanCollection(
              postmanApiKey,
              collectionId,
              collectionFilePath
            );
            promptStep = "repoChoice";
          } else if (collectionSource === "UID" && environmentRequired === "YES"){
            const collectionId =
              process.env.COLLECTION_ID ||
              (await inquirer
                .prompt({
                  type: "input",
                  name: "collectionId",
                  message: "Enter the Postman collection ID:",
                })
                .then(({ collectionId }) => collectionId));
  
            collectionFilePath = "collection.json";
            await exportPostmanCollection(
              postmanApiKey,
              collectionId,
              collectionFilePath
            );
            promptStep = 'environmentSource'
          } else if (collectionSource === "filepath" && environmentRequired === "NO"){
            // Prompt for Postman Collection Filepath if 'filepath' was selected
            const { filePath } = await inquirer.prompt({
              type: "input",
              name: "filePath",
              message: "Enter the path to the Postman collection JSON file:",
            });
            collectionFilePath = filePath;
            promptStep = "repoChoice";
          }else if (collectionSource === "filepath" && environmentRequired === "YES"){
            // Prompt for Postman Collection Filepath if 'filepath' was selected
            const { filePath } = await inquirer.prompt({
              type: "input",
              name: "filePath",
              message: "Enter the path to the Postman collection JSON file:",
            });
            collectionFilePath = filePath;
            promptStep = "environmentSource";
          }
          break;

        case "environmentSource":
          // Ask if the Postman environment is from UID or file
          if (environmentRequired === "YES") {
            const { environmentSource } = await inquirer.prompt({
              type: "list",
              name: "environmentSource",
              message: "Is the Postman environment from UID or filepath?",
              choices: ["UID", "filepath"],
              default: "UID",
            });
            if (environmentSource === "UID") {
              const environmentId = await inquirer
                .prompt({
                  type: "input",
                  name: "environmentId",
                  message: "Enter the Postman environment ID:",
                })
                .then(({ environmentId }) => environmentId);

              environmentFilePath = "environment.json";
              await exportPostmanEnvironment(
                postmanApiKey,
                environmentId,
                environmentFilePath
              );
            } else {
              const { envPath } = await inquirer.prompt({
                type: "input",
                name: "envPath",
                message: "Enter the path to the Postman environment JSON file:",
              });
              environmentFilePath = envPath;
              // Verify if collection file exists
              if (!fs.existsSync(collectionFilePath)) {
                throw new Error("Collection file not found. Exiting.");
              }
            }
            promptStep = "repoChoice";
            break;
          } else {
            promptStep = "repoChoice";
            break;
          }

        case "repoChoice":
          repoChoice =
            process.env.REPO_CHOICE ||
            (await inquirer
              .prompt({
                type: "list",
                name: "repoChoice",
                message: "Is it an existing or new GitHub repo?",
                choices: ["existing", "new"],
                default: "new",
              })
              .then(({ repoChoice }) => repoChoice));

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
              if (
                !(await initializeRepoWithReadme(githubToken, repoFullName))
              ) {
                return;
              }
            }
          } else if (repoChoice === "new") {
            repoNewName =
              process.env.REPO_NAME ||
              (await inquirer
                .prompt({
                  type: "input",
                  name: "repoNewName",
                  message: "Enter the repository name:",
                })
                .then(({ repoNewName }) => repoNewName));
            repoFullName = await createGithubRepo(githubToken, repoNewName);
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
            throw new Error(
              "package.json or package-lock.json not found. Exiting."
            );
          }

          // Commit changes to the repository
          let commitFiles;
          if (environmentFilePath) {
            commitFiles = [
              outputYamlFilePath,
              collectionFilePath,
              environmentFilePath,
              path.join(projectDir, "package.json"),
              path.join(projectDir, "package-lock.json"),
            ];
          } else {
            commitFiles = [
              outputYamlFilePath,
              collectionFilePath,
              path.join(projectDir, "package.json"),
              path.join(projectDir, "package-lock.json"),
            ];
          }
          const commitMessage = "Create Pipeline Config";
          await makeCommit(
            githubToken,
            repoFullName,
            commitFiles,
            commitMessage
          );

          // Wait to ensure that the workflow file is processed by GitHub
          await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds

          // Verify GitHub Actions workflow
          const workflowCreated = await verifyGithubActionsWorkflow(
            repoFullName
          );
          if (workflowCreated) {
            console.log("GitHub Actions workflow was successfully created.");
          } else {
            console.log("Failed to create GitHub Actions workflow.");
          }
          promptStep = null;
          break;
      }
    }
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}

// Run the main function
main().catch((error) => console.error(error));
