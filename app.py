"""
CARDIOCARE — Backend API Server
================================
Menyajikan data riil dari dataset_cleaned.csv (27.817 pasien)
+ Prediksi server-side menggunakan model Decision Tree
+ Authentication (Owner & Dokter) dengan session

Endpoints:
  POST /api/login          -> Login (username + password)
  POST /api/logout         -> Logout
  GET  /api/auth/me        -> Current user info
  GET  /api/doctors        -> List dokter (owner only)
  POST /api/doctors        -> Create dokter (owner only)
  PUT  /api/doctors/<id>   -> Update dokter (owner only)
  DELETE /api/doctors/<id> -> Delete dokter (owner only)
  GET  /api/stats          -> Statistik dashboard
  GET  /api/patients       -> Data pasien (paginated)
  GET  /api/patients/<id>  -> Detail pasien + prediksi
  POST /api/predict        -> Prediksi risiko jantung
"""

import os
import pickle
import uuid
import numpy as np
import pandas as pd
import io
import csv as csv_mod
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from flask import Flask, jsonify, request, send_from_directory, send_file, Response, session

# ─── CONFIG ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, 'dataset', 'dataset_cleaned.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'model', 'decision_tree_model.pkl')
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

app = Flask(__name__)
app.secret_key = 'cardiocare-secret-key-rsu-aulia-2026'

# ─── USER DATABASE (in-memory for demo) ─────────────────
# Roles: 'owner' (full access + CRUD doctors), 'dokter' (all features except CRUD doctors)
USERS = {}

def init_users():
    """Initialize default user accounts."""
    # Owner account
    owner_id = str(uuid.uuid4())
    USERS[owner_id] = {
        'id': owner_id,
        'username': 'owner',
        'password': generate_password_hash('owner123'),
        'name': 'Admin Owner',
        'role': 'owner',
        'created_at': '2026-06-01',
    }
    # Default doctor account
    doc_id = str(uuid.uuid4())
    USERS[doc_id] = {
        'id': doc_id,
        'username': 'dokter',
        'password': generate_password_hash('dokter123'),
        'name': 'dr. Sari Dewi, Sp.JP',
        'role': 'dokter',
        'created_at': '2026-06-01',
    }

init_users()


def find_user_by_username(username):
    """Find user by username."""
    for user in USERS.values():
        if user['username'] == username:
            return user
    return None


# ─── AUTH DECORATORS ────────────────────────────────────
def login_required(f):
    """Decorator: requires authenticated session."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized. Silakan login terlebih dahulu.'}), 401
        user = USERS.get(session['user_id'])
        if not user:
            session.clear()
            return jsonify({'error': 'Session expired. Silakan login kembali.'}), 401
        return f(*args, **kwargs)
    return decorated


def owner_required(f):
    """Decorator: requires owner role."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        user = USERS.get(session['user_id'])
        if not user or user['role'] != 'owner':
            return jsonify({'error': 'Forbidden. Hanya Owner yang dapat mengakses fitur ini.'}), 403
        return f(*args, **kwargs)
    return decorated


def get_current_user():
    """Get current logged-in user from session."""
    if 'user_id' in session:
        user = USERS.get(session['user_id'])
        if user:
            return {'id': user['id'], 'username': user['username'],
                    'name': user['name'], 'role': user['role']}
    return None

# ─── LOAD DATA ───────────────────────────────────────────
print("Memuat dataset...")
df = pd.read_csv(DATASET_PATH)
df.insert(0, 'id', range(1, len(df) + 1))
df.insert(1, 'no_rm', [f'RSU-{2024 + i // 10000}-{str(i % 10000).zfill(5)}'
                        for i in range(len(df))])
print(f"  Dataset: {len(df)} baris, {len(df.columns)} kolom")

print("Memuat model...")
with open(MODEL_PATH, 'rb') as f:
    model_data = pickle.load(f)
model = model_data['model']
feature_cols = model_data['feature_cols']
print(f"  Model: depth={model.get_depth()}, leaves={model.get_n_leaves()}")


# ─── SERVE FRONTEND ─────────────────────────────────────
@app.route('/')
def index():
    return send_file(os.path.join(FRONTEND_DIR, 'index.html'))


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(FRONTEND_DIR, path)


# ─── API: AUTH ──────────────────────────────────────────
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    if not data:
        return jsonify({'error': 'Request body kosong'}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username dan password wajib diisi'}), 400

    user = find_user_by_username(username)
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Username atau password salah'}), 401

    # Set session
    session['user_id'] = user['id']
    session.permanent = True

    return jsonify({
        'message': 'Login berhasil',
        'user': {
            'id': user['id'],
            'username': user['username'],
            'name': user['name'],
            'role': user['role'],
        }
    })


@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'message': 'Logout berhasil'})


