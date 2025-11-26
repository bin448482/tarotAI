import json
from pathlib import Path

def main():
    output_path = Path("tarot-ai-generator/output/card_interpretation_dimensions_dimension_健康-身体状况-如何改善.json")
    # 使用平台无关的 Path 组合，避免反斜杠引起的转义问题
    cards_path = Path("my-tarot-app") / "assets" / "data" / "card_interpretations.json"

    if not output_path.exists():
        print(f"[ERROR] Output file not found: {output_path}")
        return
    if not cards_path.exists():
        print(f"[ERROR] Card interpretations file not found: {cards_path}")
        return

    with open(output_path, "r", encoding="utf-8") as f:
        output_data = json.load(f)

    with open(cards_path, "r", encoding="utf-8") as f:
        cards_data = json.load(f)

    # Expected (card_name, direction) pairs for all 156 cards
    expected_pairs = {(c["card_name"], c["direction"]) for c in cards_data["data"]}
    generated_pairs = {(c["card_name"], c["direction"]) for c in output_data["data"]}

    missing = expected_pairs - generated_pairs
    extra = generated_pairs - expected_pairs

    print(f"Total expected cards: {len(expected_pairs)}")
    print(f"Total generated cards: {len(generated_pairs)}")
    print(f"Missing count: {len(missing)}")
    print(f"Extra count: {len(extra)}")

    if missing:
        print("\nMissing cards:")
        for card_name, direction in sorted(missing):
            print(f"  {card_name} ({direction})")

    if extra:
        print("\nExtra cards (unexpected):")
        for card_name, direction in sorted(extra):
            print(f"  {card_name} ({direction})")

    if len(missing) == 0 and len(extra) == 0:
        print("\n[PASS] All cards and directions match exactly (156 records).")

if __name__ == "__main__":
    main()