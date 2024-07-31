'use client';

import React, { useState, useRef } from 'react';

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState('');
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioURL, setAudioURL] = useState('');
  const [speakerWordCounts, setSpeakerWordCounts] = useState({});
  const [speakerNames, setSpeakerNames] = useState({});
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      console.log('Requesting permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Permissions granted, stream obtained.');

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      setMediaRecorder(recorder);
      audioChunksRef.current = []; // Reset audioChunks when starting recording

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Data available:', event.data);
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start();
      setRecording(true);
      setAudioURL(''); // Reset the audio URL when starting a new recording
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording...');
    if (!mediaRecorder) return;

    mediaRecorder.stop();
    mediaRecorder.onstop = () => {
      console.log('Recorder stopped, processing chunks:', audioChunksRef.current);
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('audioBlob size:', audioBlob.size);
      if (audioBlob.size > 0) {
        const audioURL = URL.createObjectURL(audioBlob);
        setAudioURL(audioURL); // Set the audio URL for playback
        sendAudioToBackend(audioBlob);
      } else {
        console.error('Recording failed: audioBlob is empty.');
      }
      setRecording(false);
    };
  };

  const sendAudioToBackend = async (blob) => {
    try {
      console.log('Got blob:', blob);

      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      console.log('Sending to backend...');
      const backendResponse = await fetch('http://localhost:3001/recognize', {
        method: 'POST',
        body: formData,
      });

      const result = await backendResponse.json();
      console.log('Got backend response:', result);

      setMessage(result.transcription);
      setSpeakerWordCounts(result.speakerWordCounts);
      setSpeakerNames(result.speakerNames);
    } catch (error) {
      console.error('Failed to send audio to backend:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <button
          onClick={recording ? stopRecording : startRecording}
          className="w-full px-4 py-2 mb-4 text-white bg-blue-500 rounded hover:bg-blue-700 focus:outline-none"
        >
          {recording ? 'Stop Recording' : 'Start Recording'}
        </button>
        {audioURL && (
          <div className="mt-4">
            <h2 className="text-lg font-bold">Recorded Audio:</h2>
            <audio controls src={audioURL} className="w-full mt-2"></audio>
            <a
              href={audioURL}
              download="recording.webm"
              className="block mt-2 text-blue-500 hover:underline"
            >
              Download Audio
            </a>
          </div>
        )}
        {message && (
          <div className="mt-4">
            <h2 className="text-lg font-bold">Transcription:</h2>
            <p className="mt-2 text-gray-700">{message}</p>
          </div>
        )}
        {Object.keys(speakerWordCounts).length > 0 && (
          <div className="mt-4">
            <h2 className="text-lg font-bold">Speaker Word Counts:</h2>
            <ul className="mt-2">
              {Object.keys(speakerWordCounts).map(speakerTag => (
                <li key={speakerTag} className="text-gray-700">
                  {speakerNames[speakerTag] || `Speaker ${speakerTag}`}: {speakerWordCounts[speakerTag]} words
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
