from app import app


def test_health():
    client = app.test_client()

    response = client.get("/api/health")

    assert response.status_code == 200

    data = response.get_json()

    assert data["status"] == "ok"
    assert data["service"] == "devopshub-backend"
    assert data["version"] == "2.0"