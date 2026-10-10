import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './styles.css';

// Connect to real-time WebSocket server
const socket = io('http://localhost:5000');

export default function App() {
  const [userRole, setUserRole] = useState('worker');
  const [status, setStatus] = useState('NORMAL');
  const [location, setLocation] = useState(null);
  const [checkInTime, setCheckInTime] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [alertLogs, setAlertLogs] = useState([]);
  const timerRef = useRef(null);

  // Audio Siren Synthesizer
  const playSirenAlarm = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.log('Audio playback blocked by browser settings');
    }
  };

  const fetchIPLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data.latitude && data.longitude) {
        setLocation({ lat: data.latitude, lng: data.longitude });
      } else {
        throw new Error();
      }
    } catch {
      setLocation({ lat: 9.146984, lng: 77.832288 });
    }
  };

  const updateLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => fetchIPLocation(),
        { timeout: 5000 }
      );
    } else {
      fetchIPLocation();
    }
  };

  // Fetch past SQL logs on initial load
  useEffect(() => {
    fetch('http://localhost:5000/api/alerts')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.logs) {
          setAlertLogs(data.logs);
        }
      })
      .catch((err) => console.log('Backend offline or initializing...'));

    // Listen for live SOS broadcasts from server
    socket.on('owner_alert', (newAlert) => {
      setAlertLogs((prev) => [newAlert, ...prev]);
      playSirenAlarm();
    });

    return () => socket.off('owner_alert');
  }, []);

  // Trigger Emergency, Play Siren, Broadcast via WebSockets
  const triggerEmergencyAlert = async (type = 'MANUAL_SOS') => {
    setStatus('CRITICAL');
    setTimerActive(false);
    updateLocation();
    playSirenAlarm();

    const currentLoc = location || { lat: 9.146984, lng: 77.832288 };
    const sosPayload = {
      workerId: 'WORKER-8042',
      type: type,
      timestamp: new Date().toLocaleTimeString(),
      location: currentLoc
    };

    // 1. Emit live WebSocket event across internet to all owners
    socket.emit('worker_sos', sosPayload);

    // 2. Also send to HTTP POST to trigger backend rate-limit checks
    try {
      const res = await fetch('http://localhost:5000/api/send-sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sosPayload)
      });
      const data = await res.json();
      if (res.status === 429) {
        alert('🚨 Rate Limit Exceeded: Too many SOS requests in short time!');
      }
    } catch (e) {
      console.error(e);
    }

    if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
  };

  const resetStatus = () => {
    setStatus('NORMAL');
    setTimerActive(false);
    setCheckInTime(30);
  };

  useEffect(() => {
    if (timerActive && checkInTime > 0) {
      timerRef.current = setInterval(() => setCheckInTime((prev) => prev - 1), 1000);
    } else if (checkInTime === 0 && timerActive) {
      triggerEmergencyAlert('CHECKIN_TIMER_EXPIRED');
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive, checkInTime]);

  return (
    <div className="dashboard-wrapper">
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
        <button 
          className={`btn ${userRole === 'worker' ? '' : 'btn-secondary'}`}
          onClick={() => setUserRole('worker')}
        >
          👷 Worker View
        </button>
        <button 
          className={`btn ${userRole === 'owner' ? '' : 'btn-secondary'}`}
          onClick={() => setUserRole('owner')}
        >
          🏢 Owner Dashboard ({alertLogs.length})
        </button>
      </div>

      {userRole === 'worker' && (
        <>
          <header className="header">
            <h1 className="main-title">Lone Worker Guardian</h1>
            <p className="sub-title">Automated Fall Detection & Real-Time Dispatch</p>
          </header>

          <div className={`status-card ${status.toLowerCase()}`}>
            <h3>SYSTEM STATUS: {status}</h3>
            {status === 'NORMAL' && <p>🟢 Active monitoring running</p>}
            {status === 'CRITICAL' && <p>🚨 Real-time alert dispatched to owner!</p>}
          </div>

          <button className="sos-button" onClick={() => triggerEmergencyAlert('MANUAL_SOS')}>
            🚨 TRIGGER MANUAL SOS
          </button>

          <div className="card">
            <h3>Safety Check-in Timer</h3>
            <div className="timer-box">
              <span className="timer-count">{checkInTime}s</span>
            </div>
            {!timerActive ? (
              <button className="btn" onClick={() => { setTimerActive(true); updateLocation(); }}>
                Start Hazardous Task Timer
              </button>
            ) : (
              <button className="btn btn-success" onClick={resetStatus}>
                I AM SAFE (Reset Timer)
              </button>
            )}
          </div>

          <div className="card">
            <h3>Worker Location GPS</h3>
            <button className="btn btn-secondary" onClick={updateLocation}>Update GPS</button>
            {location && (
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <p style={{ color: '#38bdf8' }}>Lat: {location.lat.toFixed(4)} | Lng: {location.lng.toFixed(4)}</p>
                <a 
                  href={`https://www.google.com/maps?q=${location.lat},${location.lng}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ display: 'inline-block', marginTop: '8px' }}
                >
                  📍 Open Pin in Maps
                </a>
              </div>
            )}
          </div>
        </>
      )}

      {userRole === 'owner' && (
        <div className="card" style={{ textAlign: 'left' }}>
          <h2>🏢 Owner Command Center (Live WebSockets)</h2>
          <p style={{ color: '#94a3b8' }}>Real-time Emergency Dispatch Console</p>

          {alertLogs.length === 0 ? (
            <p style={{ color: '#22c55e', marginTop: '20px' }}>🟢 No active emergencies.</p>
          ) : (
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {alertLogs.map((log) => (
                <div key={log.id} style={{ padding: '15px', borderRadius: '8px', background: '#1e293b', borderLeft: '5px solid #f43f5e' }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#f43f5e' }}>🚨 EMERGENCY: {log.type}</h4>
                  <p style={{ margin: '2px 0' }}><strong>Worker:</strong> {log.workerId}</p>
                  <p style={{ margin: '2px 0' }}><strong>Time:</strong> {log.timestamp}</p>
                  <p style={{ margin: '2px 0', color: '#38bdf8' }}>
                    <strong>Location:</strong> {log.location?.lat}, {log.location?.lng}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${log.location?.lat},${log.location?.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                    style={{ display: 'inline-block', marginTop: '10px', width: 'auto', padding: '6px 12px' }}
                  >
                    📍 Navigate to Worker on Google Maps
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}