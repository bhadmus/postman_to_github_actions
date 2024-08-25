# PostmanxGithub Action Automatic Sync

This script automates the process of setting up GitHub Actions workflows for Postman collections. It supports both GitHub repository integration and local workflow setup, allowing for flexible usage in various scenarios.

## Features

- Export Postman collections using a UID or from a local file
- Add Postman collections to GitHub repositories (new or existing)
- Create or update GitHub Actions workflows
- Set up workflows locally without GitHub interaction
- Use custom YAML templates for GitHub Actions workflows
- Support for both new and existing repositories

## Prerequisites

- Python 3.x
- GitHub personal access token (for GitHub repository operations)
- Postman API key (if exporting collection by UID)
- `requests` Python package

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/BlazinArtemis/project-work.git
   cd project-work
   ```

2. Install the required Python package:
   ```bash
   pip install requests
   ```

## Usage

The script can be used in several ways:

1. **Standard GitHub Repository Setup**:
   ```bash
   python main.py
   ```
   This guides you through setting up a GitHub Actions workflow for a Postman collection in a GitHub repository (new or existing).

2. **Local Workflow Setup**:
   ```bash
   python main.py --local
   ```
   This sets up the workflow files locally without interacting with GitHub.

3. **GitHub Repository Setup with Custom Template**:
   ```bash
   python main.py --template path/to/template.yml
   ```
   This sets up a GitHub Actions workflow using a custom YAML template.

4. **Local Workflow Setup with Custom Template**:
   ```bash
   python main.py --local --template path/to/template.yml
   ```
   This creates a local workflow setup using a custom YAML template.

For each option, you can choose between:
- Using a Postman collection from a UID (requires Postman API key)
- Using a Postman collection from a local JSON file

For GitHub repository options, you can choose between:
- Using an existing GitHub repository
- Creating a new GitHub repository

## Detailed Usage Instructions

### GitHub Token

The script checks for the GitHub token in the environment variable `GITHUB_TOKEN`. If not found, it prompts you to enter it and saves it to your environment.

To set the token manually:
```bash
export GITHUB_TOKEN=your_github_token_here
```

### Postman API Key

For UID-based collection export, the script checks for the Postman API key in the environment variable `POSTMAN_API_KEY`. If not found, it prompts you to enter it.

To set the key manually:
```bash
export POSTMAN_API_KEY=your_postman_api_key_here
```

### Workflow Process

1. Choose between UID or file-based Postman collection.
2. For GitHub repository setup:
   - Choose between existing or new repository.
   - For existing repos, enter the full repository name (e.g., "username/repo").
   - For new repos, enter the desired repository name.
3. The script will generate or modify the GitHub Actions workflow YAML file.
4. For GitHub setups, changes are committed and pushed to the repository.
5. For local setups, files are created in the current directory.

## Examples

1. **Setting up a workflow in a GitHub repository**:
   ```bash
   python main.py
   ```
   Follow the prompts to choose between UID/file, existing/new repo, etc.

2. **Setting up a local workflow**:
   ```bash
   python main.py --local
   ```
   This will create the necessary files in your current directory.

3. **Using a custom template for GitHub setup**:
   ```bash
   python main.py --template my_template.yml
   ```
   This will use your custom template for the GitHub Actions workflow.

4. **Local setup with a custom template**:
   ```bash
   python main.py --local --template my_template.yml
   ```
   This creates a local setup using your custom template.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your features or fixes.

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or contributions, please open an issue in the GitHub repository.