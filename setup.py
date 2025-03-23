import os
import subprocess
import sys
import venv

def run_command(command):
    try:
        subprocess.run(command, shell=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(f"Error: {e}")
        sys.exit(1)

def create_and_activate_venv(base_dir):
    venv_path = os.path.join(base_dir, 'venv')
    print("\nCreating virtual environment...")
    venv.create(venv_path, with_pip=True)
    
    # Get the path to the activate script based on the OS
    if sys.platform == "win32":
        activate_script = os.path.join(venv_path, "Scripts", "activate")
    else:
        activate_script = os.path.join(venv_path, "bin", "activate")
    
    # Return the activation command
    if sys.platform == "win32":
        return f"call {activate_script}"
    return f"source {activate_script}"

def main():
    # Get the directory where setup.py is located
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.join(base_dir, 'vai')

    # Create and get activation command for virtual environment
    activate_command = create_and_activate_venv(base_dir)
    
    # Activate virtual environment and change to project directory
    os.chdir(project_dir)

    print("Setting up Voice AI project...")
    
    # Install requirements (using the activated virtual environment)
    print("\nInstalling requirements...")
    if sys.platform == "win32":
        run_command(f"{activate_command} && pip install -r ../requirements.txt")
    else:
        run_command(f"{activate_command} && pip install -r ../requirements.txt")

    # Make migrations
    print("\nCreating database migrations...")
    if sys.platform == "win32":
        run_command(f"{activate_command} && python manage.py makemigrations")
        run_command(f"{activate_command} && python manage.py makemigrations users")
        run_command(f"{activate_command} && python manage.py makemigrations api")
    else:
        run_command(f"{activate_command} && python manage.py makemigrations")
        run_command(f"{activate_command} && python manage.py makemigrations users")
        run_command(f"{activate_command} && python manage.py makemigrations api")

    # Apply migrations
    print("\nApplying migrations...")
    if sys.platform == "win32":
        run_command(f"{activate_command} && python manage.py migrate")
    else:
        run_command(f"{activate_command} && python manage.py migrate")

    print("\nSetup completed successfully!")
    print("You can now run the development server using:")
    print("cd vai && python manage.py runserver")
    print("\nNote: Make sure to activate the virtual environment first with:")
    if sys.platform == "win32":
        print(f"call {os.path.join(base_dir, 'venv', 'Scripts', 'activate')}")
    else:
        print(f"source {os.path.join(base_dir, 'venv', 'bin', 'activate')}")

if __name__ == "__main__":
    main() 