from flask import Flask, render_template, request, redirect, url_for, session

app = Flask(__name__)
app.secret_key = 'your_secret_key'

# In-memory user storage for demonstration purposes
users = {}

@app.route('/')
def landing_page():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username in users and users[username] == password:
            session['username'] = username
            return redirect(url_for('main'))
        else:
            return render_template('login.html', error="Invalid credentials")
    return render_template('login.html')

@app.route('/register', methods=['POST'])
def register():
    username = request.form['username']
    password = request.form['password']
    if username not in users:
        users[username] = password
        session['username'] = username
        return redirect(url_for('main'))
    else:
        return render_template('login.html', error="User already exists")

@app.route('/main')
def main():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('main.html', phase='planning')

if __name__ == '__main__':
    app.run(debug=True)
