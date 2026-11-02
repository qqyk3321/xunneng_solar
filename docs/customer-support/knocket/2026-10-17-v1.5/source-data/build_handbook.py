from __future__ import annotations

import ast
import hashlib
import json
import math
import re
from pathlib import Path


def arithmetic(expression: str) -> float:
    def visit(node: ast.AST) -> float:
        if isinstance(node, ast.Expression):
            return visit(node.body)
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return float(node.value)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            return visit(node.operand) * (-1 if isinstance(node.op, ast.USub) else 1)
        if isinstance(node, ast.BinOp):
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
            if isinstance(node.op, ast.Mult):
                return left * right
            if isinstance(node.op, ast.Div):
                return left / right
        raise ValueError(f"Unsupported calculation: {expression}")

    return visit(ast.parse(expression, mode="eval"))


def build() -> dict:
    bundle = Path(__file__).resolve().parents[1]
    root = bundle.parent
    source = json.loads((bundle / "source-data/extended-handbook.json").read_text())
    previous = (bundle / "source-data/base-reference.txt").read_text()
    previous_content, previous_sources = previous.split("\nTECHNICAL SOURCE REGISTERS\n", 1)
    previous_content = "PART 1: " + previous_content.split("PART 1: ", 1)[1]
    chapters, glossary, cases = source["chapters"], source["glossary"], source["cases"]
    assert len(chapters) == 20
    assert len(glossary) == 161
    assert len(cases) == 20
    for records in (chapters, glossary, cases):
        assert len({item["id"] for item in records}) == len(records)

    checks = 0
    for case in cases:
        for expression, expected in case["checks"]:
            assert math.isclose(arithmetic(expression), expected, rel_tol=1e-10, abs_tol=1e-10)
            checks += 1

    header = """SOL & TIDE ENERGY — CUSTOMER SOLAR AND HOME STORAGE HANDBOOK
VERSION 1.5 | ASSEMBLED 17 OCTOBER 2026

This single upload contains the company's approved public support information,
149 customer Q&A records, 20 extended topic guides, a 161-term English
glossary and 20 independent hypothetical calculation cases.

Use the company section for identity, service scope, contacts and website routes.
The longer guides explain concepts and customer decision methods. They do not
add company products, certifications, installation commitments or commercial terms.
Company service facts were reviewed on 16 October 2026. Identity wording and
technical education were prepared on 17 October 2026.

All worked-case inputs are invented teaching assumptions, not local tariffs,
company prices, equipment specifications or actual customer performance data.
Referenced manufacturers illustrate concepts, not a Sol & Tide supplier list.
Source notes identify primary factual foundations; the comparisons, planning
frameworks, examples and English explanations are original editorial material.
Use confirmed model documents and the project team for implementation decisions.

CONTENTS
BOOK I — Company support information and the 149-question reference
BOOK II — Twenty extended topic guides
BOOK III — English technical glossary
BOOK IV — Worked calculation cases
BOOK V — Primary source registers

"""
    separator = "=" * 76
    text = header + separator + "\nBOOK I — COMPANY SUPPORT AND CUSTOMER Q&A\n" + separator + "\n\n"
    text += previous_content.rstrip() + "\n\n"
    text += separator + "\nBOOK II — EXTENDED TOPIC GUIDES\n" + separator + "\n\n"
    for chapter in chapters:
        text += chapter["id"] + " — " + chapter["en"] + "\n"
    text += "\n"
    for chapter in chapters:
        text += "-" * 76 + "\n" + chapter["id"] + " — " + chapter["en"] + "\n"
        text += "Related topics: " + chapter["intents"] + "\n\n"
        text += "FOUNDATION\n" + chapter["foundation"] + "\n\n"
        text += "EXPLANATION AND CUSTOMER APPLICATION\n" + "\n\n".join(chapter["body"]) + "\n\n"
        text += "WHAT TO CLARIFY\n" + chapter["check"] + "\n\n"
        text += "SUMMARY\n" + chapter["summary"] + "\n\n"

    text += separator + "\nBOOK III — ENGLISH TECHNICAL GLOSSARY\n" + separator + "\n"
    text += "Definitions explain terms; they are not specifications or installation procedures.\n\n"
    for term in glossary:
        text += f'{term["id"]} — {term["en"]}\n{term["definition"]}\n\n'

    text += separator + "\nBOOK IV — HYPOTHETICAL WORKED CASES\n" + separator + "\n"
    text += "Every input below is an explicit teaching assumption. Do not present an example as a real quotation, local rate, device rating, design, operating instruction or guaranteed outcome.\n\n"
    for case in cases:
        text += f'{case["id"]} — {case["title"]}\n'
        for key, label in [("given", "GIVEN"), ("steps", "CALCULATION"), ("meaning", "INTERPRETATION"), ("limit", "LIMIT OF THIS EXAMPLE"), ("summary", "SUMMARY")]:
            text += label + "\n" + case[key] + "\n\n"

    text += separator + "\nBOOK V — PRIMARY SOURCE REGISTERS\n" + separator + "\n\n"
    text += previous_sources.strip() + "\n\n"
    text += "EXTENDED GUIDE REFERENCES — D01–D17\n"
    text += "Consulted 17 October 2026. These references support the short factual foundations, not local service commitments or the hypothetical numerical inputs. Foreign policy and current product offers are not adopted as company policy.\n\n"
    for key, (title, url) in source["sources"].items():
        text += key + " — " + title + "\n" + url + "\n\n"

    questions = re.findall(r"^Q: ([^\n]+)", text, re.M)
    assert len(questions) == 149
    assert len(re.findall(r"^A: ", text, re.M)) == 149
    assert len(set(questions)) == 149
    assert "Who are you, and how can you help me?" in text
    assert not re.search(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]", text)
    assert "https://wa.me/8617605886812" in text
    assert not any(value in text for value in ["555-0100", "123 Example Street", "Alex M."])
    definitions = set(re.findall(r"^([SBXD]\d+) — ", text, re.M))
    for chapter in chapters:
        for ref in re.findall(r"\bD\d+\b", chapter["foundation"]):
            assert ref in definitions
    assert len(text.encode()) < 10 * 1024 * 1024

    output = bundle / "solortide-knowledge-base-v1.5-english.txt"
    output.write_text(text)
    current = root / "current"
    current.mkdir(exist_ok=True)
    current_file = current / "solortide-knowledge-base.txt"
    current_file.write_text(text)
    assert current_file.read_bytes() == output.read_bytes()

    prompt = (root / "2026-10-17-v1.3/04-system-prompt.txt").read_text()
    prompt = prompt.replace("the education sections", "the guides and glossary")
    assert len(prompt) <= 2000
    (bundle / "04-system-prompt.txt").write_text(prompt)
    faq = (root / "2026-10-17-v1.3/06-priority-faq-10.txt").read_text()
    faq = faq.replace("Version: 1.3", "Version: 1.5")
    (bundle / "06-priority-faq-10.txt").write_text(faq)

    manifest = {
        "version": "1.5",
        "prepared": "2026-10-17",
        "qa_records": len(questions),
        "extended_chapters": len(chapters),
        "glossary_terms": len(glossary),
        "worked_cases": len(cases),
        "validated_arithmetic_checks": checks,
        "source_reference_ids": len(definitions),
        "english_word_tokens": len(re.findall(r"[A-Za-z]+(?:['-][A-Za-z]+)*", text)),
        "chinese_characters": len(re.findall(r"[\u4e00-\u9fff]", text)),
        "bytes": output.stat().st_size,
        "prompt_characters": len(prompt),
        "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
        "upload_file": str(current_file),
        "live_platform_tested": False,
    }
    (bundle / "source-data/manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    return manifest


if __name__ == "__main__":
    print(json.dumps(build(), ensure_ascii=False, indent=2))
