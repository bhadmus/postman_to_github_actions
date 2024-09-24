#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

/**
* Create a package.json file with specified dependencies and install them.
* @param {string} dirPath - Directory where the package.json will be created.
* @param {Object} dependencies - Dependencies to include in package.json.
*/
export function createAndInstallPackageJson(dirPath, dependencies) {
   const packageJsonPath = path.join(dirPath, 'package.json');

   // Create package.json content
   const packageJsonContent = {
       name: "postman-collection-runner",
       version: "1.0.0",
       description: "A Node.js project for running Postman collections using Newman",
       main: "index.js",
       scripts: {
           test: `npx newman run ${dependencies.collectionFilePath}`
       },
       dependencies: {
           "newman": "6.1.3",
           "newman-reporter-htmlextra": "1.23.1"
       }
   };

   // Write package.json to the specified directory
   fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonContent, null, 2), 'utf8');
   console.log('package.json created successfully.');

   // Install the dependencies
   execSync('npm install', { cwd: dirPath, stdio: 'inherit' });

   console.log('Dependencies installed successfully.');
}

/**
 * Generate a GitHub Actions YAML file for running Postman tests.
 * @param {string} collectionFilePath - Path to the Postman collection JSON file.
 * @param {string} outputYamlFilePath - Path where the YAML file should be saved.
 */
export function generateGithubActionsYaml(collectionFilePath, environmentFilePath, outputYamlFilePath) {
    const outputDir = path.dirname(outputYamlFilePath);
    fs.ensureDirSync(outputDir);
    let yamlFileContent;
    if(!environmentFilePath){
    yamlFileContent = `
    
name: Run Postman Collection

on: [push]

jobs:
    run-postman-collection:
        runs-on: ubuntu-latest

        steps:
        - name: Checkout repository
          uses: actions/checkout@v4

        - name: List Content
          run: |
            echo "Check Collection"
            ls -la  
            echo "install dependencies"
            npm i -g newman newman-reporter-htmlextra
            echo "check dependencies version"
            newman --version
            newman-reporter-htmlextra --version

        - name: Run Postman collection
          run: |
            echo "run test"
            newman run ${collectionFilePath} --reporters cli,junit --reporter-junit-export ./newman/results.xml

        - name: Upload Test Results
          uses: actions/upload-artifact@v3
          with:
            name: postman-test-results
            path: ./newman/results.xml
`;

    }else{
        yamlFileContent = `

name: Run Postman Collection

on: [push]

jobs:
    run-postman-collection:
        runs-on: ubuntu-latest

        steps:
        - name: Checkout repository
          uses: actions/checkout@v4

        - name: List Content
          run: |
            echo "Check Collection"
            ls -la  
            echo "install dependencies"
            npm i -g newman newman-reporter-htmlextra
            echo "check dependencies version"
            newman --version
            newman-reporter-htmlextra --version

        - name: Run Postman collection
          run: |
            echo "run test"
            newman run ${collectionFilePath} -e ${environmentFilePath} --reporters cli,junit --reporter-junit-export ./newman/results.xml

        - name: Upload Test Results
          uses: actions/upload-artifact@v3
          with:
            name: postman-test-results
            path: ./newman/results.xml
`;
    }

    console.log(`Generating GitHub Actions YAML file at ${outputYamlFilePath} successfully`);
    fs.writeFileSync(outputYamlFilePath, yamlFileContent, 'utf8');
    console.log('YAML file generated successfully.');
}

/**
 * Commit multiple files to a GitHub repository in a single commit.
 * @param {string} token - GitHub personal access token.
 * @param {string} repoFullName - Full repository name (e.g., username/repo).
 * @param {Array<string>} files - List of file paths to commit.
 * @param {string} message - Commit message.
 */
export async function makeCommit(token, repoFullName, files, message) {
    try {
        const headers = {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json' 
        };

        const baseUrl = `https://api.github.com/repos/${repoFullName}/contents/`;
        const branch = "main";
        const fileBlobs = [];

        for (const file of files) {
            const content = fs.readFileSync(file, 'base64');
            const repoFilePath = path.relative(process.cwd(), file).replace(/\\/g, '/'); 
            fileBlobs.push({
                path: repoFilePath,
                content
            });
        }

        
        const refResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/ref/heads/${branch}`, { headers });
        const refData = await refResponse.json();
        if (!refResponse.ok) {
            throw new Error(`Failed to fetch reference: ${refData.message}`);
        }
        const latestCommitSha = refData.object.sha;

      
        const commitResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/commits/${latestCommitSha}`, { headers });
        const commitData = await commitResponse.json();
        if (!commitResponse.ok) {
            throw new Error(`Failed to fetch commit: ${commitData.message}`);
        }
        const treeSha = commitData.tree.sha;

        // Create a new tree with the updated files
        const treeResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                base_tree: treeSha,
                tree: fileBlobs.map(file => ({
                    path: file.path,
                    mode: '100644',
                    type: 'blob',
                    content: Buffer.from(file.content, 'base64').toString('utf8')
                }))
            })
        });
        const treeData = await treeResponse.json();
        if (!treeResponse.ok) {
            throw new Error(`Failed to create tree: ${treeData.message}`);
        }

        // Create a new commit
        const newCommitResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/commits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message,
                tree: treeData.sha,
                parents: [latestCommitSha]
            })
        });
        const newCommitData = await newCommitResponse.json();
        if (!newCommitResponse.ok) {
            throw new Error(`Failed to create commit: ${newCommitData.message}`);
        }

        // Update the branch to point to the new commit
        const updateResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/refs/heads/${branch}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                sha: newCommitData.sha
            })
        });
        const updateData = await updateResponse.json();
        if (!updateResponse.ok) {
            throw new Error(`Failed to update branch: ${updateData.message}`);
        }

        console.log(`Commit successfully created: ${newCommitData.sha}`);
    } catch (error) {
        console.error('An error occurred while committing files:', error.message);
        throw error;
    }
}


