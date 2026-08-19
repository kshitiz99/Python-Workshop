import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import app  # noqa: E402


@pytest.fixture
def client():
    app.config.update(TESTING=True)
    with app.test_client() as test_client:
        yield test_client


def test_index_returns_200(client):
    response = client.get("/")
    assert response.status_code == 200


def test_index_renders_html(client):
    response = client.get("/")
    assert response.content_type.startswith("text/html")


def test_index_contains_timer_elements(client):
    response = client.get("/")
    body = response.get_data(as_text=True)
    assert 'id="time-left"' in body
    assert 'id="start-btn"' in body
    assert 'id="reset-btn"' in body


def test_static_timer_js_is_served(client):
    response = client.get("/static/js/timer.js")
    assert response.status_code == 200


def test_static_timer_logic_js_is_served(client):
    response = client.get("/static/js/timerLogic.js")
    assert response.status_code == 200


def test_unknown_route_returns_404(client):
    response = client.get("/does-not-exist")
    assert response.status_code == 404
