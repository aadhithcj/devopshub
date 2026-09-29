import os

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
import psycopg

load_dotenv()

app = Flask(__name__)
CORS(app)


DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
}


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "devopshub-backend",
        "version": "1.0"
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
    app.run(host="0.0.0.0", debug=True, port=5000)