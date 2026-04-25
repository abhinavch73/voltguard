import React, { useState } from "react";
import "./App.css";
import axios from "axios";

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement
} from "chart.js";

import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

const API_URL = "https://voltguard-q91c.onrender.com";

function App() {

  // ✅ KEEP INPUTS AS STRINGS (IMPORTANT)
  const [input, setInput] = useState({
    cycles: "300",
    voltage: "3.7",
    current: "2",
    temp: "30"
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ FIXED INPUT HANDLER
  const handleChange = (e) => {
    setInput({
      ...input,
      [e.target.name]: e.target.value
    });
  };

  // ✅ MAIN ANALYSIS FUNCTION
  const runAnalysis = async () => {

    // 🔒 Convert safely
    const payload = {
      cycles: parseFloat(input.cycles),
      voltage: parseFloat(input.voltage),
      current: parseFloat(input.current),
      temp: parseFloat(input.temp)
    };

    // 🚨 VALIDATION
    if (
      isNaN(payload.cycles) ||
      isNaN(payload.voltage) ||
      isNaN(payload.current) ||
      isNaN(payload.temp)
    ) {
      alert("Please enter valid numeric values");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/predict`, payload);

      if (res.data.error) {
        alert(res.data.error);
        setLoading(false);
        return;
      }

      setResult(res.data);

    

    } catch {
      alert("Backend connection error");
    }

    setLoading(false);
  };

  // ✅ SAFE CHART DATA
  const chartData = {
    labels: [0, 200, 400, 600, 800, 1000],
    datasets: [
      {
        label: "SOH (%)",
        data: result
          ? [
              95,
              92,
              88,
              83,
              Math.max(result.soh, 0),
              Math.max(result.soh - 5, 0)
            ]
          : [95, 90, 85, 80, 75, 70],
        borderColor: "#38bdf8",
        tension: 0.4
      }
    ]
  };

  return (
    <div className="app">

      {/* HEADER */}
      <div className="header">
        ⚡ VoltGuard AI System
        <div>
          <span className="online-dot"></span> Online
        </div>
      </div>

      {/* INPUT SECTION */}
      <div className="section">
        <h2>Input Parameters</h2>

        <div className="input-grid">

          <div className="card blue">
            <h3>Cycles</h3>
            <input
              name="cycles"
              type="number"
              step="1"
              value={input.cycles}
              onChange={handleChange}
            />
          </div>

          <div className="card green">
            <h3>Voltage</h3>
            <input
              name="voltage"
              type="number"
              step="0.01"
              value={input.voltage}
              onChange={handleChange}
            />
          </div>

          <div className="card yellow">
            <h3>Current</h3>
            <input
              name="current"
              type="number"
              step="0.01"
              value={input.current}
              onChange={handleChange}
            />
          </div>

          <div className="card red">
            <h3>Temperature</h3>
            <input
              name="temp"
              type="number"
              step="0.1"
              value={input.temp}
              onChange={handleChange}
            />
          </div>

        </div>

        <button className="run-btn" onClick={runAnalysis}>
          ▶ Run Analysis
        </button>
      </div>

      {/* LOADING */}
      {loading && <div className="loader">Analyzing...</div>}

      {/* OUTPUT */}
      {result && !loading && (
        <div className="section fade-in">

          <h2>System Output</h2>

          <div className="output-grid">

            {/* METRICS */}
            <div className="metrics">

              {/* SOH */}
              <div className="box">
                <h4>SOH (%)</h4>

                <div className="custom-gauge">
                  <div
                    className="gauge-fill"
                    style={{ width: `${result.soh}%` }}
                  ></div>
                </div>

                <p className="gauge-text">{result.soh}%</p>
              </div>

              {/* RUL */}
              <div className="box">
                <h4>RUL</h4>

                <div className="custom-gauge blue">
                  <div
                    className="gauge-fill"
                    style={{ width: `${(result.rul / 2000) * 100}%` }}
                  ></div>
                </div>

                <p className="gauge-text">{result.rul} cycles</p>
              </div>

            </div>

            {/* CHART */}
            <div className="chart">
              <h4>Degradation Curve</h4>
              <Line data={chartData}/>
            </div>

            {/* STATUS */}
            <div className="status">

              <h4>Status</h4>

              <div className={`status-box ${result.status} ${
                result.status === "critical" ? "blink" : ""
              }`}>
                {result.status.toUpperCase()}
              </div>

              <h4>Recommendation</h4>
              <p>{result.recommendation}</p>

              <h4>Alerts</h4>

              {result.alerts.length > 0 ? (
                result.alerts.map((a, i) => (
                  <p key={i} className="alert-text">{a}</p>
                ))
              ) : (
                <p className="safe-text">No active alerts</p>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