@app.route('/api/auth/me')
def api_auth_me():
    user = get_current_user()
    if not user:
        return jsonify({'authenticated': False}), 401
    return jsonify({'authenticated': True, 'user': user})


# ─── API: DOCTOR CRUD (OWNER ONLY) ─────────────────────
@app.route('/api/doctors', methods=['GET'])
@login_required
@owner_required
def api_list_doctors():
    doctors = []
    for user in USERS.values():
        if user['role'] == 'dokter':
            doctors.append({
                'id': user['id'],
                'username': user['username'],
                'name': user['name'],
                'role': user['role'],
                'created_at': user.get('created_at', '-'),
            })
    return jsonify({'data': doctors, 'total': len(doctors)})


@app.route('/api/doctors', methods=['POST'])
@login_required
@owner_required
def api_create_doctor():
    data = request.json
    if not data:
        return jsonify({'error': 'Request body kosong'}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    name = data.get('name', '').strip()

    if not username or not password or not name:
        return jsonify({'error': 'Username, password, dan nama wajib diisi'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password minimal 6 karakter'}), 400

    # Check duplicate username
    if find_user_by_username(username):
        return jsonify({'error': 'Username sudah digunakan'}), 409

    doc_id = str(uuid.uuid4())
    from datetime import date
    USERS[doc_id] = {
        'id': doc_id,
        'username': username,
        'password': generate_password_hash(password),
        'name': name,
        'role': 'dokter',
        'created_at': date.today().isoformat(),
    }

    return jsonify({
        'message': 'Akun dokter berhasil dibuat',
        'doctor': {
            'id': doc_id,
            'username': username,
            'name': name,
            'role': 'dokter',
            'created_at': USERS[doc_id]['created_at'],
        }
    }), 201


@app.route('/api/doctors/<doctor_id>', methods=['PUT'])
@login_required
@owner_required
def api_update_doctor(doctor_id):
    user = USERS.get(doctor_id)
    if not user or user['role'] != 'dokter':
        return jsonify({'error': 'Dokter tidak ditemukan'}), 404

    data = request.json
    if not data:
        return jsonify({'error': 'Request body kosong'}), 400

    # Update name
    if 'name' in data and data['name'].strip():
        user['name'] = data['name'].strip()

    # Update password (optional)
    if 'password' in data and data['password'].strip():
        if len(data['password']) < 6:
            return jsonify({'error': 'Password minimal 6 karakter'}), 400
        user['password'] = generate_password_hash(data['password'])

    # Update username (check duplicate)
    if 'username' in data and data['username'].strip():
        new_username = data['username'].strip()
        if new_username != user['username']:
            if find_user_by_username(new_username):
                return jsonify({'error': 'Username sudah digunakan'}), 409
            user['username'] = new_username

    return jsonify({
        'message': 'Akun dokter berhasil diperbarui',
        'doctor': {
            'id': user['id'],
            'username': user['username'],
            'name': user['name'],
            'role': 'dokter',
        }
    })


@app.route('/api/doctors/<doctor_id>', methods=['DELETE'])
@login_required
@owner_required
def api_delete_doctor(doctor_id):
    user = USERS.get(doctor_id)
    if not user or user['role'] != 'dokter':
        return jsonify({'error': 'Dokter tidak ditemukan'}), 404

    del USERS[doctor_id]
    return jsonify({'message': f'Akun dokter "{user["name"]}" berhasil dihapus'})


# ─── API: DASHBOARD STATS (DATA RIIL) ───────────────────
@app.route('/api/stats')
@login_required
def api_stats():
    total = len(df)
    risiko = int(df['risiko_jantung'].sum())
    normal = total - risiko
    male = int((df['gender'] == 0).sum())
    female = int((df['gender'] == 1).sum())
    sesak_count = int(df['keluhanawal_sesak_dada'].sum())

    # Distribusi usia
    age_bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 100]
    age_labels = ['0-10', '11-20', '21-30', '31-40', '41-50',
                  '51-60', '61-70', '71-80', '80+']
    age_counts = pd.cut(df['usia'], bins=age_bins,
                        labels=age_labels).value_counts().sort_index()
    age_risk = df.groupby(
        pd.cut(df['usia'], bins=age_bins, labels=age_labels),
        observed=True
    )['risiko_jantung'].sum()

    # Distribusi BMI
    bmi_bins = [0, 18.5, 25, 30, 100]
    bmi_labels = ['Underweight', 'Normal', 'Overweight', 'Obese']
    bmi_dist = pd.cut(df['bmi'], bins=bmi_bins,
                      labels=bmi_labels).value_counts().sort_index()

    # Distribusi tekanan darah
    def bp_category(row):
        s, d = row['sistolik'], row['diastolik']
        if s < 120 and d < 80:
            return 'Normal'
        elif s < 130 and d < 80:
            return 'Elevated'
        elif s < 140 or d < 90:
            return 'Hipertensi Stg 1'
        else:
            return 'Hipertensi Stg 2'
    bp_dist = df.apply(bp_category, axis=1).value_counts()

    # Risiko per gender
    risk_male = int(df[(df['gender'] == 0) &
                       (df['risiko_jantung'] == 1)].shape[0])
    risk_female = int(df[(df['gender'] == 1) &
                         (df['risiko_jantung'] == 1)].shape[0])

    return jsonify({
        'total_pasien': total,
        'risiko_jantung': risiko,
        'tidak_risiko': normal,
        'persen_risiko': round(risiko / total * 100, 1),
        'rata_usia': round(float(df['usia'].mean()), 1),
        'rata_bmi': round(float(df['bmi'].mean()), 1),
        'rata_sistolik': round(float(df['sistolik'].mean()), 1),
        'rata_diastolik': round(float(df['diastolik'].mean()), 1),
        'laki_laki': male,
        'perempuan': female,
        'keluhan_sesak': sesak_count,
        'risiko_laki': risk_male,
        'risiko_perempuan': risk_female,
        'distribusi_usia': {
            'labels': age_labels,
            'total': [int(v) for v in age_counts.values],
            'risiko': [int(v) for v in age_risk.reindex(age_labels,
                                                        fill_value=0).values],
        },
        'distribusi_bmi': {
            'labels': bmi_labels,
            'values': [int(v) for v in bmi_dist.values],
        },
        'distribusi_td': {
            'labels': list(bp_dist.index),
            'values': [int(v) for v in bp_dist.values],
        },
    })


# ─── API: PATIENTS (PAGINATED) ──────────────────────────
@app.route('/api/patients')
@login_required
def api_patients():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 15, type=int)
    search = request.args.get('search', '').strip()
    gender_f = request.args.get('gender', '')
    risiko_f = request.args.get('risiko', '')
    sesak_f = request.args.get('sesak', '')
    sort_by = request.args.get('sort', 'id')
    order = request.args.get('order', 'asc')

    filtered = df.copy()

    if search:
        filtered = filtered[
            filtered['no_rm'].str.contains(search, case=False, na=False)
        ]

    if gender_f in ('0', '1'):
        filtered = filtered[filtered['gender'] == int(gender_f)]
    if risiko_f in ('0', '1'):
        filtered = filtered[filtered['risiko_jantung'] == int(risiko_f)]
    if sesak_f in ('0', '1'):
        filtered = filtered[
            filtered['keluhanawal_sesak_dada'] == int(sesak_f)
        ]

    total = len(filtered)
    total_pages = max(1, (total + per_page - 1) // per_page)

    if sort_by in filtered.columns:
        filtered = filtered.sort_values(
            sort_by, ascending=(order == 'asc')
        )

    start = (page - 1) * per_page
    page_data = filtered.iloc[start:start + per_page]

    records = []
    for _, row in page_data.iterrows():
        records.append({
            'id': int(row['id']),
            'no_rm': row['no_rm'],
            'usia': int(row['usia']),
            'gender': int(row['gender']),
            'gender_label': 'Perempuan' if row['gender'] == 1
                            else 'Laki-laki',
            'sesak_dada': int(row['keluhanawal_sesak_dada']),
            'bmi': int(row['bmi']),
            'sistolik': int(row['sistolik']),
            'diastolik': int(row['diastolik']),
            'td': f"{int(row['sistolik'])}/{int(row['diastolik'])}",
            'risiko_jantung': int(row['risiko_jantung']),
            'risiko_label': 'Risiko' if row['risiko_jantung'] == 1
                            else 'Normal',
        })

    return jsonify({
        'data': records,
        'page': page,
        'per_page': per_page,
        'total': total,
        'total_pages': total_pages,
    })


# ─── API: PATIENT DETAIL + PREDIKSI ─────────────────────
@app.route('/api/patients/<int:patient_id>')
@login_required
def api_patient_detail(patient_id):
    row = df[df['id'] == patient_id]
    if row.empty:
        return jsonify({'error': 'Pasien tidak ditemukan'}), 404
    row = row.iloc[0]

    features = np.array([[
        int(row['usia']), int(row['gender']),
        int(row['keluhanawal_sesak_dada']),
        int(row['bmi']),
        int(row['sistolik']), int(row['diastolik']),
    ]])
    pred = int(model.predict(features)[0])
    prob = model.predict_proba(features)[0].tolist()

    return jsonify({
        'id': int(row['id']),
        'no_rm': row['no_rm'],
        'usia': int(row['usia']),
        'gender': int(row['gender']),
        'gender_label': 'Perempuan' if row['gender'] == 1
                        else 'Laki-laki',
        'sesak_dada': int(row['keluhanawal_sesak_dada']),
        'bmi': int(row['bmi']),
        'sistolik': int(row['sistolik']),
        'diastolik': int(row['diastolik']),
        'risiko_aktual': int(row['risiko_jantung']),
        'risiko_label': 'Risiko' if row['risiko_jantung'] == 1
                        else 'Normal',
        'prediksi': pred,
        'prediksi_label': 'Risiko Jantung' if pred == 1
                          else 'Tidak Risiko',
        'probabilitas': [round(p, 4) for p in prob],
    })


# ─── API: CHARTS ────────────────────────────────────────
@app.route('/api/charts')
@login_required
def api_charts():
    total = len(df)
    risiko = int(df['risiko_jantung'].sum())
    male = int((df['gender'] == 0).sum())
    female = int((df['gender'] == 1).sum())
    risk_male = int(df[(df['gender'] == 0) & (df['risiko_jantung'] == 1)].shape[0])
    risk_female = int(df[(df['gender'] == 1) & (df['risiko_jantung'] == 1)].shape[0])

    age_bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 100]
    age_labels = ['0-10','11-20','21-30','31-40','41-50','51-60','61-70','71-80','80+']
    age_counts = pd.cut(df['usia'], bins=age_bins, labels=age_labels).value_counts().sort_index()

    bmi_bins = [0, 18.5, 25, 30, 100]
    bmi_labels = ['Underweight','Normal','Overweight','Obese']
    bmi_dist = pd.cut(df['bmi'], bins=bmi_bins, labels=bmi_labels).value_counts().sort_index()

    return jsonify({
        'usia': {'labels': age_labels, 'values': [int(v) for v in age_counts.values]},
        'bmi': {'labels': bmi_labels, 'values': [int(v) for v in bmi_dist.values]},
        'gender': {'labels': ['Laki-laki','Perempuan'], 'total': [male, female], 'risiko': [risk_male, risk_female]},
        'summary': {'total': total, 'risiko': risiko, 'normal': total - risiko}
    })


# ─── API: REPORT ────────────────────────────────────────
@app.route('/api/report')
@login_required
def api_report():
    total = len(df)
    risiko = int(df['risiko_jantung'].sum())
    male = int((df['gender'] == 0).sum())
    female = int((df['gender'] == 1).sum())
    sesak = int(df['keluhanawal_sesak_dada'].sum())

    bmi_bins = [0, 18.5, 25, 30, 100]
    bmi_labels = ['Underweight','Normal','Overweight','Obese']
    bmi_dist = pd.cut(df['bmi'], bins=bmi_bins, labels=bmi_labels).value_counts().sort_index()

    age_bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 100]
    age_labels = ['0-10','11-20','21-30','31-40','41-50','51-60','61-70','71-80','80+']
    age_counts = pd.cut(df['usia'], bins=age_bins, labels=age_labels).value_counts().sort_index()

    def bp_category(row):
        s, d = row['sistolik'], row['diastolik']
        if s < 120 and d < 80: return 'Normal'
        elif s < 130 and d < 80: return 'Elevated'
        elif s < 140 or d < 90: return 'Hipertensi Stg 1'
        else: return 'Hipertensi Stg 2'
    bp_dist = df.apply(bp_category, axis=1).value_counts()

    return jsonify({
        'total_pasien': total, 'risiko_jantung': risiko, 'tidak_risiko': total - risiko,
        'persen_risiko': round(risiko/total*100, 1),
        'laki_laki': male, 'perempuan': female, 'keluhan_sesak': sesak,
        'rata_usia': round(float(df['usia'].mean()), 1),
        'rata_bmi': round(float(df['bmi'].mean()), 2),
        'rata_sistolik': round(float(df['sistolik'].mean()), 1),
        'rata_diastolik': round(float(df['diastolik'].mean()), 1),
        'distribusi_usia': {'labels': age_labels, 'values': [int(v) for v in age_counts.values]},
        'distribusi_bmi': {'labels': bmi_labels, 'values': [int(v) for v in bmi_dist.values]},
        'distribusi_td': {'labels': list(bp_dist.index), 'values': [int(v) for v in bp_dist.values]},
    })


