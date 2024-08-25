import os
import requests
import json
import base64
import yaml

def generate_github_actions_yaml(collection_path, output_path):
    """
    Generate a GitHub Actions YAML file for running Postman collections.

    Args:
    collection_path (str): Path to the Postman collection JSON file
    output_path (str): Path where the YAML file should be saved

    Returns:
    None
    """
    yml_content = f"""
name: Run Postman Collection

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  run-postman-collection:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout repository
      uses: actions/checkout@v3

    - name: Install Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'

    - name: Install Newman
      run: npm install -g newman

    - name: Run Postman collection
      run: |
        newman run collection.json \
          --reporters cli,junit \
          --reporter-junit-export ./newman/results.xml

    - name: Upload Test Results
      uses: actions/upload-artifact@v3
      with:
        name: postman-test-results
        path: ./newman/results.xml
    """
    with open(output_path, 'w') as file:
        file.write(yml_content)
    print(f"GitHub Actions YAML file has been generated at {output_path}")

def make_commit(token, repo_full_name, file_paths, commit_message):
    """
    Make a commit to a GitHub repository using the GitHub API.

    Args:
    token (str): GitHub authentication token
    repo_full_name (str): Full name of the repository (e.g., "username/repo")
    file_paths (list): List of file paths to be committed
    commit_message (str): Commit message

    Returns:
    None
    """
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }

    # Step 1: Get the default branch
    repo_url = f"https://api.github.com/repos/{repo_full_name}"
    repo_response = requests.get(repo_url, headers=headers)
    if repo_response.status_code != 200:
        print(f"Failed to get the repository details: {repo_response.json()}")
        return

    default_branch = repo_response.json()["default_branch"]

    # Step 2: Get the SHA of the base tree
    url = f"https://api.github.com/repos/{repo_full_name}/git/refs/heads/{default_branch}"
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Failed to get the reference: {response.json()}")
        return

    base_tree_sha = response.json()["object"]["sha"]

    blobs = []
    for file_path in file_paths:
        # Step 3: Create a new blob (file content)
        with open(file_path, 'r') as file:
            content = file.read()
        url = f"https://api.github.com/repos/{repo_full_name}/git/blobs"
        payload = {
            "content": content,
            "encoding": "utf-8"
        }
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code != 201:
            print(f"Failed to create blob for {file_path}: {response.json()}")
            return

        blobs.append({
            "path": file_path,
            "mode": "100644",
            "type": "blob",
            "sha": response.json()["sha"]
        })

    # Step 4: Create a new tree
    url = f"https://api.github.com/repos/{repo_full_name}/git/trees"
    payload = {
        "base_tree": base_tree_sha,
        "tree": blobs
    }
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code != 201:
        print(f"Failed to create tree: {response.json()}")
        return

    new_tree_sha = response.json()["sha"]

    # Step 5: Create a new commit
    url = f"https://api.github.com/repos/{repo_full_name}/git/commits"
    payload = {
        "message": commit_message,
        "tree": new_tree_sha,
        "parents": [base_tree_sha]
    }
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code != 201:
        print(f"Failed to create commit: {response.json()}")
        return

    new_commit_sha = response.json()["sha"]

    # Step 6: Update the reference to point to the new commit
    url = f"https://api.github.com/repos/{repo_full_name}/git/refs/heads/{default_branch}"
    payload = {
        "sha": new_commit_sha
    }
    response = requests.patch(url, headers=headers, json=payload)
    if response.status_code == 200:
        print("Commit created successfully.")
    else:
        print(f"Failed to update the reference: {response.json()}")

