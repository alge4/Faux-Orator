import os

def update_requirements():
    os.system('pip freeze > requirements.txt')

if __name__ == '__main__':
    update_requirements()
