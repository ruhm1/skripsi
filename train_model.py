"""
Training Model Decision Tree — SPK Deteksi Dini Risiko Penyakit Jantung
========================================================================
Sesuai spesifikasi BAB 1 Skripsi & RFD v2.0

Input : dataset/dataset_cleaned.csv (27.817 baris, 7 kolom)
Output:
  - model/decision_tree_model.pkl      (model terserialize)
  - model/tree_rules.txt               (aturan if-then dari pohon)
  - model/tree_visualization.png       (visualisasi pohon keputusan)
  - model/feature_importance.png       (grafik feature importance)
  - model/confusion_matrix.png         (confusion matrix heatmap)
  - model/evaluation_report.txt        (laporan evaluasi lengkap)

Fitur : usia, gender, keluhanawal_sesak_dada, bmi, sistolik, diastolik
Target: risiko_jantung (0=Tidak, 1=Ya)
"""

import os
import csv
import pickle
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
from sklearn.tree import DecisionTreeClassifier, export_text, plot_tree
from sklearn.model_selection import (
    train_test_split,
    cross_val_score,
    StratifiedKFold
)
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
    roc_curve
)

# ============================================================
# CONFIG
# ============================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, 'dataset', 'dataset_cleaned.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'model')
os.makedirs(MODEL_DIR, exist_ok=True)

FEATURE_COLS = ['usia', 'gender', 'keluhanawal_sesak_dada',
                'bmi', 'sistolik', 'diastolik']
TARGET_COL = 'risiko_jantung'

FEATURE_LABELS = {
    'usia': 'Usia (tahun)',
    'gender': 'Gender',
    'keluhanawal_sesak_dada': 'Sesak/Nyeri Dada',
    'bmi': 'BMI (kg/m²)',
    'sistolik': 'Sistolik (mmHg)',
    'diastolik': 'Diastolik (mmHg)',
}

CLASS_NAMES = ['Tidak Risiko (0)', 'Risiko Jantung (1)']

# Hyperparameters sesuai RFD
RANDOM_STATE = 42
TEST_SIZE = 0.2
CV_FOLDS = 10