def export_postman_collection(api_key, collection_id, output_path):
    """
    Export a Postman collection using the Postman API.

    Args:
    api_key (str): Postman API key
    collection_id (str): ID of the Postman collection
    output_path (str): Path where the collection JSON should be saved

    Returns:
    None
    """
    url = f"https://api.getpostman.com/collections/{collection_id}"
    headers = {
        "X-Api-Key": api_key
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        with open(output_path, 'w') as file:
            json.dump(response.json(), file, indent=4)
        print(f"Postman collection exported successfully to {output_path}")
    else:
        print(f"Failed to export Postman collection: {response.json()}")

def create_github_repo(token, repo_name, description="", private=False):
    """
    Create a new GitHub repository.

    Args:
    token (str): GitHub authentication token
    repo_name (str): Name for the new repository
    description (str, optional): Description for the new repository
    private (bool, optional): Whether the repository should be private

    Returns:
    str: Full name of the created repository, or None if creation failed
    """
    url = "https://api.github.com/user/repos"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    payload = {
        "name": repo_name,
        "description": description,
        "private": private
    }
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 201:
        print(f"Repository '{repo_name}' created successfully.")
        return response.json()["full_name"]
    else:
        print(f"Failed to create repository: {response.json()}")
        return None
def verify_github_actions_workflow(repo_full_name):
    """
    Verify if a GitHub Actions workflow exists and is active in the repository.

    Args:
    repo_full_name (str): Full name of the repository (e.g., "username/repo")

    Returns:
    bool: True if an active workflow is found, False otherwise
    """
    url = f"https://api.github.com/repos/{repo_full_name}/actions/workflows"
    response = requests.get(url)
    if response.status_code == 200:
        workflows = response.json().get('workflows', [])
        for workflow in workflows:
            if workflow['path'].startswith('.github/workflows/') and workflow['state'] == 'active':
                print(f"GitHub Actions workflow '{workflow['name']}' found and is active.")
                return True
        print("No active GitHub Actions workflows found.")
    else:
        print(f"Failed to fetch workflows: {response.json()}")
    return False

def initialize_repo_with_readme(token, repo_full_name):
    """
    Initialize a repository with a README.md file.

    Args:
    token (str): GitHub authentication token
    repo_full_name (str): Full name of the repository (e.g., "username/repo")

    Returns:
    bool: True if initialization was successful, False otherwise
    """
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }

    content = "# Initial Commit\n\nThis is the initial commit with a README file."
    url = f"https://api.github.com/repos/{repo_full_name}/contents/README.md"
    payload = {
        "message": "Initial commit with README",
        "content": base64.b64encode(content.encode()).decode()
    }
    response = requests.put(url, headers=headers, json=payload)
    if response.status_code == 201:
        print("Repository initialized with a README file.")
        return True
    else:
        print(f"Failed to initialize the repository: {response.json()}")
        return False

def readme_exists(token, repo_full_name):
    """
    Check if a README.md file exists in the repository.

    Args:
    token (str): GitHub authentication token
    repo_full_name (str): Full name of the repository (e.g., "username/repo")

    Returns:
    bool: True if README.md exists, False otherwise
    """
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    url = f"https://api.github.com/repos/{repo_full_name}/contents/README.md"
    response = requests.get(url, headers=headers)
    return response.status_code == 200

def add_newman_step_to_yaml(yaml_content, collection_path):
    """
    Add a separate Postman test job to an existing YAML content for GitHub Actions workflow.

    Args:
    yaml_content (str): Existing YAML content
    collection_path (str): Path to the Postman collection JSON file

    Returns:
    str: Modified YAML content with Postman test job added
    """
    collection_path= "collection.json"
    # Postman test job to be added
    postman_job = f"""
  postman-tests:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout repository
      uses: actions/checkout@v3

    - name: Install Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'

    - name: Install Newman
      run: npm install -g newman

    - name: Run Postman collection
      run: |
        newman run collection.json \\
          --reporters cli,junit \\
          --reporter-junit-export ./newman/results.xml

    - name: Upload Test Results
      uses: actions/upload-artifact@v3
      with:
        name: postman-test-results
        path: ./newman/results.xml
"""

    # Find the position to insert the Postman test job
    jobs_index = yaml_content.find("jobs:")
    if jobs_index == -1:
        # If 'jobs:' is not found, add it along with the Postman test job
        return yaml_content + "\njobs:\n" + postman_job
    else:
        # Find the end of the jobs section
        next_top_level = yaml_content.find("\n", jobs_index + 1)
        while next_top_level != -1:
            if yaml_content[next_top_level + 1] != ' ' and yaml_content[next_top_level + 1] != '\n':
                break
            next_top_level = yaml_content.find("\n", next_top_level + 1)
        
        if next_top_level == -1:
            # If we're at the end of the file, just append the new job
            return yaml_content + "\n" + postman_job
        else:
            # Insert the new job at the end of the jobs section
            return yaml_content[:next_top_level] + "\n" + postman_job + yaml_content[next_top_level:]