/**
 * Export a Postman collection to a file.
 * @param {string} apiKey - Postman API key.
 * @param {string} collectionId - Postman collection ID.
 * @param {string} outputFilePath - Path where the JSON file should be saved.
 */
export async function exportPostmanCollection(apiKey, collectionId, outputFilePath) {
    try {
        console.log(`Exporting Postman collection ${collectionId} to ${outputFilePath}`);
        const response = await fetch(`https://api.getpostman.com/collections/${collectionId}`, {
            headers: {
                'X-Api-Key': apiKey,
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Failed to export Postman collection: ${data.error}`);
        }
        fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2), 'utf8');
        console.log('Postman collection exported successfully.');
    } catch (error) {
        console.error('An error occurred while exporting the Postman collection:', error.message);
        throw error;
    }
}
/**
 * Export a Postman collection to a file.
 * @param {string} apiKey - Postman API key.
 * @param {string} environmentId - Postman environment ID.
 * @param {string} outputFilePath - Path where the JSON file should be saved.
 */
export async function exportPostmanEnvironment(apiKey, environmentId, outputFilePath) {
    try {
        console.log(`Exporting Postman collection ${environmentId} to ${outputFilePath}`);
        const response = await fetch(`https://api.getpostman.com/environments/${environmentId}`, {
            headers: {
                'X-Api-Key': apiKey,
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Failed to export Postman environment: ${data.error}`);
        }
        fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2), 'utf8');
        console.log('Postman environment exported successfully.');
    } catch (error) {
        console.error('An error occurred while exporting the Postman environment:', error.message);
        throw error;
    }
}

/**
 * Create a new GitHub repository.
 * @param {string} token - GitHub personal access token.
 * @param {string} repoName - Name of the repository to create.
 * @returns {string} - Full name of the created repository (e.g., username/repo).
 */
export async function createGithubRepo(token, repoName) {
    try {
        console.log(`Creating GitHub repository ${repoName}`);
        const response = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: repoName,
                private: false
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Failed to create GitHub repository: ${data.message}`);
        }
        console.log('GitHub repository created successfully:', data.full_name);
        return data.full_name;
    } catch (error) {
        console.error('An error occurred while creating the GitHub repository:', error.message);
        throw error;
    }
}

/**
 * Verify if a GitHub Actions workflow is created.
 * @param {string} repoFullName - Full repository name (e.g., username/repo).
 * @returns {boolean} - True if workflow exists, false otherwise.
 */
export async function verifyGithubActionsWorkflow(repoFullName, branch = 'main', retries = 3) {
    try {
        console.log(`Verifying GitHub Actions workflow for repository ${repoFullName}`);
        const apiUrl = `https://api.github.com/repos/${repoFullName}/actions/workflows`;
        for (let attempt = 1; attempt <= retries; attempt++) {
            const response = await fetch(apiUrl);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(`Failed to verify GitHub Actions workflow: ${data.message}`);
            }
            console.log(`Attempt ${attempt}: GitHub Actions workflow verification - ${data.total_count > 0 ? 'exists' : 'does not exist'}`);
            if (data.total_count > 0) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds between retries
        }
        return false;
    } catch (error) {
        console.error('An error occurred while verifying the GitHub Actions workflow:', error.message);
        throw error;
    }
}

/**
 * Initialize a repository with a README file.
 * @param {string} token - GitHub personal access token.
 * @param {string} repoFullName - Full repository name (e.g., username/repo).
 * @returns {boolean} - True if initialization is successful, false otherwise.
 */
export async function initializeRepoWithReadme(token, repoFullName) {
    try {
        console.log(`Initializing repository ${repoFullName} with a README file`);
        const apiUrl = `https://api.github.com/repos/${repoFullName}/contents/README.md`;
        const body = JSON.stringify({
            message: 'Initial commit',
            content: Buffer.from('# ' + repoFullName.split('/').pop()).toString('base64')
        });
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(`Failed to initialize repository: ${data.message}`);
        }
        console.log('Repository initialized with README successfully.');
        return true;
    } catch (error) {
        console.error('An error occurred while initializing the repository with README:', error.message);
        throw error;
    }
}

/**
 * Check if README.md exists in the repository.
 * @param {string} token - GitHub personal access token.
 * @param {string} repoFullName - Full repository name (e.g., username/repo).
 * @returns {boolean} - True if README.md exists, false otherwise.
 */
export async function readmeExists(token, repoFullName) {
    try {
        console.log(`Checking if README.md exists in repository ${repoFullName}`);
        const apiUrl = `https://api.github.com/repos/${repoFullName}/contents/README.md`;
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        console.log(`README.md ${response.status === 200 ? 'exists' : 'does not exist'}`);
        return response.status === 200;
    } catch (error) {
        console.error('An error occurred while checking if README.md exists:', error.message);
        throw error;
    }
}