# ============================================================
# MAIN
# ============================================================
def main():
    print("=" * 65)
    print(" TRAINING MODEL DECISION TREE")
    print(" SPK Deteksi Dini Risiko Penyakit Jantung — RSU Aulia")
    print("=" * 65)

    # ─── 1. LOAD DATA ───────────────────────────────────────
    print("\n[1/7] Memuat dataset...")
    df = pd.read_csv(DATASET_PATH)
    print(f"      Shape  : {df.shape}")
    print(f"      Kolom  : {list(df.columns)}")
    print(f"      Target : {df[TARGET_COL].value_counts().to_dict()}")

    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    # ─── 2. TRAIN-TEST SPLIT ────────────────────────────────
    print("\n[2/7] Membagi data (80% train / 20% test, stratified)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y
    )
    print(f"      Training : {len(X_train)} sampel "
          f"(risiko={y_train.sum()}, "
          f"tidak={len(y_train)-y_train.sum()})")
    print(f"      Testing  : {len(X_test)} sampel "
          f"(risiko={y_test.sum()}, "
          f"tidak={len(y_test)-y_test.sum()})")

    # ─── 3. TRAINING ────────────────────────────────────────
    print("\n[3/7] Melatih model Decision Tree...")
    print("      Parameter:")
    print("        criterion    = entropy (Information Gain)")
    print("        max_depth    = 7")
    print("        min_samples_split = 30")
    print("        min_samples_leaf  = 15")
    print("        class_weight = balanced")
    print("        splitter     = best")

    model = DecisionTreeClassifier(
        criterion='entropy',
        max_depth=7,
        min_samples_split=30,
        min_samples_leaf=15,
        class_weight='balanced',
        splitter='best',
        random_state=RANDOM_STATE
    )

    model.fit(X_train, y_train)
    print(f"      Training selesai!")
    print(f"      Kedalaman pohon : {model.get_depth()}")
    print(f"      Jumlah leaf     : {model.get_n_leaves()}")
    print(f"      Jumlah node     : {model.tree_.node_count}")

    # ─── 4. EVALUASI ────────────────────────────────────────
    print("\n[4/7] Evaluasi model...")

    # Prediksi
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    # Metrik
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)

    print(f"      Accuracy  : {acc:.4f} ({acc*100:.2f}%)")
    print(f"      Precision : {prec:.4f} ({prec*100:.2f}%)")
    print(f"      Recall    : {rec:.4f} ({rec*100:.2f}%)")
    print(f"      F1-Score  : {f1:.4f} ({f1*100:.2f}%)")
    print(f"      ROC-AUC   : {auc:.4f}")

    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    specificity = tn / (tn + fp)
    print(f"      Specificity: {specificity:.4f} ({specificity*100:.2f}%)")
    print(f"\n      Confusion Matrix:")
    print(f"        TP={tp:5d}  FP={fp:5d}")
    print(f"        FN={fn:5d}  TN={tn:5d}")

    # Cross-validation
    print(f"\n      Cross-validation ({CV_FOLDS}-fold, stratified)...")
    skf = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True,
                          random_state=RANDOM_STATE)
    cv_scores = cross_val_score(model, X, y, cv=skf, scoring='f1')
    print(f"        F1 per fold  : {[f'{s:.4f}' for s in cv_scores]}")
    print(f"        F1 mean ± std: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    cv_acc = cross_val_score(model, X, y, cv=skf, scoring='accuracy')
    print(f"        Acc mean ± std: {cv_acc.mean():.4f} ± {cv_acc.std():.4f}")

    # Training accuracy (untuk cek overfitting)
    y_train_pred = model.predict(X_train)
    train_acc = accuracy_score(y_train, y_train_pred)
    print(f"\n      Overfitting check:")
    print(f"        Training accuracy : {train_acc:.4f}")
    print(f"        Testing accuracy  : {acc:.4f}")
    print(f"        Gap               : {abs(train_acc - acc):.4f} "
          f"({'OK' if abs(train_acc - acc) < 0.05 else 'PERIKSA'})")

    # Feature importance
    importances = model.feature_importances_
    print(f"\n      Feature Importance:")
    for feat, imp in sorted(zip(FEATURE_COLS, importances),
                            key=lambda x: x[1], reverse=True):
        bar = '#' * int(imp * 50)
        print(f"        {FEATURE_LABELS[feat]:20s}: {imp:.4f} {bar}")

    # ─── 5. SIMPAN MODEL ────────────────────────────────────
    print("\n[5/7] Menyimpan model...")
    model_path = os.path.join(MODEL_DIR, 'decision_tree_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump({
            'model': model,
            'feature_cols': FEATURE_COLS,
            'feature_labels': FEATURE_LABELS,
            'class_names': CLASS_NAMES,
            'metadata': {
                'accuracy': acc,
                'precision': prec,
                'recall': rec,
                'f1_score': f1,
                'roc_auc': auc,
                'train_size': len(X_train),
                'test_size': len(X_test),
                'tree_depth': model.get_depth(),
                'n_leaves': model.get_n_leaves(),
            }
        }, f)
    print(f"      Model: {model_path}")
    print(f"      Ukuran: {os.path.getsize(model_path)/1024:.1f} KB")

    # Simpan aturan (tree rules)
    rules_path = os.path.join(MODEL_DIR, 'tree_rules.txt')
    tree_rules = export_text(
        model,
        feature_names=FEATURE_COLS,
        show_weights=True
    )
    with open(rules_path, 'w', encoding='utf-8') as f:
        f.write("ATURAN KEPUTUSAN (DECISION RULES)\n")
        f.write("Decision Tree — SPK Risiko Jantung RSU Aulia\n")
        f.write("=" * 60 + "\n\n")
        f.write(tree_rules)
    print(f"      Rules: {rules_path}")

    # ─── 6. VISUALISASI ─────────────────────────────────────
    print("\n[6/7] Membuat visualisasi...")

    # 6a. Pohon Keputusan
    fig, ax = plt.subplots(figsize=(28, 14))
    plot_tree(
        model,
        feature_names=[FEATURE_LABELS[f] for f in FEATURE_COLS],
        class_names=CLASS_NAMES,
        filled=True,
        rounded=True,
        fontsize=7,
        ax=ax,
        proportion=True,
        impurity=True,
    )
    ax.set_title(
        'Decision Tree — SPK Deteksi Dini Risiko Penyakit Jantung\n'
        f'Depth={model.get_depth()}, Leaves={model.get_n_leaves()}, '
        f'Accuracy={acc:.2%}, F1={f1:.2%}',
        fontsize=14, fontweight='bold', pad=20
    )
    tree_img = os.path.join(MODEL_DIR, 'tree_visualization.png')
    fig.savefig(tree_img, dpi=200, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close(fig)
    print(f"      Pohon: {tree_img}")

    # 6b. Feature Importance
    fig, ax = plt.subplots(figsize=(10, 6))
    sorted_idx = np.argsort(importances)
    feat_labels = [FEATURE_LABELS[FEATURE_COLS[i]] for i in sorted_idx]
    colors = plt.cm.RdYlGn(np.linspace(0.3, 0.9, len(sorted_idx)))
    bars = ax.barh(feat_labels, importances[sorted_idx], color=colors,
                   edgecolor='#333', linewidth=0.5)
    for bar, val in zip(bars, importances[sorted_idx]):
        ax.text(bar.get_width() + 0.005, bar.get_y() + bar.get_height()/2,
                f'{val:.4f}', va='center', fontsize=10, fontweight='bold')
    ax.set_xlabel('Importance (Information Gain)', fontsize=12)
    ax.set_title('Feature Importance — Decision Tree\n'
                 'SPK Risiko Jantung RSU Aulia',
                 fontsize=13, fontweight='bold')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    fig.tight_layout()
    fi_img = os.path.join(MODEL_DIR, 'feature_importance.png')
    fig.savefig(fi_img, dpi=150, bbox_inches='tight',
                facecolor='white')
    plt.close(fig)
    print(f"      Feature Importance: {fi_img}")

    # 6c. Confusion Matrix
    fig, ax = plt.subplots(figsize=(8, 6))
    im = ax.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax, shrink=0.8)
    ax.set(xticks=[0, 1], yticks=[0, 1],
           xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES,
           ylabel='Aktual', xlabel='Prediksi')
    ax.set_title('Confusion Matrix — Decision Tree\n'
                 f'Accuracy={acc:.2%}, Recall={rec:.2%}, '
                 f'Precision={prec:.2%}',
                 fontsize=12, fontweight='bold')
    for i in range(2):
        for j in range(2):
            color = 'white' if cm[i, j] > cm.max()/2 else 'black'
            ax.text(j, i, f'{cm[i,j]:,}',
                    ha='center', va='center', color=color,
                    fontsize=18, fontweight='bold')
    fig.tight_layout()
    cm_img = os.path.join(MODEL_DIR, 'confusion_matrix.png')
    fig.savefig(cm_img, dpi=150, bbox_inches='tight',
                facecolor='white')
    plt.close(fig)
    print(f"      Confusion Matrix: {cm_img}")

    # 6d. ROC Curve
    fig, ax = plt.subplots(figsize=(8, 6))
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    ax.plot(fpr, tpr, color='#e94560', lw=2.5,
            label=f'Decision Tree (AUC = {auc:.4f})')
    ax.plot([0, 1], [0, 1], color='gray', lw=1, linestyle='--',
            label='Random (AUC = 0.5000)')
    ax.fill_between(fpr, tpr, alpha=0.15, color='#e94560')
    ax.set_xlabel('False Positive Rate', fontsize=12)
    ax.set_ylabel('True Positive Rate (Recall)', fontsize=12)
    ax.set_title('ROC Curve — Decision Tree\n'
                 'SPK Risiko Jantung RSU Aulia',
                 fontsize=13, fontweight='bold')
    ax.legend(loc='lower right', fontsize=11)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    fig.tight_layout()
    roc_img = os.path.join(MODEL_DIR, 'roc_curve.png')
    fig.savefig(roc_img, dpi=150, bbox_inches='tight',
                facecolor='white')
    plt.close(fig)
    print(f"      ROC Curve: {roc_img}")

    # ─── 7. LAPORAN EVALUASI ────────────────────────────────
    print("\n[7/7] Membuat laporan evaluasi...")
    rpt = []
    rpt.append("=" * 65)
    rpt.append("LAPORAN EVALUASI MODEL DECISION TREE")
    rpt.append("SPK Deteksi Dini Risiko Penyakit Jantung — RSU Aulia")
    rpt.append("=" * 65)
    rpt.append("")
    rpt.append("KONFIGURASI MODEL")
    rpt.append("-" * 65)
    rpt.append(f"  Algoritma         : Decision Tree (CART)")
    rpt.append(f"  Criterion         : Entropy (Information Gain)")
    rpt.append(f"  Max Depth         : 7")
    rpt.append(f"  Min Samples Split : 30")
    rpt.append(f"  Min Samples Leaf  : 15")
    rpt.append(f"  Class Weight      : Balanced")
    rpt.append(f"  Splitter          : Best")
    rpt.append(f"  Random State      : {RANDOM_STATE}")
    rpt.append("")
    rpt.append("DATASET")
    rpt.append("-" * 65)
    rpt.append(f"  Total data        : {len(df)}")
    rpt.append(f"  Training set      : {len(X_train)} ({len(X_train)/len(df)*100:.1f}%)")
    rpt.append(f"  Testing set       : {len(X_test)} ({len(X_test)/len(df)*100:.1f}%)")
    rpt.append(f"  Split method      : Stratified random split")
    rpt.append(f"  Fitur             : {FEATURE_COLS}")
    rpt.append(f"  Target            : {TARGET_COL}")
    rpt.append("")
    rpt.append("STRUKTUR POHON")
    rpt.append("-" * 65)
    rpt.append(f"  Kedalaman         : {model.get_depth()}")
    rpt.append(f"  Jumlah leaf nodes : {model.get_n_leaves()}")
    rpt.append(f"  Jumlah total node : {model.tree_.node_count}")
    rpt.append("")
    rpt.append("METRIK EVALUASI (TEST SET)")
    rpt.append("-" * 65)
    rpt.append(f"  Accuracy          : {acc:.4f} ({acc*100:.2f}%)")
    rpt.append(f"  Precision         : {prec:.4f} ({prec*100:.2f}%)")
    rpt.append(f"  Recall            : {rec:.4f} ({rec*100:.2f}%)")
    rpt.append(f"  F1-Score          : {f1:.4f} ({f1*100:.2f}%)")
    rpt.append(f"  ROC-AUC           : {auc:.4f}")
    rpt.append(f"  Specificity       : {specificity:.4f} ({specificity*100:.2f}%)")
    rpt.append("")
    rpt.append("CONFUSION MATRIX")
    rpt.append("-" * 65)
    rpt.append(f"                    Prediksi Tidak  Prediksi Risiko")
    rpt.append(f"  Aktual Tidak   :  TN = {tn:>6,}     FP = {fp:>6,}")
    rpt.append(f"  Aktual Risiko  :  FN = {fn:>6,}     TP = {tp:>6,}")
    rpt.append("")
    rpt.append("CLASSIFICATION REPORT")
    rpt.append("-" * 65)
    rpt.append(classification_report(y_test, y_pred,
               target_names=CLASS_NAMES))
    rpt.append("")
    rpt.append(f"CROSS-VALIDATION ({CV_FOLDS}-FOLD STRATIFIED)")
    rpt.append("-" * 65)
    rpt.append(f"  F1 per fold       : {[f'{s:.4f}' for s in cv_scores]}")
    rpt.append(f"  F1 mean ± std     : {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    rpt.append(f"  Accuracy mean ± std: {cv_acc.mean():.4f} ± {cv_acc.std():.4f}")
    rpt.append("")
    rpt.append("OVERFITTING CHECK")
    rpt.append("-" * 65)
    rpt.append(f"  Training accuracy : {train_acc:.4f}")
    rpt.append(f"  Testing accuracy  : {acc:.4f}")
    rpt.append(f"  Gap               : {abs(train_acc-acc):.4f}")
    rpt.append(f"  Status            : {'OK — Tidak overfitting' if abs(train_acc-acc)<0.05 else 'PERLU DIPERIKSA'}")
    rpt.append("")
    rpt.append("FEATURE IMPORTANCE")
    rpt.append("-" * 65)
    for feat, imp in sorted(zip(FEATURE_COLS, importances),
                            key=lambda x: x[1], reverse=True):
        bar = '#' * int(imp * 40)
        rpt.append(f"  {FEATURE_LABELS[feat]:20s}: {imp:.4f}  {bar}")
    rpt.append("")
    rpt.append("FILE OUTPUT")
    rpt.append("-" * 65)
    rpt.append(f"  Model             : model/decision_tree_model.pkl")
    rpt.append(f"  Aturan keputusan  : model/tree_rules.txt")
    rpt.append(f"  Visualisasi pohon : model/tree_visualization.png")
    rpt.append(f"  Feature importance: model/feature_importance.png")
    rpt.append(f"  Confusion matrix  : model/confusion_matrix.png")
    rpt.append(f"  ROC curve         : model/roc_curve.png")
    rpt.append("")
    rpt.append("=" * 65)
    rpt.append("Training dan evaluasi selesai.")
    rpt.append("Model siap digunakan untuk deployment aplikasi web.")
    rpt.append("=" * 65)

    report_path = os.path.join(MODEL_DIR, 'evaluation_report.txt')
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(rpt))
    print(f"      Laporan: {report_path}")

    # ─── SUMMARY ────────────────────────────────────────────
    print(f"\n{'=' * 65}")
    print(f" TRAINING SELESAI!")
    print(f"   Accuracy   : {acc:.2%}")
    print(f"   Precision  : {prec:.2%}")
    print(f"   Recall     : {rec:.2%}")
    print(f"   F1-Score   : {f1:.2%}")
    print(f"   ROC-AUC    : {auc:.4f}")
    print(f"   Depth      : {model.get_depth()}")
    print(f"   Leaves     : {model.get_n_leaves()}")
    print(f"   Output dir : {MODEL_DIR}")
    print(f"{'=' * 65}")


if __name__ == '__main__':
    main()
