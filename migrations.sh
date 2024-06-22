flask db init  # Run this only once, to initialize migrations directory
flask db migrate -m "Add email and username to User model"
flask db upgrade
