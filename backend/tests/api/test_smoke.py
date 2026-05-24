"""API smoke tests — verify server boots and key endpoints respond correctly."""


def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"


def test_login_ok(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["username"] == "admin"


def test_login_bad_password(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert r.status_code == 401


def test_me_requires_token(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_ok(client):
    login_r = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_r.json()["access_token"]
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["username"] == "admin"


def test_list_loops(client):
    r = client.get("/api/config/loops")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "tag_name" in data[0]


def test_get_loop_404(client):
    r = client.get("/api/config/loops/NONEXIST")
    assert r.status_code == 404


def test_create_and_delete_loop(client):
    payload = {"tag_name": "TEST-001", "unit": "测试装置", "loop_type": "FLOW",
               "description": "smoke", "pv_tag": "T.PV", "sp_tag": "T.SP",
               "op_tag": "T.OP", "eng_unit": "t/h", "sample_interval": 1}
    r = client.post("/api/config/loops", json=payload)
    assert r.status_code == 201
    r2 = client.get("/api/config/loops/TEST-001")
    assert r2.status_code == 200
    assert r2.json()["tag_name"] == "TEST-001"
    r3 = client.delete("/api/config/loops/TEST-001")
    assert r3.status_code == 204
    r4 = client.get("/api/config/loops/TEST-001")
    assert r4.status_code == 404
