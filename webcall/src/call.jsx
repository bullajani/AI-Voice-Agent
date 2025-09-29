// src/CallPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import "./call.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function CallPage() {
  const clientRef = useRef(null);
  const callSidRef = useRef(null);
  const transcriptContainerRef = useRef(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [transcript, setTranscript] = useState([]); // { id, text, role }
  const [callInProgress, setCallInProgress] = useState(false);
  
  // Input form state
  const [inputDriverName, setInputDriverName] = useState("John Miller");
  const [inputLoadNumber, setInputLoadNumber] = useState("LOAD123");
  const [inputPhoneNumber, setInputPhoneNumber] = useState("+15551234567");
  
  const [callInfo, setCallInfo] = useState({
    driverName: "",
    loadNumber: "",
    phoneNumber: "",
    startTime: null,
    endTime: null,
    duration: null,
  });

  // Elapsed time timer
  useEffect(() => {
    let interval;
    if (callInProgress && callInfo.startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((new Date() - new Date(callInfo.startTime)) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [callInProgress, callInfo.startTime]);

  // ✅ Setup Retell client
  useEffect(() => {
    const client = new RetellWebClient();
    clientRef.current = client;

    // ✅ ONLY listen to final transcripts to avoid duplicates
    client.on("update", (update) => {
      console.log("UPDATE event:", update);
      if (update.transcript && Array.isArray(update.transcript)) {
        // Clear existing transcript and rebuild with final version
        const finalTranscript = update.transcript.map(t => ({
          text: t.content || t.text || "",
          role: t.role || "agent",
          id: `${t.role}_${Date.now()}_${Math.random()}`
        })).filter(t => t.text.trim());
        
        setTranscript(finalTranscript);
        
        // Auto-scroll to bottom when new message arrives
        setTimeout(() => {
          if (transcriptContainerRef.current) {
            transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
          }
        }, 100);
        
        // Save final transcript to backend
        const currentCallSid = callSidRef.current;
        if (currentCallSid && finalTranscript.length > 0) {
          const lastEntry = finalTranscript[finalTranscript.length - 1];
          fetch(`${API_URL}/api/save-transcript`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              callSid: currentCallSid, 
              text: lastEntry.text, 
              role: lastEntry.role 
            }),
          }).catch(err => console.error("save-transcript failed", err));
        }
      }
    });

    client.on("call_started", () => {
      console.log("call_started event");
      setCallInProgress(true);
    });

    client.on("call_ended", async () => {
      console.log("call_ended event");
      setCallInProgress(false);
      // Don't reload transcript here - let endCall() handle it to avoid duplicates
    });

    client.on("error", (e) => {
      console.error("Retell client error:", e);
      try {
        client.stopCall();
      } catch {}
      setCallInProgress(false);
    });

    return () => {
      try {
        client.stopCall();
      } catch {}
    };
  }, []);

  // ✅ Start call
  const startCall = async () => {
    // Use input values from the form
    const driverName = inputDriverName.trim() || "John Miller";
    const phoneNumber = inputPhoneNumber.trim() || "+15551234567";
    const loadNumber = inputLoadNumber.trim() || "LOAD123";
    setTranscript([]);
    setCallInfo((p) => ({
      ...p,
      driverName,
      loadNumber,
      phoneNumber,
      startTime: new Date(),
      endTime: null,
      duration: null,
    }));

    try {
      console.log('🚀 Starting call with:', { driverName, phoneNumber, loadNumber });
      
      const resp = await fetch(`${API_URL}/api/create-web-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Let backend use RETELL_AGENT_ID from environment
          driverName,
          phoneNumber,
          loadNumber,
        }),
      });
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error("create-web-call failed: " + resp.status + " " + body);
      }
      const data = await resp.json();
      console.log('✅ Call created in DB with ID:', data.callSid);
      callSidRef.current = data.callSid;

      await clientRef.current.startCall({
        accessToken: data.access_token,
        sampleRate: 24000,
        emitRawAudioSamples: false,
      });

      setCallInProgress(true);
    } catch (err) {
      console.error("startCall error", err);
      setCallInProgress(false);
      alert("Start call failed: " + (err.message || err));
    }
  };

  // ✅ End call
  const endCall = async () => {
    const sid = callSidRef.current;
    try {
      if (clientRef.current) await clientRef.current.stopCall();
    } catch (e) {
      console.warn("stopCall error", e);
    }
    setCallInProgress(false);

    if (!sid) return;
    try {
      const res = await fetch(`${API_URL}/api/end-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callSid: sid }),
      });
      if (!res.ok) throw new Error("end-call failed: " + res.status);
      const data = await res.json();
      
      // Only update call info, keep existing transcript to avoid duplicates
      setCallInfo({
        driverName: data.call.driverName,
        loadNumber: data.call.loadNumber,
        phoneNumber: data.call.phoneNumber,
        startTime: data.call.createdAt ? new Date(data.call.createdAt) : null,
        endTime: data.call.endedAt ? new Date(data.call.endedAt) : null,
        duration: data.call.duration ?? null,
      });

      console.log("Call ended successfully, transcript preserved");
    } catch (err) {
      console.error("endCall error", err);
    }
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(callInfo.phoneNumber);
    // Optional: show toast or something
  };

  return (
    <div className="call-container">
      <div className="call-details">
        <div className="header">
          <span className="icon">☎️</span>
          Call Details
        </div>
        <div className="fields">
          <div className="field">
            <label>
              <span className="icon">👤</span>
              Driver Name
            </label>
            <input
              type="text"
              value={inputDriverName}
              onChange={(e) => setInputDriverName(e.target.value)}
              placeholder="Enter driver name"
              disabled={callInProgress}
            />
          </div>
          <div className="field">
            <label>
              <span className="icon">#</span>
              Load Number
            </label>
            <input
              type="text"
              value={inputLoadNumber}
              onChange={(e) => setInputLoadNumber(e.target.value)}
              placeholder="Enter load number"
              disabled={callInProgress}
            />
          </div>
          <div className="field">
            <label>
              <span className="icon">☎️</span>
              Phone Number
            </label>
            <input
              type="text"
              value={inputPhoneNumber}
              onChange={(e) => setInputPhoneNumber(e.target.value)}
              placeholder="Enter phone number"
              disabled={callInProgress}
            />
          </div>
        </div>
        <div className="status">
          <span className="status-text">
            <span className="idle-dot">●</span>
            Idle
          </span>
          <div className="buttons">
            <button
              onClick={startCall}
              disabled={callInProgress}
              className="start-call"
            >
              ► Start Call
            </button>
            <button
              onClick={endCall}
              disabled={!callInProgress}
              className="end-call"
            >
              □ End Call
            </button>
          </div>
          <span className="elapsed">
            <span className="clock-icon">⏱️</span>
            Elapsed: {elapsedTime}s
          </span>
        </div>
      </div>

      <div className="call-summary">
        <div className="header">
          <span className="icon">📊</span>
          Call Summary
        </div>
        <table>
          <thead>
            <tr>
              <th>Driver</th>
              <th>Load</th>
              <th>Phone</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{callInfo.driverName || "-"}</td>
              <td>{callInfo.loadNumber || "-"}</td>
              <td>
                {callInfo.phoneNumber || "-"}
                {callInfo.phoneNumber && (
                  <button onClick={handleCopyPhone} className="copy-btn">📋 Copy</button>
                )}
              </td>
              <td>{callInfo.startTime ? callInfo.startTime.toLocaleString() : "-"}</td>
              <td>{callInfo.endTime ? callInfo.endTime.toLocaleString() : "-"}</td>
              <td>{callInfo.duration != null ? `${callInfo.duration}s` : "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="transcript-section">
        <div className="header">
          <span className="icon">📝</span>
          Transcript
        </div>
        <div className="transcript-container" ref={transcriptContainerRef}>
          <table className="transcript-table">
            <thead>
              <tr>
                <th>Speaker</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {transcript.length === 0 ? (
                <tr>
                  <td colSpan="2">No transcript yet</td>
                </tr>
              ) : (
                transcript.map((t) => (
                  <tr
                    key={t.id}
                    className={t.role === "user" ? "user-row" : "agent-row"}
                  >
                    <td>{t.role === "user" ? "You" : "Agent"}</td>
                    <td style={{ whiteSpace: "pre-wrap" }}>{t.text}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}