# ─── API: EXPORT CSV ────────────────────────────────────
@app.route('/api/export/csv')
@login_required
def api_export_csv():
    output = io.StringIO()
    writer = csv_mod.writer(output)
    cols = ['No RM','Usia','Gender','Sesak Dada','BMI','Sistolik','Diastolik','Risiko Jantung']
    writer.writerow(cols)
    for _, row in df.iterrows():
        writer.writerow([
            row['no_rm'], int(row['usia']),
            'Perempuan' if row['gender'] == 1 else 'Laki-laki',
            'Ya' if row['keluhanawal_sesak_dada'] == 1 else 'Tidak',
            int(row['bmi']), int(row['sistolik']),
            int(row['diastolik']),
            'Risiko' if row['risiko_jantung'] == 1 else 'Normal',
        ])
    output.seek(0)
    return Response(output.getvalue(), mimetype='text/csv',
                    headers={'Content-Disposition': 'attachment;filename=cardiocare_dataset.csv'})


# ─── API: PATIENT SEARCH (for EMR dropdown) ─────────────
@app.route('/api/patients/search')
@login_required
def api_patient_search():
    q = request.args.get('q', '').strip()
    risiko = request.args.get('risiko', '')
    limit = request.args.get('limit', 50, type=int)
    filtered = df.copy()
    if q:
        filtered = filtered[filtered['no_rm'].str.contains(q, case=False, na=False)]
    if risiko in ('0', '1'):
        filtered = filtered[filtered['risiko_jantung'] == int(risiko)]
    results = []
    for _, row in filtered.head(limit).iterrows():
        results.append({
            'id': int(row['id']), 'no_rm': row['no_rm'],
            'usia': int(row['usia']),
            'gender_label': 'Perempuan' if row['gender'] == 1 else 'Laki-laki',
            'risiko_label': 'Risiko' if row['risiko_jantung'] == 1 else 'Normal',
        })
    return jsonify(results)


