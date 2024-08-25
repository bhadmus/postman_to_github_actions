import os
import time
import subprocess
import argparse
import shutil
from helper_functions import generate_github_actions_yaml, make_commit, export_postman_collection, create_github_repo, verify_github_actions_workflow, initialize_repo_with_readme, readme_exists, add_newman_step_to_yaml

def clone_repository(repo_full_name, github_token):
    """
    Clone a GitHub repository using the provided token for authentication.
    
    Args:
    repo_full_name (str): The full name of the repository (e.g., "username/repo")
    github_token (str): The GitHub authentication token
    
    Returns:
    str: Path to the cloned repository, or None if cloning failed
    """
    # Create a temporary directory for cloning
    temp_dir = os.path.join(os.path.expanduser('~'), 'temp_repo')
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir)
    os.chdir(temp_dir)
    
    # Extract the repo name from the full name
    repo_name = repo_full_name.split('/')[-1]
    
    # Clone the repository using the token for authentication
    clone_command = f"git clone https://{github_token}@github.com/{repo_full_name}.git"
    try:
        subprocess.run(clone_command, check=True, shell=True)
        print(f"Repository cloned successfully.")
        
        # Change into the cloned repository directory
        repo_path = os.path.join(temp_dir, repo_name)
        os.chdir(repo_path)
        
        # Configure git to use the token for future pushes
        subprocess.run(f"git config user.name \"GitHub Actions\"", check=True, shell=True)
        subprocess.run(f"git config user.email \"actions@github.com\"", check=True, shell=True)
        subprocess.run(f"git config credential.helper store", check=True, shell=True)
        
        # Store the token temporarily
        git_credentials_path = os.path.expanduser('~/.git-credentials')
        with open(git_credentials_path, 'w') as f:
            f.write(f"https://{github_token}:x-oauth-basic@github.com\n")
        
        return repo_path
    except subprocess.CalledProcessError as e:
        print(f"Failed to clone the repository: {e}")
        return None

def remove_git_credentials():
    """
    Remove the .git-credentials file to ensure the token is not stored permanently.
    """
    git_credentials_path = os.path.expanduser('~/.git-credentials')
    if os.path.exists(git_credentials_path):
        os.remove(git_credentials_path)
        print("Removed git credentials file.")

def cleanup_repo(repo_path):
    """
    Remove the cloned repository directory.
    
    Args:
    repo_path (str): Path to the cloned repository
    """
    if os.path.exists(repo_path):
        shutil.rmtree(repo_path)
        print(f"Removed cloned repository at {repo_path}")

def setup_local_workflow(args):
    """
    Set up a local GitHub Actions workflow for Postman collections.
    
    Args:
    args (Namespace): Command line arguments
    """
    
    if args.template:
        # Use the provided template and add Newman step
        if not os.path.exists(args.template):
            print(f"Error: Template file not found at {args.template}")
            return

    # Ask if the Postman collection is from UID or file
    collection_source = input("Is the Postman collection from UID (1) or file (2)? ")
    if collection_source == '1':
        # Handle Postman collection from UID
        postman_api_key = os.getenv('POSTMAN_API_KEY')
        if not postman_api_key:
            postman_api_key = input("Enter your Postman API key: ")
            os.environ['POSTMAN_API_KEY'] = postman_api_key
        collection_id = input("Enter the Postman collection ID: ")
        collection_file_path = os.path.join(os.getcwd(), 'collection.json')
        export_postman_collection(postman_api_key, collection_id, collection_file_path)
    elif collection_source == '2':
        # Handle Postman collection from file
        source_file_path = input("Enter the full path to the Postman collection JSON file: ")
        if not os.path.exists(source_file_path):
            print(f"Error: Postman collection file not found at {source_file_path}")
            return
        collection_file_path = os.path.join(os.getcwd(), 'collection.json')
        shutil.copy2(source_file_path, collection_file_path)
        print(f"Copied Postman collection to {collection_file_path}")
    else:
        print("Invalid option. Exiting.")
        return

    # Create .github/workflows directory if it doesn't exist
    workflows_dir = os.path.join(os.getcwd(), '.github', 'workflows')
    os.makedirs(workflows_dir, exist_ok=True)

    # Generate or modify GitHub Actions YAML file
    output_yaml_file_path = os.path.join(workflows_dir, 'postman-tests.yml')

    if args.template:
        # Use the provided template and add Newman step
        if not os.path.exists(args.template):
            print(f"Error: Template file not found at {args.template}")
            return
        try:
            with open(args.template, 'r') as template_file:
                yaml_content = template_file.read()
            modified_yaml = add_newman_step_to_yaml(yaml_content, 'collection.json')
            with open(output_yaml_file_path, 'w') as output_file:
                output_file.write(modified_yaml)
            print(f"Modified template YAML file has been generated at {output_yaml_file_path}")
        except Exception as e:
            print(f"Error processing template file: {e}")
            return
    else:
        # Generate default YAML file
        generate_github_actions_yaml('collection.json', output_yaml_file_path)

    print(f"Local GitHub Actions workflow has been set up in {os.getcwd()}")

