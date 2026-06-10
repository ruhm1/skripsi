"""Export Decision Tree model to JavaScript for client-side prediction."""
import pickle
import json
import os
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'model', 'decision_tree_model.pkl')
OUTPUT_PATH = os.path.join(BASE_DIR, 'frontend', 'js', 'model.js')

with open(MODEL_PATH, 'rb') as f:
    data = pickle.load(f)

model = data['model']
tree = model.tree_

def tree_to_dict(node_id=0):
    if tree.children_left[node_id] == -1:  # leaf
        values = tree.value[node_id][0]
        total = values.sum()
        proba = [round(float(v / total), 4) for v in values]
        return {'leaf': True, 'class': int(np.argmax(values)), 'proba': proba}
    
    feature = int(tree.feature[node_id])
    threshold = round(float(tree.threshold[node_id]), 4)
    return {
        'feature': feature,
        'threshold': threshold,
        'left': tree_to_dict(int(tree.children_left[node_id])),
        'right': tree_to_dict(int(tree.children_right[node_id]))
    }

tree_dict = tree_to_dict()

# Convert numpy types to native Python
meta = {}
for k, v in data['metadata'].items():
    if hasattr(v, 'item'):
        meta[k] = v.item()
    else:
        meta[k] = v

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

js_code = f"""// Auto-generated Decision Tree model for client-side prediction
// SPK Deteksi Dini Risiko Penyakit Jantung — RSU Aulia
const FEATURE_NAMES = {json.dumps(data['feature_cols'])};
const CLASS_NAMES = {json.dumps(data['class_names'])};
const MODEL_META = {json.dumps(meta, indent=2)};

const TREE = {json.dumps(tree_dict)};

function predict(features) {{
    // features: [usia, gender, keluhanawal_sesak_dada, bmi, sistolik, diastolik]
    let node = TREE;
    const path = [];
    while (!node.leaf) {{
        const val = features[node.feature];
        const fname = FEATURE_NAMES[node.feature];
        const thresh = node.threshold;
        if (val <= thresh) {{
            path.push({{ feature: fname, value: val, threshold: thresh, direction: 'left', condition: val.toFixed(2) + ' <= ' + thresh.toFixed(2) }});
            node = node.left;
        }} else {{
            path.push({{ feature: fname, value: val, threshold: thresh, direction: 'right', condition: val.toFixed(2) + ' > ' + thresh.toFixed(2) }});
            node = node.right;
        }}
    }}
    return {{
        prediction: node.class,
        label: CLASS_NAMES[node.class],
        probability: node.proba,
        confidence: Math.max(...node.proba),
        path: path
    }};
}}
"""

with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    f.write(js_code)

print(f"Model exported to {OUTPUT_PATH}")
print(f"Tree nodes: {tree.node_count}")
print(f"JS file size: {os.path.getsize(OUTPUT_PATH)/1024:.1f} KB")
