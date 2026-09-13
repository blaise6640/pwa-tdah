// 📸 Composant PhotoCapture
// - Gère l'accès caméra (mobile / desktop)
// - Compression et upload Firebase via usePhotoUpload
// - UI mobile-friendly avec bouton unique "🔄 Changer de caméra"
// - Affiche un label "Caméra N / Total" pendant la capture

import React, { useRef, useState, useEffect } from 'react';
import usePhotoUpload from '../hooks/usePhotoUpload';
import APP_CONFIG from '../app.config';

const PhotoCapture = ({ onUploadComplete }) => {
  // Vérifie si la fonctionnalité est désactivée dans la configuration
  if (!APP_CONFIG.features.photoCapture) {
    return (
      <div style={{ padding: '1rem', color: '#666', textAlign: 'center' }}>
        La capture photo est désactivée dans cette application.
      </div>
    );
  }

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [hasPhoto, setHasPhoto] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [activeDeviceId, setActiveDeviceId] = useState(null);

  const { uploadPhoto } = usePhotoUpload();

  // 🔍 Fonction intégrée pour ne garder que les caméras accessibles
  const useAvailableCameras = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter(d => d.kind === 'videoinput');

      const available = [];

      for (const device of videoInputs) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: device.deviceId } },
          });
          available.push(device);
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.warn(`Caméra inaccessible : ${device.deviceId}`);
        }
      }

      return available;
    } catch (err) {
      console.error('Erreur lors de la récupération des caméras', err);
      setError("Erreur lors de la détection des caméras.");
      return [];
    }
  };

  useEffect(() => {
    const fetchAndSetDevices = async () => {
      const workingDevices = await useAvailableCameras();
      setDevices(workingDevices);
      setSelectedDeviceId(workingDevices[0]?.deviceId || null);
    };
    fetchAndSetDevices();
  }, []);

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
  };

  const startCamera = async (deviceId) => {
    try {
      if (!deviceId) return;
      stopCamera();
      const constraints = { video: { deviceId: { exact: deviceId } } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreaming(true);
        setError(null);
        setActiveDeviceId(deviceId);
      }
    } catch (err) {
      console.error('Erreur d’accès à la caméra :', err);
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  const switchToNextCamera = async () => {
    if (!devices.length) return;
    const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDeviceId = devices[nextIndex].deviceId;

    setSelectedDeviceId(nextDeviceId);
    await startCamera(nextDeviceId);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
  
    if (!video || !canvas) return;
  
    const width = video.videoWidth;
    const height = video.videoHeight;
  
    canvas.width = width;
    canvas.height = height;
  
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, width, height);
  
    setHasPhoto(true);
  };
  

  const confirmPhoto = async () => {
    setLoading(true);
    canvasRef.current.toBlob(async (blob) => {
      try {
        const timestamp = Date.now();
        const path = `photos/photo-${timestamp}.jpg`;
        const url = await uploadPhoto(blob, path);
        onUploadComplete(url);
      } catch (err) {
        console.error('Erreur lors de la validation de la photo', err);
        setError("Erreur lors de l'envoi de la photo.");
      } finally {
        setLoading(false);
      }
    }, 'image/jpeg', 0.9);
  };

  const resetPhoto = () => {
    setHasPhoto(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const currentCameraIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!streaming && (
        <button onClick={() => startCamera(selectedDeviceId)}>📷 Démarrer la caméra</button>
      )}

      {streaming && devices.length > 1 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <button onClick={switchToNextCamera}>🔄 Changer de caméra</button>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            Caméra {currentCameraIndex + 1} / {devices.length}
          </p>
        </div>
      )}

      <video ref={videoRef} autoPlay style={{ display: hasPhoto ? 'none' : 'block', width: '100%' }} />
      <canvas ref={canvasRef} style={{ display: hasPhoto ? 'block' : 'none', width: '100%' }} />

      {!hasPhoto && streaming && (
        <button onClick={takePhoto}>📸 Prendre la photo</button>
      )}

      {hasPhoto && !loading && (
        <>
          <button onClick={confirmPhoto}>✅ Valider</button>
          <button onClick={resetPhoto}>🔁 Reprendre</button>
        </>
      )}

      {loading && <p>📤 Envoi en cours...</p>}
    </div>
  );
};

export default PhotoCapture;
