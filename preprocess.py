"""
Preprocessing Dataset v2 — Disesuaikan dengan BAB 1 Skripsi
============================================================
Menghasilkan 6 fitur prediktor + 1 target sesuai ruang lingkup skripsi:
  1. usia             (float) — Usia pasien dalam tahun
  2. gender           (int)   — 0=Laki-laki, 1=Perempuan
  3. keluhanawal_sesak_dada (int) — 1=ada keluhan sesak/nyeri dada, 0=tidak
  4. bmi              (float) — Indeks Massa Tubuh
  5. sistolik         (int)   — Tekanan darah sistolik (mmHg)
  6. diastolik        (int)   — Tekanan darah diastolik (mmHg)
  Target:
  7. risiko_jantung   (int)   — 1=risiko, 0=tidak (dari ICD-10 I10-I79)

Input : dataset/Mas Sendi Glukosa Final-Sheet1.csv
Output: dataset/dataset_cleaned.csv
"""

import csv
import re
import os
import statistics

# ============================================================
# CONFIG
# ============================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(BASE_DIR, 'dataset',
                          'Mas Sendi Glukosa Final-Sheet1.csv')
OUTPUT_FILE = os.path.join(BASE_DIR, 'dataset', 'dataset_cleaned.csv')
REPORT_FILE = os.path.join(BASE_DIR, 'preprocessing_report.txt')

# ICD-10 I-codes relevan penyakit jantung/kardiovaskular (I10-I79)
CARDIAC_ICD_PREFIXES = tuple(
    f'I{i}' for i in list(range(10, 16)) +     # Hipertensi
                       list(range(20, 30)) +     # Iskemik, pulmonal
                       list(range(30, 53)) +     # Jantung lain
                       list(range(60, 80))       # Serebrovaskular, arterial
)

# Pattern untuk mendeteksi keluhan sesak napas / nyeri dada
SESAK_DADA_PATTERN = re.compile(
    r'sesak|sesek|nafas\s*berat|ngos[-\s]?ngos'
    r'|nyeri\s*dada|dada\s*sakit|dada\s*nyeri|dada\s*terasa'
    r'|chest\s*pain',
    re.IGNORECASE
)


def parse_usia_to_years(usia_str):
    """Parse 'XX Th YY Bl ZZ Hr' atau '49 tahun, 0 bulan, 6 hari' → float tahun."""
    s = usia_str.strip()
    if not s:
        return None

    years = months = days = 0

    # Pattern: "49 tahun, 0 bulan, 6 hari"
    m = re.match(r'(\d+)\s*tahun[,\s]*(\d+)\s*bulan[,\s]*(\d+)\s*hari', s, re.I)
    if m:
        years, months, days = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return round(years + months / 12 + days / 365, 2)

    # Pattern: "55 Th 3 Bl 28 Hr"
    m_th = re.search(r'(\d+)\s*Th', s, re.I)
    m_bl = re.search(r'(\d+)\s*Bl', s, re.I)
    m_hr = re.search(r'(\d+)\s*Hr', s, re.I)

    if m_th: years = int(m_th.group(1))
    if m_bl: months = int(m_bl.group(1))
    if m_hr: days = int(m_hr.group(1))

    if m_th or m_bl or m_hr:
        return round(years + months / 12 + days / 365, 2)

    return None


def parse_tekanan_darah(td_str):
    """Parse '132/78' → (132, 78)."""
    m = re.match(r'^(\d+)/(\d+)$', td_str.strip())
    return (int(m.group(1)), int(m.group(2))) if m else (None, None)


def has_cardiac_diagnosis(diagnosa_str):
    """Cek apakah diagnosa mengandung kode ICD-10 penyakit jantung (I10-I79)."""
    codes = re.findall(r'\(([A-Z]\d+[\.\d]*)\)', diagnosa_str)
    return any(code.startswith(CARDIAC_ICD_PREFIXES) for code in codes)


def detect_sesak_dada(keluhan_str):
    """Deteksi apakah keluhan awal mengandung gejala sesak napas atau nyeri dada."""
    return 1 if SESAK_DADA_PATTERN.search(keluhan_str) else 0


