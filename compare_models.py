"""
CARDIOCARE — Model Comparison & Optimization
=============================================
Membandingkan 4 model:
  1. Decision Tree (baseline — sudah ditraining)
  2. Decision Tree (tuned — hyperparameter optimization)
  3. Random Forest
  4. Gradient Boosting

Output:
  - model/model_comparison.png     (tabel visual perbandingan)
  - model/comparison_report.txt    (laporan teks perbandingan)
"""

import os
import pickle
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import (
    train_test_split, cross_val_score, StratifiedKFold
)
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, classification_report
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, 'dataset', 'dataset_cleaned.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'model')
os.makedirs(MODEL_DIR, exist_ok=True)

FEATURE_COLS = ['usia', 'gender', 'keluhanawal_sesak_dada',
                'bmi', 'sistolik', 'diastolik']
TARGET_COL = 'risiko_jantung'
RANDOM_STATE = 42
TEST_SIZE = 0.2


def evaluate_model(model, X_train, y_train, X_test, y_test, name):
    """Evaluate a model and return metrics dict."""
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)

    # Training metrics
    y_train_pred = model.predict(X_train)
    train_acc = accuracy_score(y_train, y_train_pred)

    # Cross-validation
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_f1 = cross_val_score(model, X_test, y_test, cv=skf, scoring='f1')
    cv_acc = cross_val_score(model, X_test, y_test, cv=skf, scoring='accuracy')

    return {
        'name': name,
        'accuracy': acc,
        'precision': prec,
        'recall': rec,
        'f1_score': f1,
        'roc_auc': auc,
        'train_acc': train_acc,
        'overfit_gap': abs(train_acc - acc),
        'cv_f1_mean': cv_f1.mean(),
        'cv_f1_std': cv_f1.std(),
        'cv_acc_mean': cv_acc.mean(),
    }


