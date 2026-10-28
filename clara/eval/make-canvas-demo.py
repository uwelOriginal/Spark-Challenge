# Generates public/samples/canvas-demo.ics: a SYNTHETIC Canvas calendar feed built from the sample briefs.
# Run: python eval/make-canvas-demo.py
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
briefs = {b["id"]: b for b in json.loads((root / "src/samples/briefs.json").read_text(encoding="utf8"))["briefs"]}


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def fold(line: str) -> str:
    return "\r\n".join(((" " if i else "") + line[i : i + 73]) for i in range(0, len(line), 73))


events = [
    ("event-assignment-90101", "Actividad integradora 2: Ensayo de reflexión crítica [ETI1001]", "20261113T235900", briefs["etica_v1"]["text"]),
    ("event-assignment-90102", "Práctica 4: Circuitos RC [F2003B]", "20261118T070000", briefs["fisica_lab"]["text"]),
    ("event-assignment-90103", "Proyecto integrador [EMP1002]", "20261127T235900", briefs["emprendimiento_equipo"]["text"]),
]
lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Clara//Canvas feed DEMO (synthetic)//ES",
    "X-WR-CALNAME:Calendario de Canvas (demo sintético)",
]
for uid, title, start, desc in events:
    lines += [
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTART:{start}",
        f"DTEND:{start}",
        fold("SUMMARY:" + esc(title)),
        fold("DESCRIPTION:" + esc(desc)),
        "URL:https://canvas.example/courses/demo",
        "END:VEVENT",
    ]
lines.append("END:VCALENDAR")
out = root / "public/samples/canvas-demo.ics"
out.write_text("\r\n".join(lines), encoding="utf8", newline="")
print("wrote", out, len(events), "events")