def main():
    """
    Main function to orchestrate the process of setting up GitHub Actions for Postman collections.
    """
    # Set up argument parser
    parser = argparse.ArgumentParser(description="Set up GitHub Actions for Postman collections")
    parser.add_argument("--template", help="Full path to a custom YAML template file")
    parser.add_argument("--local", action="store_true", help="Set up workflow locally without GitHub interaction")
    args = parser.parse_args()

    if args.local:
        setup_local_workflow(args)
        return

    # Check for GitHub token
    github_token = os.getenv('GITHUB_TOKEN')
    if not github_token:
        github_token = input("Enter your GitHub token: ")
        os.environ['GITHUB_TOKEN'] = github_token
        with open(os.path.expanduser('~/.bashrc'), 'a') as bashrc:
            bashrc.write(f'\nexport GITHUB_TOKEN={github_token}\n')

    # Ask if the Postman collection is from UID or file
    collection_source = input("Is the Postman collection from UID (1) or file (2)? ")
    if collection_source == '1':
        # Handle Postman collection from UID
        postman_api_key = os.getenv('POSTMAN_API_KEY')
        if not postman_api_key:
            postman_api_key = input("Enter your Postman API key: ")
            os.environ['POSTMAN_API_KEY'] = postman_api_key
            with open(os.path.expanduser('~/.bashrc'), 'a') as bashrc:
                bashrc.write(f'\nexport POSTMAN_API_KEY={postman_api_key}\n')
        collection_id = input("Enter the Postman collection ID: ")
        temp_collection_path = os.path.join(os.getcwd(), 'temp_collection.json')
        export_postman_collection(postman_api_key, collection_id, temp_collection_path)
    elif collection_source == '2':
        # Handle Postman collection from file
        temp_collection_path = input("Enter the full path to the Postman collection JSON file: ")
        if not os.path.exists(temp_collection_path):
            print(f"Error: Postman collection file not found at {temp_collection_path}")
            return
    else:
        print("Invalid option. Exiting.")
        return

    repo_path = None
    temp_repo_collection = None
    try:
        # Ask if it is a new or existing GitHub repo
        repo_choice = input("Is it an existing (1) or new (2) GitHub repo? ")
        if repo_choice == '1':
            # Handle existing repository
            repo_full_name = input("Enter the full repository name (e.g., username/repo): ")
            
            # Clone the repository
            repo_path = clone_repository(repo_full_name, github_token)
            if not repo_path:
                print("Failed to clone the repository. Exiting.")
                return
            
            # Copy the collection file to the cloned repo directory, overwriting if it exists
            repo_collection_path = os.path.join(repo_path, 'collection.json')
            shutil.copy2(temp_collection_path, repo_collection_path)
            print(f"Copied (and potentially overwrote) collection.json in the repository.")
            
            # Check if README.md exists in the repository
            if not os.path.exists(os.path.join(repo_path, 'README.md')):
                # Initialize the repository if README.md does not exist
                if not initialize_repo_with_readme(github_token, repo_full_name):
                    return
        elif repo_choice == '2':
            # Handle new repository
            repo_name = input("Enter the repository name: ")
            repo_full_name = create_github_repo(github_token, repo_name)
            if not repo_full_name:
                print("Failed to create the repository. Exiting.")
                return
            # Initialize the new repository with a README
            if not initialize_repo_with_readme(github_token, repo_full_name):
                return
            repo_path = None  # Ensure repo_path is None for new repos
            repo_collection_path = 'collection.json'  # For new repos, we'll commit this file directly
            
            # Copy the collection file to a temporary location for committing
            temp_repo_collection = os.path.join(os.getcwd(), repo_collection_path)
            shutil.copy2(temp_collection_path, temp_repo_collection)
            print(f"Prepared collection.json for the new repository.")
        else:
            print("Invalid option. Exiting.")
            return

        # Generate or modify GitHub Actions YAML file
        output_yaml_file_path = '.github/workflows/postman-tests.yml'
        os.makedirs(os.path.dirname(output_yaml_file_path), exist_ok=True)

        if args.template:
            # Use the provided template and add Newman step
            if not os.path.exists(args.template):
                print(f"Error: Template file not found at {args.template}")
                return
            try:
                with open(args.template, 'r') as template_file:
                    yaml_content = template_file.read()
                modified_yaml = add_newman_step_to_yaml(yaml_content, 'collection.json')
                with open(output_yaml_file_path, 'w') as output_file:
                    output_file.write(modified_yaml)
                print(f"Modified template YAML file has been generated at {output_yaml_file_path}")
            except Exception as e:
                print(f"Error processing template file: {e}")
                return
        else:
            # Generate default YAML file
            generate_github_actions_yaml('collection.json', output_yaml_file_path)

        # Add both the .github/workflows/postman-tests.yml and collection.json to the commit
        commit_files = [output_yaml_file_path, repo_collection_path]
        commit_message = "Add or update GitHub Actions workflow and Postman collection"
        
        # For existing repos, we need to stage and commit the changes locally
        if repo_choice == '1':
            os.chdir(repo_path)
            subprocess.run("git add .", check=True, shell=True)
            subprocess.run(f"git commit -m \"{commit_message}\"", check=True, shell=True)
            subprocess.run("git push", check=True, shell=True)
            print("Changes committed and pushed successfully.")
        else:
            # For new repos, use the existing make_commit function
            make_commit(github_token, repo_full_name, commit_files, commit_message)

        # Wait for a few seconds to allow GitHub to recognize the workflow file
        time.sleep(10)

        if verify_github_actions_workflow(repo_full_name):
            print("GitHub Actions workflow was successfully created.")
        else:
            print("Failed to create GitHub Actions workflow.")

    finally:
        # Remove the git credentials file
        remove_git_credentials()
        
        # Clean up the cloned repository
        if repo_path:
            cleanup_repo(repo_path)

        # Remove the temporary collection files
        if os.path.exists(temp_collection_path) and collection_source == '1':
            os.remove(temp_collection_path)
            print(f"Removed temporary collection file at {temp_collection_path}")
        if repo_choice == '2' and temp_repo_collection and os.path.exists(temp_repo_collection):
            os.remove(temp_repo_collection)
            print(f"Removed temporary collection file at {temp_repo_collection}")

if __name__ == "__main__":
    main()