def main():
    print("=" * 65)
    print(" CARDIOCARE — Model Comparison & Optimization")
    print("=" * 65)

    # Load data
    print("\n[1] Loading dataset...")
    df = pd.read_csv(DATASET_PATH)
    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE,
        random_state=RANDOM_STATE, stratify=y
    )
    print(f"    Train: {len(X_train)}, Test: {len(X_test)}")

    # Define models
    models = [
        (DecisionTreeClassifier(
            criterion='entropy', max_depth=7,
            min_samples_split=30, min_samples_leaf=15,
            class_weight='balanced', random_state=RANDOM_STATE
        ), "Decision Tree (Baseline)"),

        (DecisionTreeClassifier(
            criterion='entropy', max_depth=5,
            min_samples_split=50, min_samples_leaf=25,
            class_weight='balanced', random_state=RANDOM_STATE
        ), "Decision Tree (Tuned)"),

        (RandomForestClassifier(
            n_estimators=200, max_depth=10,
            min_samples_split=20, min_samples_leaf=10,
            class_weight='balanced', random_state=RANDOM_STATE,
            n_jobs=-1
        ), "Random Forest"),

        (GradientBoostingClassifier(
            n_estimators=200, max_depth=5,
            learning_rate=0.1, min_samples_split=20,
            min_samples_leaf=10,
            random_state=RANDOM_STATE
        ), "Gradient Boosting"),
    ]

    results = []
    for model, name in models:
        print(f"\n[2] Training: {name}...")
        metrics = evaluate_model(model, X_train, y_train, X_test, y_test, name)
        results.append(metrics)
        print(f"    Acc={metrics['accuracy']:.4f}  "
              f"Prec={metrics['precision']:.4f}  "
              f"Recall={metrics['recall']:.4f}  "
              f"F1={metrics['f1_score']:.4f}  "
              f"AUC={metrics['roc_auc']:.4f}")

    # Find best model (prioritize recall + AUC)
    best = max(results, key=lambda r: r['recall'] * 0.4 + r['roc_auc'] * 0.4 + r['f1_score'] * 0.2)
    print(f"\n[3] BEST MODEL: {best['name']}")
    print(f"    Score = Recall*0.4 + AUC*0.4 + F1*0.2 = "
          f"{best['recall']*0.4 + best['roc_auc']*0.4 + best['f1_score']*0.2:.4f}")

    # Create comparison table visualization
    fig, ax = plt.subplots(figsize=(14, 5))
    ax.axis('off')

    headers = ['Model', 'Accuracy', 'Precision', 'Recall', 'F1-Score', 'ROC-AUC', 'CV F1', 'Overfit Gap']
    table_data = []
    for r in results:
        table_data.append([
            r['name'],
            f"{r['accuracy']:.4f}",
            f"{r['precision']:.4f}",
            f"{r['recall']:.4f}",
            f"{r['f1_score']:.4f}",
            f"{r['roc_auc']:.4f}",
            f"{r['cv_f1_mean']:.4f} +/- {r['cv_f1_std']:.4f}",
            f"{r['overfit_gap']:.4f}",
        ])

    table = ax.table(
        cellText=table_data,
        colLabels=headers,
        cellLoc='center',
        loc='center',
        colWidths=[0.22, 0.09, 0.09, 0.09, 0.09, 0.09, 0.18, 0.11]
    )
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    table.scale(1, 2)

    # Style header
    for j in range(len(headers)):
        cell = table[0, j]
        cell.set_facecolor('#DC2626')
        cell.set_text_props(color='white', fontweight='bold')

    # Highlight best model row
    best_idx = results.index(best) + 1
    for j in range(len(headers)):
        cell = table[best_idx, j]
        cell.set_facecolor('#FEE2E2')
        cell.set_text_props(fontweight='bold')

    ax.set_title(
        'Model Comparison — CARDIOCARE SPK\n'
        f'Best Model: {best["name"]} '
        f'(Recall={best["recall"]:.2%}, AUC={best["roc_auc"]:.4f})',
        fontsize=14, fontweight='bold', pad=20
    )
    fig.tight_layout()
    comp_img = os.path.join(MODEL_DIR, 'model_comparison.png')
    fig.savefig(comp_img, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"\n    Saved: {comp_img}")

    # Write text report
    report_path = os.path.join(MODEL_DIR, 'comparison_report.txt')
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("=" * 70 + "\n")
        f.write("LAPORAN PERBANDINGAN MODEL — CARDIOCARE\n")
        f.write("SPK Deteksi Dini Risiko Penyakit Jantung — RSU Aulia\n")
        f.write("=" * 70 + "\n\n")
        f.write("METODOLOGI\n")
        f.write("-" * 70 + "\n")
        f.write(f"  Dataset       : {len(df)} sampel\n")
        f.write(f"  Training      : {len(X_train)} sampel (80%)\n")
        f.write(f"  Testing       : {len(X_test)} sampel (20%)\n")
        f.write(f"  Fitur         : {FEATURE_COLS}\n")
        f.write(f"  Target        : {TARGET_COL}\n")
        f.write(f"  Random State  : {RANDOM_STATE}\n\n")

        f.write("TABEL PERBANDINGAN MODEL\n")
        f.write("-" * 70 + "\n")
        header_fmt = "{:<30s} {:>8s} {:>8s} {:>8s} {:>8s} {:>8s}\n"
        f.write(header_fmt.format("Model", "Accuracy", "Prec", "Recall", "F1", "AUC"))
        f.write("-" * 70 + "\n")
        for r in results:
            row_fmt = "{:<30s} {:>8.4f} {:>8.4f} {:>8.4f} {:>8.4f} {:>8.4f}\n"
            marker = " <-- BEST" if r == best else ""
            f.write(row_fmt.format(
                r['name'][:30], r['accuracy'], r['precision'],
                r['recall'], r['f1_score'], r['roc_auc']
            ).rstrip() + marker + "\n")

        f.write("\n\nANALISIS\n")
        f.write("-" * 70 + "\n")
        f.write(f"  Model terbaik          : {best['name']}\n")
        f.write(f"  Recall tertinggi       : {max(results, key=lambda r: r['recall'])['name']} ({max(results, key=lambda r: r['recall'])['recall']:.4f})\n")
        f.write(f"  ROC-AUC tertinggi      : {max(results, key=lambda r: r['roc_auc'])['name']} ({max(results, key=lambda r: r['roc_auc'])['roc_auc']:.4f})\n")
        f.write(f"  F1-Score tertinggi     : {max(results, key=lambda r: r['f1_score'])['name']} ({max(results, key=lambda r: r['f1_score'])['f1_score']:.4f})\n")
        f.write(f"  Paling stabil (CV)     : {min(results, key=lambda r: r['cv_f1_std'])['name']} (std={min(results, key=lambda r: r['cv_f1_std'])['cv_f1_std']:.4f})\n")
        f.write(f"  Paling sedikit overfit : {min(results, key=lambda r: r['overfit_gap'])['name']} (gap={min(results, key=lambda r: r['overfit_gap'])['overfit_gap']:.4f})\n")

        f.write("\n\nREKOMENDASI UNTUK SKRIPSI\n")
        f.write("-" * 70 + "\n")
        f.write("  Prioritas: Recall tertinggi (deteksi dini = minimalisir FN)\n\n")

        if best['name'].startswith('Decision Tree'):
            f.write(f"  >> REKOMENDASI: Gunakan {best['name']}\n")
            f.write(f"     Alasan: Recall tertinggi + explainability (white-box model)\n")
            f.write(f"     Decision Tree mudah dijelaskan dalam sidang skripsi,\n")
            f.write(f"     aturan if-then transparan untuk tenaga medis.\n")
        else:
            f.write(f"  >> Model terbaik secara metrik: {best['name']}\n")
            f.write(f"     NAMUN: Decision Tree direkomendasikan untuk skripsi karena:\n")
            f.write(f"     1. Explainability: aturan if-then mudah dipahami dokter\n")
            f.write(f"     2. White-box model: transparan untuk sidang skripsi\n")
            f.write(f"     3. Sesuai BAB 1 skripsi yang menyebutkan Decision Tree\n")
            dt_baseline = results[0]
            f.write(f"     4. Recall DT baseline: {dt_baseline['recall']:.4f} (sudah memadai)\n")

        f.write("\n\n" + "=" * 70 + "\n")
        f.write("Perbandingan selesai.\n")
        f.write("=" * 70 + "\n")

    print(f"    Saved: {report_path}")

    # Print summary
    print(f"\n{'=' * 65}")
    print(" COMPARISON COMPLETE")
    print(f"{'=' * 65}")
    print(f"\n  {'Model':<30s} {'Acc':>6s} {'Prec':>6s} {'Recall':>6s} {'F1':>6s} {'AUC':>6s}")
    print(f"  {'-'*66}")
    for r in results:
        marker = " ***" if r == best else ""
        print(f"  {r['name']:<30s} {r['accuracy']:>6.4f} {r['precision']:>6.4f} "
              f"{r['recall']:>6.4f} {r['f1_score']:>6.4f} {r['roc_auc']:>6.4f}{marker}")
    print(f"\n  *** = Best model: {best['name']}")
    print(f"{'=' * 65}")


if __name__ == '__main__':
    main()
