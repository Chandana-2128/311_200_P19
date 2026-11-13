# Flood Relief Coordination Portal

A full-stack academic project implementing the requested BCS503 Automata Theory and BCS502 Computer Networks concepts.

## Run the complete application

### One-time requirement
Install and open **Docker Desktop**. Keep it running.

### Start
Open a terminal in this project folder and run:

```bash
docker compose up --build
```

Then open:

- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/api/health
- Python validator: http://localhost:8000/health

To stop: press `Ctrl+C`, then run `docker compose down`.
To stop and delete the local database volume too: `docker compose down -v`.

## Included modules

- React report submission page and dashboards
- Express REST API
- Python DFA + equivalent regex validation
- Exactly five report categories: Immediate, Urgent, Moderate, Stable, Resolved
- Explicit routing table and dispatch algorithm
- Handler availability, capacity, backup assignment, emergency-priority queue ordering and automatic queued-report reassignment when capacity becomes available
- MongoDB persistence
- 15 automated backend tests

## Example identifiers

- Zone: `ZNCHI123` (district code `CHI`, three digits)
- Resource: `RESF01`, `RESM02`, `RESS03`, `RESR04`, `RESW05`
- Resource types: F=Food, M=Medical, S=Shelter, R=Rescue, W=Water

The assignment sheet's resource-code example is visually ambiguous. This project uses `RES` + one resource letter + two digits consistently in both DFA and regex. Update both validators together if your faculty specifies a different exact format.

## Demo workflow

1. Submit a request from the home page.
2. Open Reports to inspect validation, category, route and assignment.
3. Open Handler Dashboard to update a report status.
4. Open Routing Dashboard to inspect handler availability and routing.
5. Open Analytics to view report counts.
6. Try an invalid zone such as `ZNCHI12` to see validation rejection.

## Academic note

This is a demonstrable prototype, not a production emergency-response system. It does not contact real rescue services, verify identities, or provide real-world emergency dispatch. Use mock data for academic demonstrations.
