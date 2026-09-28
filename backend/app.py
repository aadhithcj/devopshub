from flask import Flask, jsonify
from flask_cors import CORS
import psycopg

app = Flask(__name__)
CORS(app)


DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "devopshub",
    "user": "devopshub",
    "password": "devopshub_password",
}


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "devopshub-backend"
    })


@app.get("/api/db-health")
def db_health():
    try:
        with psycopg.connect(**DB_CONFIG) as connection:
            return jsonify({
                "status": "ok",
                "database": "connected"
            })
    except Exception as error:
        return jsonify({
            "status": "error",
            "database": "disconnected",
            "message": str(error)
        }), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)