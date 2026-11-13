from fastapi import FastAPI
from pydantic import BaseModel
import re

app = FastAPI(title="Flood Relief Validation Service")

ZONE_RE = re.compile(r"^ZN[A-Z]{3}[0-9]{3}$")
RESOURCE_RE = re.compile(r"^RES[EMSRF W][0-9]{2}$".replace(" ", ""))

class ValidationInput(BaseModel):
    zone_code: str
    resource_code: str

def zone_dfa(value: str) -> bool:
    """DFA: q0-Z->q1, N->q2, 3 letters->q5, 3 digits->accept."""
    states = ["q0"]
    state = "q0"
    for ch in value:
        if state == "q0" and ch == "Z": state = "q1"
        elif state == "q1" and ch == "N": state = "q2"
        elif state == "q2" and ch.isalpha() and ch.isupper(): state = "q3"
        elif state == "q3" and ch.isalpha() and ch.isupper(): state = "q4"
        elif state == "q4" and ch.isalpha() and ch.isupper(): state = "q5"
        elif state == "q5" and ch.isdigit(): state = "q6"
        elif state == "q6" and ch.isdigit(): state = "q7"
        elif state == "q7" and ch.isdigit(): state = "q8"
        else: return False
    return state == "q8"

def resource_dfa(value: str) -> bool:
    """DFA for RES + one of F/M/S/R/W + exactly two digits."""
    if len(value) != 6 or value[:3] != "RES":
        return False
    if value[3] not in "FMSRW":
        return False
    state = 0
    for ch in value[4:]:
        if state == 0 and ch.isdigit(): state = 1
        elif state == 1 and ch.isdigit(): state = 2
        else: return False
    return state == 2

@app.get("/health")
def health():
    return {"status": "ok", "service": "python-validator"}

@app.post("/validate")
def validate(data: ValidationInput):
    zone_dfa_ok = zone_dfa(data.zone_code)
    zone_regex_ok = bool(ZONE_RE.fullmatch(data.zone_code))
    resource_dfa_ok = resource_dfa(data.resource_code)
    resource_regex_ok = bool(RESOURCE_RE.fullmatch(data.resource_code))
    return {
        "valid": zone_dfa_ok and zone_regex_ok and resource_dfa_ok and resource_regex_ok,
        "zone": {"dfa": zone_dfa_ok, "regex": zone_regex_ok, "agreement": zone_dfa_ok == zone_regex_ok},
        "resource": {"dfa": resource_dfa_ok, "regex": resource_regex_ok, "agreement": resource_dfa_ok == resource_regex_ok},
        "messages": [
            message for ok, message in [
                (zone_dfa_ok and zone_regex_ok, "Zone code must match ZN + 3 uppercase letters + 3 digits."),
                (resource_dfa_ok and resource_regex_ok, "Resource code must match RES + F/M/S/R/W + 2 digits.")
            ] if not ok
        ]
    }
