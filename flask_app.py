"""
TRAcad download counter - Flask backend for PythonAnywhere.

GET  /api/downloads  -> {"total": N}
POST /api/downloads  -> increments, returns {"total": N+1}

Setup: paste into your PythonAnywhere web app's WSGI-linked file
(usually /home/tahrim/mysite/flask_app.py), then press "Reload" on the Web tab.
No extra packages needed. Count is stored in count.json next to this file.
To start from your current number, create count.json containing {"total": 123}.
"""
import json
import os
import threading

from flask import Flask, jsonify

app = Flask(__name__)

COUNT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "count.json")
lock = threading.Lock()


@app.after_request
def add_cors(resp):
    # Lets your website read the response (without this the browser blocks it)
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Cache-Control"] = "no-store"
    return resp


def read_total():
    try:
        with open(COUNT_FILE) as f:
            return int(json.load(f)["total"])
    except Exception:
        return 0


@app.route("/api/downloads", methods=["GET"])
def get_total():
    return jsonify(total=read_total())


@app.route("/api/downloads", methods=["POST"])
def add_download():
    with lock:
        total = read_total() + 1
        with open(COUNT_FILE, "w") as f:
            json.dump({"total": total}, f)
    return jsonify(total=total)


@app.route("/api/downloads", methods=["OPTIONS"])
def preflight():
    return ("", 204)


@app.route("/")
def home():
    return jsonify(status="ok", total=read_total())
