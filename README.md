# CARDIOCARE — SPK Deteksi Dini Risiko Penyakit Jantung

Sistem Pendukung Keputusan (SPK) untuk deteksi dini risiko penyakit jantung menggunakan algoritma Decision Tree berbasis web. Dibangun dengan data rekam medis riil dari RSU Aulia (27.817 pasien).

## Akun Default

| Role | Username | Password | Hak Akses |
|------|----------|----------|----------|
| Owner | `owner` | `owner123` | Full access + CRUD akun dokter |
| Dokter | `dokter` | `dokter123` | Semua fitur kecuali CRUD akun dokter |

## Persiapan Lingkungan (Setup)

### 1. Instalasi Python
Pastikan Python 3.x sudah terinstal beserta package berikut:
```bash
pip install flask scikit-learn pandas numpy matplotlib
```

### 2. Instalasi Node.js
Pastikan [Node.js](https://nodejs.org/) sudah terinstal untuk frontend.

### 3. Instalasi Dependensi Frontend
```bash
cd frontend
npm install
```

### 4. Menjalankan Aplikasi
```bash
python app.py
```

Aplikasi akan berjalan di http://localhost:5000

## Struktur Direktori
- `app.py` — Backend server (Flask REST API)
- `preprocess.py` — Preprocessing dataset mentah
- `train_model.py` — Training model Decision Tree
- `dataset/` — Dataset CSV (mentah dan cleaned)
- `model/` — Model terlatih dan artefak evaluasi
- `frontend/` — Frontend (React + Vite)