# ============================================================
# MAIN
# ============================================================
def main():
    print("=" * 65)
    print(" PREPROCESSING DATASET v2")
    print(" SPK Deteksi Dini Risiko Penyakit Jantung — RSU Aulia")
    print(" Disesuaikan dengan spesifikasi BAB 1 Skripsi")
    print("=" * 65)

    # --- BACA DATA ---
    rows = []
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        for row in reader:
            rows.append(row)

    total_original = len(rows)
    print(f"\n[1/6] Data dimuat: {total_original} baris")
    print(f"      Kolom asli : {[h for h in header[:10] if h.strip()]}")

    # --- CLEANING & TRANSFORMASI ---
    drop_stats = {
        'bmi_zero': 0, 'bmi_extreme': 0, 'bmi_non_numeric': 0,
        'td_zero': 0, 'td_one': 0, 'td_anomali': 0, 'td_parse_fail': 0,
        'gender_anomali': 0, 'usia_empty': 0, 'usia_parse_fail': 0,
    }

    GENDER_MAP = {'Laki-laki': 0, 'Perempuan': 1}
    cleaned = []

    for row in rows:
        # --- BMI ---
        try:
            bmi_val = float(row[1].strip())
        except ValueError:
            drop_stats['bmi_non_numeric'] += 1
            continue
        if bmi_val == 0.0:
            drop_stats['bmi_zero'] += 1
            continue
        if bmi_val > 100:
            drop_stats['bmi_extreme'] += 1
            continue

        # --- Tekanan Darah ---
        td_str = row[5].strip()
        if td_str == '0/0':
            drop_stats['td_zero'] += 1
            continue
        if td_str == '1/1':
            drop_stats['td_one'] += 1
            continue
        sistolik, diastolik = parse_tekanan_darah(td_str)
        if sistolik is None:
            drop_stats['td_parse_fail'] += 1
            continue
        if sistolik > 300 or diastolik > 200 or sistolik < 50:
            drop_stats['td_anomali'] += 1
            continue

        # --- Gender ---
        gender = row[4].strip()
        if gender not in GENDER_MAP:
            drop_stats['gender_anomali'] += 1
            continue

        # --- Usia ---
        usia_str = row[3].strip()
        if not usia_str:
            drop_stats['usia_empty'] += 1
            continue
        usia_years = parse_usia_to_years(usia_str)
        if usia_years is None:
            drop_stats['usia_parse_fail'] += 1
            continue

        # --- Keluhan Awal: Sesak/Nyeri Dada (FITUR BARU) ---
        keluhan_sesak_dada = detect_sesak_dada(row[0].strip())

        # --- Label Target ---
        risiko = 1 if has_cardiac_diagnosis(row[9].strip()) else 0

        cleaned.append({
            'usia': usia_years,
            'gender': GENDER_MAP[gender],
            'keluhanawal_sesak_dada': keluhan_sesak_dada,
            'bmi': round(bmi_val, 2),
            'sistolik': sistolik,
            'diastolik': diastolik,
            'risiko_jantung': risiko,
        })

    total_dropped = total_original - len(cleaned)
    print(f"\n[2/6] Cleaning selesai: {len(cleaned)} baris tersisa "
          f"({total_dropped} di-drop)")
    print(f"      Detail drop:")
    for reason, count in sorted(drop_stats.items()):
        if count > 0:
            print(f"        - {reason}: {count}")

    # --- VALIDASI ---
    print(f"\n[3/6] Validasi data...")
    missing = sum(1 for r in cleaned for v in r.values() if v is None)
    print(f"      Missing values: {missing}")

    # Label target
    positif = sum(1 for r in cleaned if r['risiko_jantung'] == 1)
    negatif = len(cleaned) - positif
    ratio = positif / negatif if negatif > 0 else 0
    print(f"      Label target:")
    print(f"        Risiko (1) : {positif} ({positif/len(cleaned)*100:.1f}%)")
    print(f"        Normal (0) : {negatif} ({negatif/len(cleaned)*100:.1f}%)")
    print(f"        Rasio      : 1:{1/ratio:.1f}" if ratio > 0 else "")

    # Sesak/dada distribution
    sesak_pos = sum(1 for r in cleaned if r['keluhanawal_sesak_dada'] == 1)
    sesak_neg = len(cleaned) - sesak_pos
    print(f"\n      Keluhan sesak/nyeri dada:")
    print(f"        Ada (1)    : {sesak_pos} ({sesak_pos/len(cleaned)*100:.1f}%)")
    print(f"        Tidak (0)  : {sesak_neg} ({sesak_neg/len(cleaned)*100:.1f}%)")

    # Cross-tab: sesak_dada vs risiko_jantung
    sesak_and_risiko = sum(1 for r in cleaned
                          if r['keluhanawal_sesak_dada'] == 1
                          and r['risiko_jantung'] == 1)
    print(f"        Sesak+Risiko: {sesak_and_risiko} "
          f"({sesak_and_risiko/sesak_pos*100:.1f}% dari pasien sesak)"
          if sesak_pos > 0 else "")

    # Statistik deskriptif
    print(f"\n[4/6] Statistik deskriptif:")
    for col in ['bmi', 'usia', 'sistolik', 'diastolik']:
        vals = [r[col] for r in cleaned]
        print(f"      {col:12s}: min={min(vals):8.2f}  max={max(vals):8.2f}  "
              f"mean={statistics.mean(vals):8.2f}  "
              f"median={statistics.median(vals):8.2f}  "
              f"stdev={statistics.stdev(vals):8.2f}")

    # Gender
    g0 = sum(1 for r in cleaned if r['gender'] == 0)
    g1 = sum(1 for r in cleaned if r['gender'] == 1)
    print(f"\n      Gender: Laki-laki={g0} ({g0/len(cleaned)*100:.1f}%), "
          f"Perempuan={g1} ({g1/len(cleaned)*100:.1f}%)")

    # --- SIMPAN OUTPUT ---
    print(f"\n[5/6] Menyimpan dataset bersih...")
    output_header = ['usia', 'gender', 'keluhanawal_sesak_dada',
                     'bmi', 'sistolik', 'diastolik', 'risiko_jantung']

    with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=output_header)
        writer.writeheader()
        writer.writerows(cleaned)

    file_size = os.path.getsize(OUTPUT_FILE)
    print(f"      File   : {OUTPUT_FILE}")
    print(f"      Ukuran : {file_size/1024:.1f} KB")
    print(f"      Kolom  : {output_header}")

    # --- LAPORAN ---
    print(f"\n[6/6] Membuat laporan preprocessing...")

    rpt = []
    rpt.append("=" * 65)
    rpt.append("LAPORAN PREPROCESSING DATASET v2")
    rpt.append("SPK Deteksi Dini Risiko Penyakit Jantung — RSU Aulia")
    rpt.append("Disesuaikan dengan BAB 1 Skripsi")
    rpt.append("=" * 65)
    rpt.append("")
    rpt.append("INPUT")
    rpt.append(f"  File     : Mas Sendi Glukosa Final-Sheet1.csv")
    rpt.append(f"  Baris    : {total_original}")
    rpt.append(f"  Kolom    : 10 kolom data + 19 kolom kosong")
    rpt.append("")
    rpt.append("OUTPUT")
    rpt.append(f"  File     : dataset_cleaned.csv")
    rpt.append(f"  Baris    : {len(cleaned)}")
    rpt.append(f"  Kolom    : {len(output_header)} (6 fitur + 1 target)")
    rpt.append(f"  Ukuran   : {file_size/1024:.1f} KB")
    rpt.append("")
    rpt.append("-" * 65)
    rpt.append("KOLOM YANG DI-DROP (SESUAI RUANG LINGKUP SKRIPSI)")
    rpt.append("-" * 65)
    rpt.append("  - bmi_result     : Redundan (sudah dicakup oleh BMI numerik)")
    rpt.append("  - glukosa_puasa  : 99.3% kosong, tidak ada di spesifikasi")
    rpt.append("  - glukosa_sewaktu: 91.7% kosong, tidak ada di spesifikasi")
    rpt.append("  - hba1c          : 99.4% kosong, tidak ada di spesifikasi")
    rpt.append("  - diagnosa       : Digunakan untuk labeling, lalu di-drop")
    rpt.append("  - 19 kolom kosong (index 10-28)")
    rpt.append("")
    rpt.append("-" * 65)
    rpt.append("FITUR YANG DIEKSTRAK")
    rpt.append("-" * 65)
    rpt.append("  - keluhanawal → keluhanawal_sesak_dada (binary)")
    rpt.append("    Keyword: sesak, sesek, nafas berat, ngos-ngos,")
    rpt.append("             nyeri dada, dada sakit, dada nyeri, chest pain")
    rpt.append("  - usia: 'XX Th YY Bl ZZ Hr' → float (tahun)")
    rpt.append("  - tekanan_darah: 'sistolik/diastolik' → 2 kolom int")
    rpt.append("  - gender: Laki-laki=0, Perempuan=1")
    rpt.append("  - diagnosa → risiko_jantung: ICD I10-I79 = 1, lainnya = 0")
    rpt.append("")
    rpt.append("-" * 65)
    rpt.append("BARIS YANG DI-DROP")
    rpt.append("-" * 65)
    rpt.append(f"  Total baris di-drop: {total_dropped}")
    for reason, count in sorted(drop_stats.items()):
        if count > 0:
            rpt.append(f"    - {reason:20s}: {count:6d}")
    rpt.append("")
    rpt.append("-" * 65)
    rpt.append("STRUKTUR OUTPUT (SESUAI BAB 1 SKRIPSI)")
    rpt.append("-" * 65)
    rpt.append(f"  {'No':<4s} {'Kolom':<26s} {'Tipe':<8s} {'Deskripsi'}")
    rpt.append(f"  {'--':<4s} {'-'*26} {'-'*8} {'-'*30}")
    col_info = [
        ('1', 'usia',                   'float', 'Usia pasien (tahun)'),
        ('2', 'gender',                 'int',   '0=Laki-laki, 1=Perempuan'),
        ('3', 'keluhanawal_sesak_dada', 'int',   '1=sesak/nyeri dada, 0=tidak'),
        ('4', 'bmi',                    'float', 'Indeks Massa Tubuh (kg/m²)'),
        ('5', 'sistolik',              'int',   'Tekanan darah sistolik (mmHg)'),
        ('6', 'diastolik',             'int',   'Tekanan darah diastolik (mmHg)'),
        ('T', 'risiko_jantung',        'int',   'TARGET: 0=Tidak, 1=Ya'),
    ]
    for no, col, typ, desc in col_info:
        rpt.append(f"  {no:<4s} {col:<26s} {typ:<8s} {desc}")
    rpt.append("")
    rpt.append("-" * 65)
    rpt.append("STATISTIK DESKRIPTIF")
    rpt.append("-" * 65)
    for col in ['bmi', 'usia', 'sistolik', 'diastolik']:
        vals = [r[col] for r in cleaned]
        rpt.append(
            f"  {col:12s}: min={min(vals):8.2f}  max={max(vals):8.2f}  "
            f"mean={statistics.mean(vals):8.2f}  "
            f"median={statistics.median(vals):8.2f}  "
            f"stdev={statistics.stdev(vals):8.2f}"
        )
    rpt.append("")
    rpt.append("-" * 65)
    rpt.append("DISTRIBUSI LABEL TARGET")
    rpt.append("-" * 65)
    rpt.append(f"  Risiko jantung (1): {positif:6d} ({positif/len(cleaned)*100:.1f}%)")
    rpt.append(f"  Tidak risiko   (0): {negatif:6d} ({negatif/len(cleaned)*100:.1f}%)")
    rpt.append(f"  Rasio              : 1:{1/ratio:.1f}" if ratio > 0 else "")
    rpt.append("")
    rpt.append("-" * 65)
    rpt.append("DISTRIBUSI KELUHAN SESAK/NYERI DADA")
    rpt.append("-" * 65)
    rpt.append(f"  Ada keluhan    (1): {sesak_pos:6d} ({sesak_pos/len(cleaned)*100:.1f}%)")
    rpt.append(f"  Tidak ada      (0): {sesak_neg:6d} ({sesak_neg/len(cleaned)*100:.1f}%)")
    if sesak_pos > 0:
        rpt.append(f"  Sesak + Risiko    : {sesak_and_risiko:6d} "
                    f"({sesak_and_risiko/sesak_pos*100:.1f}% dari pasien sesak)")
    rpt.append("")
    rpt.append("-" * 65)
    rpt.append("DISTRIBUSI GENDER")
    rpt.append("-" * 65)
    rpt.append(f"  Laki-laki (0): {g0:6d} ({g0/len(cleaned)*100:.1f}%)")
    rpt.append(f"  Perempuan (1): {g1:6d} ({g1/len(cleaned)*100:.1f}%)")
    rpt.append("")
    rpt.append("-" * 65)
    rpt.append("PREVIEW 10 BARIS PERTAMA")
    rpt.append("-" * 65)
    rpt.append(
        f"  {'usia':>7s} {'gdr':>4s} {'sesak':>5s} {'bmi':>7s} "
        f"{'sist':>5s} {'diast':>5s} {'risiko':>6s}"
    )
    for r in cleaned[:10]:
        rpt.append(
            f"  {r['usia']:7.2f} {r['gender']:4d} {r['keluhanawal_sesak_dada']:5d} "
            f"{r['bmi']:7.2f} {r['sistolik']:5d} {r['diastolik']:5d} "
            f"{r['risiko_jantung']:6d}"
        )
    rpt.append("")
    rpt.append("=" * 65)
    rpt.append("Preprocessing v2 selesai. Dataset siap untuk pemodelan")
    rpt.append("Decision Tree sesuai spesifikasi skripsi.")
    rpt.append("=" * 65)

    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(rpt))
    print(f"      Laporan: {REPORT_FILE}")

    print(f"\n{'=' * 65}")
    print(f" PREPROCESSING SELESAI!")
    print(f"   Dataset  : {OUTPUT_FILE}")
    print(f"   Baris    : {len(cleaned)}")
    print(f"   Fitur    : 6 prediktor + 1 target = 7 kolom")
    print(f"   Missing  : {missing}")
    print(f"   Laporan  : {REPORT_FILE}")
    print(f"{'=' * 65}")


if __name__ == '__main__':
    main()
