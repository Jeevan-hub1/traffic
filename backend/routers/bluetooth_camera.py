from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import asyncio
import json

router = APIRouter()

# In-memory storage for Bluetooth devices (in production, use database)
bluetooth_devices = {}


class BluetoothDevice(BaseModel):
    device_id: str
    name: str
    mac_address: str
    device_type: str  # "camera", "sensor", "gateway"
    status: str  # "disconnected", "connecting", "connected", "error"
    last_seen: Optional[str] = None
    signal_strength: Optional[int] = None  # 0-100
    battery_level: Optional[int] = None  # 0-100
    firmware_version: Optional[str] = None
    paired_at: Optional[str] = None


class ConnectionRequest(BaseModel):
    device_id: str
    auto_reconnect: bool = False


class StreamingConfig(BaseModel):
    device_id: str
    resolution: str = "1080p"
    fps: int = 30
    bitrate: int = 4000  # kbps


@router.get("/devices")
async def list_bluetooth_devices():
    """List all discovered and paired Bluetooth devices"""
    return {
        "devices": list(bluetooth_devices.values()),
        "total": len(bluetooth_devices),
        "connected": sum(1 for d in bluetooth_devices.values() if d["status"] == "connected"),
    }


@router.post("/scan")
async def scan_bluetooth_devices():
    """Scan for nearby Bluetooth devices"""
    # Simulate device discovery
    mock_devices = [
        {
            "device_id": "BT-CAM-001",
            "name": "TrafficCam-Pro-X1",
            "mac_address": "00:1A:2B:3C:4D:5E",
            "device_type": "camera",
            "status": "disconnected",
            "signal_strength": 85,
            "battery_level": 78,
            "firmware_version": "2.1.0",
        },
        {
            "device_id": "BT-CAM-002",
            "name": "TrafficCam-Pro-X2",
            "mac_address": "00:1A:2B:3C:4D:5F",
            "device_type": "camera",
            "status": "disconnected",
            "signal_strength": 72,
            "battery_level": 92,
            "firmware_version": "2.1.0",
        },
        {
            "device_id": "BT-SENS-001",
            "name": "TrafficSensor-V1",
            "mac_address": "00:1A:2B:3C:4D:60",
            "device_type": "sensor",
            "status": "disconnected",
            "signal_strength": 65,
            "battery_level": 45,
            "firmware_version": "1.5.2",
        },
    ]
    
    # Add discovered devices to storage
    for device in mock_devices:
        if device["device_id"] not in bluetooth_devices:
            bluetooth_devices[device["device_id"]] = {
                **device,
                "last_seen": datetime.utcnow().isoformat(),
            }
    
    return {
        "discovered": len(mock_devices),
        "devices": mock_devices,
        "message": "Scan completed successfully"
    }


@router.post("/connect")
async def connect_bluetooth_device(request: ConnectionRequest):
    """Connect to a Bluetooth device"""
    device_id = request.device_id
    
    if device_id not in bluetooth_devices:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device = bluetooth_devices[device_id]
    
    # Simulate connection process
    device["status"] = "connecting"
    await asyncio.sleep(1)  # Simulate connection delay
    
    # Update device status
    device["status"] = "connected"
    device["last_seen"] = datetime.utcnow().isoformat()
    device["paired_at"] = datetime.utcnow().isoformat()
    
    return {
        "device_id": device_id,
        "status": "connected",
        "message": f"Successfully connected to {device['name']}",
        "device": device
    }


@router.post("/disconnect")
async def disconnect_bluetooth_device(device_id: str):
    """Disconnect from a Bluetooth device"""
    if device_id not in bluetooth_devices:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device = bluetooth_devices[device_id]
    device["status"] = "disconnected"
    device["last_seen"] = datetime.utcnow().isoformat()
    
    return {
        "device_id": device_id,
        "status": "disconnected",
        "message": f"Disconnected from {device['name']}"
    }


@router.post("/unpair")
async def unpair_bluetooth_device(device_id: str):
    """Unpair and remove a Bluetooth device"""
    if device_id not in bluetooth_devices:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device_name = bluetooth_devices[device_id]["name"]
    del bluetooth_devices[device_id]
    
    return {
        "device_id": device_id,
        "message": f"Successfully unpaired {device_name}"
    }


@router.get("/devices/{device_id}/status")
async def get_device_status(device_id: str):
    """Get real-time status of a Bluetooth device"""
    if device_id not in bluetooth_devices:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device = bluetooth_devices[device_id]
    
    # Simulate real-time status updates
    if device["status"] == "connected":
        device["signal_strength"] = max(0, min(100, device["signal_strength"] + (hash(datetime.utcnow().microsecond) % 5) - 2))
        device["battery_level"] = max(0, device["battery_level"] - 0.1)
        device["last_seen"] = datetime.utcnow().isoformat()
    
    return {
        "device_id": device_id,
        "status": device["status"],
        "signal_strength": device["signal_strength"],
        "battery_level": device["battery_level"],
        "last_seen": device["last_seen"],
        "latency_ms": 15 if device["status"] == "connected" else None,
    }


@router.post("/streaming/start")
async def start_streaming(config: StreamingConfig):
    """Start video streaming from a Bluetooth camera"""
    device_id = config.device_id
    
    if device_id not in bluetooth_devices:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device = bluetooth_devices[device_id]
    
    if device["status"] != "connected":
        raise HTTPException(status_code=400, detail="Device not connected")
    
    # Simulate streaming setup
    streaming_info = {
        "stream_id": f"STREAM-{device_id}-{int(datetime.utcnow().timestamp())}",
        "device_id": device_id,
        "status": "streaming",
        "resolution": config.resolution,
        "fps": config.fps,
        "bitrate": config.bitrate,
        "started_at": datetime.utcnow().isoformat(),
        "stream_url": f"rtsp://localhost:8554/{device_id}",
    }
    
    return {
        "message": "Streaming started successfully",
        "stream": streaming_info
    }


@router.post("/streaming/stop")
async def stop_streaming(device_id: str):
    """Stop video streaming from a Bluetooth camera"""
    if device_id not in bluetooth_devices:
        raise HTTPException(status_code=404, detail="Device not found")
    
    return {
        "device_id": device_id,
        "status": "stopped",
        "message": "Streaming stopped successfully",
        "stopped_at": datetime.utcnow().isoformat()
    }


@router.get("/devices/{device_id}/config")
async def get_device_config(device_id: str):
    """Get configuration for a Bluetooth device"""
    if device_id not in bluetooth_devices:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device = bluetooth_devices[device_id]
    
    config = {
        "device_id": device_id,
        "name": device["name"],
        "capabilities": {
            "video_resolutions": ["720p", "1080p", "4K"],
            "fps_options": [15, 30, 60],
            "bitrate_range": [1000, 20000],
            "night_mode": True,
            "motion_detection": True,
            "audio_recording": False,
        },
        "current_settings": {
            "resolution": "1080p",
            "fps": 30,
            "bitrate": 4000,
            "night_mode": False,
            "motion_detection": True,
        }
    }
    
    return config


@router.put("/devices/{device_id}/config")
async def update_device_config(device_id: str, config: dict):
    """Update configuration for a Bluetooth device"""
    if device_id not in bluetooth_devices:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # In production, validate and apply config changes
    return {
        "device_id": device_id,
        "message": "Configuration updated successfully",
        "config": config
    }
