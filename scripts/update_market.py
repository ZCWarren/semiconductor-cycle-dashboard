"""Fetch monthly adjusted closes from Yahoo Finance and update src/market.json."""

from __future__ import annotations

import datetime as dt
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src" / "market.json"
TICKERS = {
    "^SOX": ("费城半导体指数", "点", ""),
    "NVDA": ("英伟达", "美元", "global"),
    "TSM": ("台积电 ADR", "美元", "global"),
    "ASML": ("阿斯麦 ADR", "美元", "global"),
    "MU": ("美光科技", "美元", "global"),
    "688981.SS": ("中芯国际", "元", "china"),
    "002371.SZ": ("北方华创", "元", "china"),
    "603501.SS": ("韦尔股份", "元", "china"),
    "688041.SS": ("海光信息", "元", "china"),
}
CHINA_KEYS = ["688981.SS", "002371.SZ", "603501.SS", "688041.SS"]


def fetch_series(ticker: str) -> list[tuple[str, float]]:
    now = dt.datetime.now(dt.timezone.utc)
    period1 = int((now - dt.timedelta(days=400)).timestamp())
    query = urllib.parse.urlencode({
        "period1": period1,
        "period2": int(now.timestamp()) + 86400,
        "interval": "1mo",
        "events": "history",
    })
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(ticker)}?{query}"
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.load(response)
            break
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)

    result = payload["chart"]["result"][0]
    timestamps = result["timestamp"]
    quotes = result["indicators"]["quote"][0]["close"]
    adjusted = result["indicators"].get("adjclose", [{}])[0].get("adjclose", quotes)
    rows_by_month = {}
    for timestamp, close, adjusted_close in zip(timestamps, quotes, adjusted):
        price = adjusted_close if adjusted_close is not None else close
        if price is None or price <= 0:
            continue
        date = dt.datetime.fromtimestamp(timestamp, dt.timezone.utc)
        rows_by_month[date.strftime("%y/%m")] = float(price)
    rows = list(rows_by_month.items())
    if len(rows) < 12:
        raise ValueError(f"{ticker}: expected at least 12 monthly observations, got {len(rows)}")
    return rows[-12:]


def main() -> None:
    raw = {ticker: fetch_series(ticker) for ticker in TICKERS}
    months = [month for month, _ in raw["^SOX"]]
    for ticker, rows in raw.items():
        if [month for month, _ in rows] != months:
            raise ValueError(f"{ticker}: monthly dates do not align with ^SOX")

    series = {}
    quotes = []
    for ticker, (name, currency, market) in TICKERS.items():
        closes = [price for _, price in raw[ticker]]
        base = closes[0]
        series[ticker] = [round(price / base * 100, 1) for price in closes]
        quotes.append({
            "ticker": ticker, "name": name, "currency": currency, "market": market,
            "price": round(closes[-1], 2),
            "change": round((closes[-1] / base - 1) * 100, 1),
        })

    points = []
    for index, month in enumerate(months):
        point = {
            "month": month,
            "global": series["^SOX"][index],
            "china": round(sum(series[key][index] for key in CHINA_KEYS) / len(CHINA_KEYS), 1),
        }
        for ticker in TICKERS:
            if ticker != "^SOX":
                point[ticker] = series[ticker][index]
        points.append(point)

    today = dt.datetime.now(dt.timezone.utc).astimezone(dt.timezone(dt.timedelta(hours=8)))
    output = {
        "updatedAt": today.strftime("%Y.%m.%d"),
        "researchUpdatedAt": "2026.11.04",
        "points": points,
        "quotes": quotes,
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {OUTPUT} through {months[-1]} ({len(points)} monthly points).")


if __name__ == "__main__":
    main()
