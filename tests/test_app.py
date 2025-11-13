import copy

import pytest
from fastapi.testclient import TestClient

import src.app as app_module


@pytest.fixture(scope="function")
def client():
    # snapshot activities and restore after each test to keep tests isolated
    original = copy.deepcopy(app_module.activities)
    client = TestClient(app_module.app)
    yield client
    app_module.activities.clear()
    app_module.activities.update(copy.deepcopy(original))


def test_get_activities(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister_flow(client):
    email = "pytestuser@mergington.edu"

    # signup
    resp = client.post("/activities/Chess%20Club/signup", params={"email": email})
    assert resp.status_code == 200
    body = resp.json()
    assert "Signed up" in body.get("message", "")

    # ensure participant is present
    resp = client.get("/activities")
    participants = resp.json()["Chess Club"]["participants"]
    assert email in participants

    # duplicate signup should fail
    resp_dup = client.post("/activities/Chess%20Club/signup", params={"email": email})
    assert resp_dup.status_code == 400

    # unregister
    resp_un = client.post("/activities/Chess%20Club/unregister", params={"email": email})
    assert resp_un.status_code == 200
    resp = client.get("/activities")
    participants = resp.json()["Chess Club"]["participants"]
    assert email not in participants


def test_unregister_not_signed(client):
    email = "notregistered@mergington.edu"
    resp = client.post("/activities/Chess%20Club/unregister", params={"email": email})
    assert resp.status_code == 400