# ─── API: PREDICT (SERVER-SIDE) ─────────────────────────
@app.route('/api/predict', methods=['POST'])
@login_required
def api_predict():
    data = request.json
    if not data:
        return jsonify({'error': 'Request body kosong'}), 400

    try:
        features = np.array([[
            int(data['usia']),
            int(data['gender']),
            int(data['sesak']),
            int(data['bmi']),
            int(data['sistolik']),
            int(data['diastolik']),
        ]])
    except (KeyError, ValueError) as e:
        return jsonify({'error': f'Input tidak valid: {e}'}), 400

    prediction = int(model.predict(features)[0])
    probability = model.predict_proba(features)[0].tolist()

    # Decision path
    node_indicator = model.decision_path(features)
    node_index = node_indicator.indices
    tree = model.tree_
    path = []
    for node_id in node_index:
        if tree.children_left[node_id] != tree.children_right[node_id]:
            feat_idx = tree.feature[node_id]
            feat_name = feature_cols[feat_idx]
            thresh = round(float(tree.threshold[node_id]), 4)
            val = float(features[0][feat_idx])
            direction = 'left' if val <= thresh else 'right'
            path.append({
                'feature': feat_name,
                'value': round(val, 2),
                'threshold': thresh,
                'direction': direction,
                'condition': f"{round(val, 2)} "
                             f"{'<=' if direction == 'left' else '>'} "
                             f"{thresh}",
            })

    return jsonify({
        'prediction': prediction,
        'label': 'Risiko Jantung' if prediction == 1
                 else 'Tidak Risiko',
        'probability': [round(p, 4) for p in probability],
        'confidence': round(float(max(probability)), 4),
        'path': path,
    })


# ─── RUN ─────────────────────────────────────────────────
if __name__ == '__main__':
    print()
    print("=" * 60)
    print("  CARDIOCARE — Backend Server (with Auth)")
    print(f"  Dataset : {len(df):,} pasien (data riil)")
    print(f"  Model   : Decision Tree "
          f"(depth={model.get_depth()}, "
          f"leaves={model.get_n_leaves()})")
    print(f"  Risiko  : {int(df['risiko_jantung'].sum()):,} "
          f"({df['risiko_jantung'].mean()*100:.1f}%)")
    print("  URL     : http://localhost:5000")
    print()
    print("  Default Accounts:")
    print("    Owner  -> username: owner   password: owner123")
    print("    Dokter -> username: dokter  password: dokter123")
    print("=" * 60)
    app.run(debug=False, port=5000)
