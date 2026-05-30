"""API smoke tests — verify server boots and key endpoints respond correctly."""

from datetime import datetime, timedelta

from app.models.production import MonitoringAggregateSnapshot, ReportJob


def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"


def test_health_live_ok(client):
    r = client.get("/api/health/live")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_health_ready_ok(client):
    r = client.get("/api/health/ready")
    assert r.status_code == 200
    assert "dependencies" in r.json()


def test_health_dependencies_ok(client):
    r = client.get("/api/health/dependencies")
    assert r.status_code == 200
    body = r.json()
    assert "database" in body
    assert "runtime_provider" in body


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


def test_overview_summary_ok(client):
    login_r = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_r.json()["access_token"]
    r = client.get("/api/overview/summary", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert "auto_control_rate" in body
    assert "prev_hour_kpi" in body
    assert "detail_table" in body
    assert body["runtime_provider"]["configured_source"] in {"mock", "real", "auto-demo"}
    assert body["runtime_provider"]["effective_source"] in {"mock", "tdengine"}


def test_runtime_source_status_ok(client):
    r = client.get("/api/production/runtime-source")
    assert r.status_code == 200
    body = r.json()
    assert body["configured_source"] in {"mock", "real", "auto-demo"}
    assert body["effective_source"] in {"mock", "tdengine"}
    assert "served_loop_count" in body


def test_runtime_source_update_ok(client):
    r = client.put("/api/production/runtime-source", json={"source": "mock"})
    assert r.status_code == 200
    assert r.json()["configured_source"] == "mock"


def test_list_loops(client):
    r = client.get("/api/config/loops")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "tag_name" in data[0]
    assert "loop_category" in data[0]
    assert "loop_weight" in data[0]


def test_get_loop_404(client):
    r = client.get("/api/config/loops/NONEXIST")
    assert r.status_code == 404


def test_list_groups(client):
    client.post("/api/config/groups", json={"name": "列表分组", "unit": "测试装置", "weight": 1})
    r = client.get("/api/config/groups")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "name" in data[0]
    assert "unit" in data[0]
    assert "weight" in data[0]


def test_create_and_delete_group(client):
    payload = {"name": "测试分组", "unit": "测试装置", "description": "smoke", "weight": 2}
    r = client.post("/api/config/groups", json=payload)
    assert r.status_code == 200
    group = r.json()
    assert group["name"] == "测试分组"

    r2 = client.delete(f"/api/config/groups/{group['id']}")
    assert r2.status_code == 204


def test_group_delete_blocked_when_loop_attached(client):
    group_r = client.post("/api/config/groups", json={"name": "阻塞分组", "unit": "测试装置", "weight": 1})
    group_id = group_r.json()["id"]

    loop_payload = {
        "tag_name": "TEST-BLOCK-001",
        "unit": "测试装置",
        "loop_type": "FLOW",
        "loop_category": "快速型",
        "loop_weight": 2,
        "loop_group_id": group_id,
        "description": "smoke",
        "pv_tag": "T.PV",
        "sp_tag": "T.SP",
        "op_tag": "T.OP",
        "eng_unit": "t/h",
        "sample_interval": 1,
    }
    loop_r = client.post("/api/config/loops", json=loop_payload)
    assert loop_r.status_code == 201

    delete_r = client.delete(f"/api/config/groups/{group_id}")
    assert delete_r.status_code == 409


def test_loop_detail_contains_assessment_and_diagnosis_metrics(client):
    r = client.get("/api/loop/FIC-10023/detail")
    assert r.status_code == 200
    body = r.json()
    assessment = body["assessment"]
    diagnosis = body["diagnosis"]

    assert "accuracy_rate" in assessment
    assert "fast_rate" in assessment
    assert "effective_auto_rate" in assessment
    assert "settling_time" in diagnosis
    assert "travel_index" in diagnosis
    assert "good_rate" in diagnosis


def test_tuning_pipeline_returns_results(client):
    response = client.post(
        "/api/loop/FIC-10023/tuning",
        json={"tag_name": "FIC-10023", "method": "imc", "desired_tau": None},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["identification"]["tag_name"] == "FIC-10023"
    assert body["pid_params"]["method"].lower() == "imc"
    assert isinstance(body["simulation_result"]["confidence_score"], float)
    assert len(body["step_response"]["time"]) > 0


def test_monitoring_history_reads_persisted_aggregates(client, db_session):
    base = datetime(2026, 5, 1, 0, 0, 0)
    for idx in range(24):
        db_session.add(
            MonitoringAggregateSnapshot(
                snapshot_id=f"monitoring_test_{idx}",
                scope_type="global",
                scope_ref="all",
                dimension="hour",
                bucket_label=f"{idx:02d}:00",
                bucket_start=base + timedelta(hours=idx),
                bucket_end=base + timedelta(hours=idx + 1),
                avg_performance_score=80 + idx,
                avg_auto_control_rate=70 + idx,
                avg_stability_rate=60 + idx,
                data_completeness=0.95,
                confidence=0.88,
                trusted=idx % 2 == 0,
                trust_reason="historian backfill",
                metrics_json={"source": "test"},
            )
        )
    db_session.commit()

    response = client.get("/api/monitoring/history?dimension=hour")
    assert response.status_code == 200
    body = response.json()
    assert body["dimension"] == "hour"
    assert body["trust"]["persisted"] is True
    assert body["trust"]["source"] == "postgresql.monitoring_aggregate_snapshots"
    assert len(body["points"]) == 24
    assert body["points"][0]["label"] == "00:00"
    assert body["points"][0]["avg_performance_score"] == 80.0
    assert body["points"][0]["trust"]["trusted"] is True
    assert body["points"][1]["trust"]["trusted"] is False
    assert body["points"][0]["trust"]["reason"] == "historian backfill"


def test_loop_report_response_headers(client, auth_headers):
    r = client.get("/api/reports/loop/FIC-10023", headers=auth_headers)
    assert r.status_code == 200
    assert r.headers["content-disposition"].startswith("attachment;")
    assert r.headers["x-report-format"] in {"pdf", "html"}
    if r.headers["x-report-format"] == "pdf":
        assert r.headers["content-type"] == "application/pdf"
    else:
        assert r.headers["content-type"].startswith("text/html")


def test_report_loop_failure_persists_taxonomy(client, auth_headers, db_session, monkeypatch):
    from app.routers import reports as reports_router

    def boom(*args, **kwargs):
        raise RuntimeError("renderer offline")

    monkeypatch.setattr(reports_router, "generate_loop_report", boom)

    response = client.get("/api/reports/loop/FIC-10023", headers=auth_headers)
    assert response.status_code == 500
    detail = response.json()["detail"]
    assert detail["code"] == "report_render_failed"
    assert detail["message"] == "Report rendering failed"
    assert detail["detail"] == "renderer offline"

    row = db_session.query(ReportJob).order_by(ReportJob.created_at.desc()).first()
    assert row is not None
    assert row.status == "failed"
    assert row.failure_code == "report_render_failed"
    assert row.failure_detail == "renderer offline"
    assert row.job_id == detail["job_id"]


def test_report_batch_missing_unit_persists_taxonomy(client, auth_headers, db_session):
    response = client.get(
        "/api/reports/batch?unit=%E4%B8%8D%E5%AD%98%E5%9C%A8&period=%E6%97%A5%E6%8A%A5",
        headers=auth_headers,
    )
    assert response.status_code == 404
    detail = response.json()["detail"]
    assert detail["code"] == "unit_not_found"
    assert detail["message"] == "No loops found for requested unit"

    row = db_session.query(ReportJob).order_by(ReportJob.created_at.desc()).first()
    assert row is not None
    assert row.status == "failed"
    assert row.failure_code == "unit_not_found"
    assert "No loops found for unit" in row.failure_detail


def test_batch_report_response_headers(client, auth_headers):
    r = client.get(
        "/api/reports/batch?unit=%E5%85%A8%E5%8E%82&period=%E6%97%A5%E6%8A%A5",
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.headers["content-disposition"].startswith("attachment;")
    assert r.headers["x-report-format"] in {"pdf", "html"}


    payload = {
        "tag_name": "TEST-001",
        "unit": "测试装置",
        "loop_type": "FLOW",
        "loop_category": "快速型",
        "loop_weight": 2,
        "description": "smoke",
        "pv_tag": "T.PV",
        "sp_tag": "T.SP",
        "op_tag": "T.OP",
        "eng_unit": "t/h",
        "sample_interval": 1,
    }
    r = client.post("/api/config/loops", json=payload)
    assert r.status_code == 201
    body = r.json()
    assert body["loop_category"] == "快速型"
    assert body["loop_weight"] == 2

    r2 = client.get("/api/config/loops/TEST-001")
    assert r2.status_code == 200
    assert r2.json()["tag_name"] == "TEST-001"
    r3 = client.delete("/api/config/loops/TEST-001")
    assert r3.status_code == 204
    r4 = client.get("/api/config/loops/TEST-001")
    assert r4.status_code == 404
