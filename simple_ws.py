from flask import Flask
from flask_sock import Sock

app = Flask(__name__)
sock = Sock(app)

@sock.route('/echo')
def echo(ws):
    while True:
        data = ws.receive()
        ws.send(f"ECHO: {data}")

@app.route('/')
def home():
    return "WebSocket Server Running!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
