import os
import time
from helper_functions import generate_github_actions_yaml, make_commit, export_postman_collection, create_github_repo, verify_github_actions_workflow, initialize_repo_with_readme, readme_exists

def main():
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
        postman_api_key = os.getenv('POSTMAN_API_KEY')
        if not postman_api_key:
            postman_api_key = input("Enter your Postman API key: ")
            os.environ['POSTMAN_API_KEY'] = postman_api_key
            with open(os.path.expanduser('~/.bashrc'), 'a') as bashrc:
                bashrc.write(f'\nexport POSTMAN_API_KEY={postman_api_key}\n')
        collection_id = input("Enter the Postman collection ID: ")
        collection_file_path = 'collection.json'
        export_postman_collection(postman_api_key, collection_id, collection_file_path)
    elif collection_source == '2':
        collection_file_path = input("Enter the path to the Postman collection JSON file: ")
    else:
        print("Invalid option. Exiting.")
        return

    # Ask if it is a new or existing GitHub repo
    repo_choice = input("Is it an existing (1) or new (2) GitHub repo? ")
    if repo_choice == '1':
        repo_full_name = input("Enter the full repository name (e.g., username/repo): ")
        # Check if README.md exists in the repository
        if not readme_exists(github_token, repo_full_name):
            # Initialize the repository if README.md does not exist
            if not initialize_repo_with_readme(github_token, repo_full_name):
                return
    elif repo_choice == '2':
        repo_name = input("Enter the repository name: ")
        repo_full_name = create_github_repo(github_token, repo_name)
        if not repo_full_name:
            print("Failed to create the repository. Exiting.")
            return
        # Initialize the new repository with a README
        if not initialize_repo_with_readme(github_token, repo_full_name):
            return
    else:
        print("Invalid option. Exiting.")
        return

    output_yaml_file_path = '.github/workflows/postman-tests.yml'
    os.makedirs(os.path.dirname(output_yaml_file_path), exist_ok=True)
    generate_github_actions_yaml(collection_file_path, output_yaml_file_path)

    # Add both the .github/workflows/postman-tests.yml and collection.json to the commit
    commit_files = [output_yaml_file_path, collection_file_path]
    commit_message = "Add GitHub Actions workflow and Postman collection"
    make_commit(github_token, repo_full_name, commit_files, commit_message)

    # Wait for a few seconds to allow GitHub to recognize the workflow file
    time.sleep(10)

    if verify_github_actions_workflow(repo_full_name):
        print("GitHub Actions workflow was successfully created.")
    else:
        print("Failed to create GitHub Actions workflow.")

if __name__ == "__main__":
    main()
