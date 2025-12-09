import json
import os

SNAPSHOT_DIR = os.path.join(os.path.dirname(__file__), "../regression/snapshots")


def load_snapshot(name):
    path = os.path.join(SNAPSHOT_DIR, f"{name}.json")
    if not os.path.exists(path):
        raise AssertionError(f"Snapshot {name}.json not found")
    with open(path, "r") as f:
        return json.load(f)


def save_snapshot(name, data):
    path = os.path.join(SNAPSHOT_DIR, f"{name}.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def assert_snapshot_equal(name, new_data):
    old = load_snapshot(name)
    if old != new_data:
        raise AssertionError(
            f"Snapshot mismatch for {name}.json\n\nExpected:\n{old}\n\nGot:\n{new_data}"
        )

