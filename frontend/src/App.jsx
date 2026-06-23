import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import CommandCenter from './pages/CommandCenter';
import Pipeline from './pages/Pipeline';
import Replay from './pages/Replay';
import Quality from './pages/Quality';
import Detection from './pages/Detection';
import Violations from './pages/Violations';
import LPR from './pages/LPR';
import Evidence from './pages/Evidence';
import Analytics from './pages/Analytics';
import Intelligence from './pages/Intelligence';
import Predictions from './pages/Predictions';
import Evaluation from './pages/Evaluation';
import Assistant from './pages/Assistant';
import Bluetooth from './pages/Bluetooth';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Boot Screen */}
        <Route path="/" element={<Landing />} />
        
        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Main App with Sidebar */}
        <Route element={<Layout />}>
          <Route path="/command-center" element={<CommandCenter />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/replay" element={<Replay />} />
          <Route path="/quality" element={<Quality />} />
          <Route path="/detection" element={<Detection />} />
          <Route path="/violations" element={<Violations />} />
          <Route path="/lpr" element={<LPR />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/evidence/:id" element={<Evidence />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/bluetooth" element={<Bluetooth />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
