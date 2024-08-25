# Contributing to PostmanxGithub Action Automatic Sync

Thank you for your interest in contributing to this project! This document provides detailed information about the code structure and functionality to help you get started.

## Code Structure

The project consists of two main Python files:

1. `main.py`: The entry point of the application, handling user input and orchestrating the workflow.
2. `helper_functions.py`: Contains utility functions used by the main script.

### main.py

This file contains the core logic of the application. Here's a breakdown of its main components:

#### Functions:

1. `clone_repository(repo_full_name, github_token)`:
   - Clones a GitHub repository to a temporary directory.
   - Sets up git configuration for the cloned repo.

2. `remove_git_credentials()`:
   - Removes the temporary git credentials file.

3. `cleanup_repo(repo_path)`:
   - Removes the cloned repository directory.

4. `setup_local_workflow(args)`:
   - Handles the local workflow setup without GitHub interaction.

5. `main()`:
   - The main function that orchestrates the entire process.

#### Workflow:

1. Parses command-line arguments.
2. Checks for GitHub token and Postman API key.
3. Handles Postman collection (from UID or file).
4. Manages repository operations (cloning or creating).
5. Generates or modifies GitHub Actions YAML file.
6. Commits and pushes changes (for GitHub setups).

### helper_functions.py

This file contains utility functions used by `main.py`. Key functions include:

1. `generate_github_actions_yaml(collection_path, output_path)`:
   - Generates a default GitHub Actions YAML file.

2. `make_commit(token, repo_full_name, file_paths, commit_message)`:
   - Creates a commit in a GitHub repository using the GitHub API.

3. `export_postman_collection(api_key, collection_id, output_path)`:
   - Exports a Postman collection using the Postman API.

4. `create_github_repo(token, repo_name, description="", private=False)`:
   - Creates a new GitHub repository.

5. `verify_github_actions_workflow(repo_full_name)`:
   - Verifies if a GitHub Actions workflow exists and is active.

6. `initialize_repo_with_readme(token, repo_full_name)`:
   - Initializes a repository with a README.md file.

7. `add_newman_step_to_yaml(yaml_content, collection_path)`:
   - Adds a Newman step to an existing YAML content for GitHub Actions workflow.

## Key Concepts

1. **GitHub Interaction**: The script uses the GitHub API for operations like creating repositories, making commits, and verifying workflows. It uses a personal access token for authentication.

2. **Postman Integration**: The script can export Postman collections using the Postman API or use locally stored collection files.

3. **Local vs. GitHub Workflow**: The script can set up workflows locally or in GitHub repositories, controlled by the `--local` flag.

4. **Custom Templates**: Users can provide custom YAML templates for the GitHub Actions workflow, which the script will modify to include the necessary Newman steps.

5. **Error Handling**: The script includes error handling for various scenarios, such as missing files, API errors, and invalid user inputs.

6. **Cleanup**: Temporary files and cloned repositories are cleaned up after the script execution.

## Local Workflow Implementation

The local workflow option is a key feature that allows users to set up GitHub Actions workflows without interacting with a GitHub repository. This feature is implemented primarily in the `setup_local_workflow(args)` function in `main.py`.

### Local Workflow Function

```python
def setup_local_workflow(args):
    # Function implementation
```

This function is called when the `--local` flag is used. It performs the following steps:

1. **Postman Collection Handling**:
   - Prompts the user to choose between UID or file-based Postman collection.
   - For UID-based collections, it uses the `export_postman_collection()` function to fetch the collection from Postman.
   - For file-based collections, it copies the specified file to the current working directory.

2. **Directory Structure Creation**:
   - Creates a `.github/workflows` directory in the current working directory if it doesn't exist.

3. **YAML File Generation**:
   - If a custom template is provided (via `--template`), it reads the template and modifies it using `add_newman_step_to_yaml()`.
   - If no template is provided, it generates a default YAML file using `generate_github_actions_yaml()`.

4. **File Writing**:
   - Writes the generated or modified YAML content to `.github/workflows/postman-tests.yml`.

### Key Differences from GitHub Workflow

1. **No GitHub Interaction**: The local workflow doesn't require a GitHub token or any API calls to GitHub.
2. **File System Operations**: All operations are performed on the local file system instead of a remote repository.
3. **No Commit or Push**: Changes are simply written to local files without any version control operations.

### Integration in Main Function

The `main()` function in `main.py` checks for the `--local` flag early in its execution:

```python
if args.local:
    setup_local_workflow(args)
    return
```

If the flag is present, it calls `setup_local_workflow(args)` and then exits, bypassing all GitHub-related operations.

### Considerations for Contributors

When working with or extending the local workflow feature:

1. **File Paths**: Ensure all file operations use relative paths based on the current working directory.
2. **Error Handling**: Implement robust error handling for file system operations.
3. **User Feedback**: Provide clear console output to inform the user about the actions being performed locally.
4. **Consistency**: Maintain consistency in the structure of generated files between local and GitHub workflows.

## Testing Local Workflows

When testing the local workflow feature:

1. Run the script with the `--local` flag: `python main.py --local`
2. Verify that the correct directory structure is created in the current working directory.
3. Check that the Postman collection is correctly copied or exported to the local directory.
4. Ensure the generated YAML file in `.github/workflows/` contains the correct Newman steps.
5. Test with both UID and file-based Postman collections.
6. If implementing new features, ensure they work correctly in both local and GitHub workflows.

## Adding New Features

When adding new features, consider the following:

1. **User Experience**: Maintain the current flow of user prompts and provide clear instructions.
2. **Error Handling**: Implement robust error handling for new functionality.
3. **Modularity**: Add new utility functions to `helper_functions.py` if they can be reused.
4. **Testing**: Ensure new features work with both local and GitHub setups, and with/without custom templates.
5. **Documentation**: Update both README.md and CONTRIBUTING.md to reflect new features or changes.

## Testing

Currently, the project does not have automated tests. When contributing:

1. Manually test your changes with various input combinations.
2. Ensure compatibility with both local and GitHub setups.
3. Test with and without custom templates.
4. Verify error handling by intentionally providing invalid inputs.

## Style Guide

- Follow PEP 8 guidelines for Python code style.
- Use meaningful variable and function names.
- Add comments for complex logic or non-obvious code sections.
- Keep functions focused on a single responsibility.

## Submitting Changes

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with clear, concise commit messages.
4. Push your changes to your fork.
5. Submit a pull request with a clear description of your changes.

Thank you for contributing to this project!