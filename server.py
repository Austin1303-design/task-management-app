import os
import time
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

users = [{'e': 'demo@taskflow.app', 'p': 'demo123', 'n': 'Demo User'}]

def get_now():
    return int(time.time() * 1000)

SEED = [
  {'id': 1, 'title': 'Redesign landing page', 'desc': 'Update hero, typography and CTA colours', 'priority': 'high', 'status': 'inprogress', 'due': '2025-06-15', 'tag': 'design', 'assignee': 'Alex Kim', 'created': get_now()-86400000*3, 'done': False, 'owner': 'demo@taskflow.app'},
  {'id': 2, 'title': 'Fix iOS auth bug', 'desc': "Safari users can't sign in on iOS 16+", 'priority': 'high', 'status': 'todo', 'due': '2025-06-10', 'tag': 'dev', 'assignee': 'Sam Lee', 'created': get_now()-86400000*2, 'done': False, 'owner': 'demo@taskflow.app'},
  {'id': 3, 'title': 'Q2 stakeholder report', 'desc': 'Quarterly metrics and roadmap summary', 'priority': 'medium', 'status': 'done', 'due': '2025-06-01', 'tag': 'ops', 'assignee': 'Demo User', 'created': get_now()-86400000*7, 'done': True, 'owner': 'demo@taskflow.app'},
  {'id': 4, 'title': 'Set up CI / CD pipeline', 'desc': 'GitHub Actions — test, build, deploy', 'priority': 'medium', 'status': 'inprogress', 'due': '2025-06-20', 'tag': 'dev', 'assignee': 'Demo User', 'created': get_now()-86400000, 'done': False, 'owner': 'demo@taskflow.app'},
  {'id': 5, 'title': 'v2 user interviews', 'desc': 'Talk to 10 customers about pain points', 'priority': 'low', 'status': 'todo', 'due': '2025-06-25', 'tag': 'research', 'assignee': 'Jamie R', 'created': get_now()-3600000, 'done': False, 'owner': 'demo@taskflow.app'},
  {'id': 6, 'title': 'Privacy policy update', 'desc': 'GDPR compliance review before launch', 'priority': 'high', 'status': 'blocked', 'due': '2025-06-05', 'tag': 'legal', 'assignee': 'Demo User', 'created': get_now()-86400000*5, 'done': False, 'owner': 'demo@taskflow.app'},
]

tasks = list(SEED)

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    e = data.get('e')
    p = data.get('p')
    user = next((u for u in users if u['e'] == e and u['p'] == p), None)
    if user:
        return jsonify({'success': True, 'user': user})
    return jsonify({'success': False, 'message': 'Invalid email or password'}), 401

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    e = data.get('e')
    p = data.get('p')
    n = data.get('n')
    if next((u for u in users if u['e'] == e), None):
        return jsonify({'success': False, 'message': 'Email already registered'}), 400
    new_user = {'e': e, 'p': p, 'n': n}
    users.append(new_user)
    return jsonify({'success': True, 'user': new_user})

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    user_email = request.args.get('email')
    user_tasks = [t for t in tasks if t.get('owner') == user_email]
    return jsonify({'tasks': user_tasks})

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.json
    data['id'] = get_now()
    data['created'] = data['id']
    tasks.insert(0, data)
    return jsonify({'success': True, 'task': data})

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    for i, t in enumerate(tasks):
        if t['id'] == task_id:
            tasks[i].update(data)
            return jsonify({'success': True, 'task': tasks[i]})
    return jsonify({'success': False, 'message': 'Task not found'}), 404

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    global tasks
    tasks = [t for t in tasks if t['id'] != task_id]
    return jsonify({'success': True})

if __name__ == '__main__':
    print("Server running at http://localhost:3000")
    app.run(port=3000)
