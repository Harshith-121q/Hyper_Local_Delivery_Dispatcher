import React, { useEffect, useRef, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { X, MapPin, Navigation, Search, Loader2 } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY } from '../../config/googleConfig.js';

const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#18181b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#18181b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a1a1aa' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#facc15' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a1a1aa' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#27272a' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#22c55e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#27272a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#09090b' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#71717a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#eab308', opacity: 0.8 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#09090b' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#09090b' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#71717a' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#09090b' }],
  },
];

const LocationPickerModal = ({ isOpen, onClose }) => {
  const { user, updateLocation } = useContext(AuthContext);
  const mapContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [apiMessage, setApiMessage] = useState('');
  
  const [coordinates, setCoordinates] = useState({ lat: 12.9716, lng: 77.5946 }); // Bangalore default
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize coordinates to user's saved location when modal opens
  useEffect(() => {
    if (isOpen && user?.location?.lat && user?.location?.lng) {
      setCoordinates({ lat: user.location.lat, lng: user.location.lng });
    }
  }, [isOpen, user]);

  // Dynamic Google Maps Script Loader
  useEffect(() => {
    if (!isOpen) return;

    if (window.google && window.google.maps) {
      setGoogleLoaded(true);
      return;
    }

    const scriptId = 'google-maps-api-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      if (!GOOGLE_MAPS_API_KEY) {
        setLoadError(true);
        setApiMessage('Google Maps API key is not configured. Set VITE_GOOGLE_MAPS_API_KEY in your frontend environment.');
        return;
      }

      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?libraries=places&key=${GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        setGoogleLoaded(true);
      };

      script.onerror = () => {
        setLoadError(true);
        setApiMessage('Failed to load Google Maps. Please check your API key and billing settings.');
      };

      document.head.appendChild(script);
    } else {
      // Script is already added, wait for load
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          setGoogleLoaded(true);
          clearInterval(checkInterval);
        }
      }, 200);

      // Timeout after 8 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google) setLoadError(true);
      }, 8000);
    }
  }, [isOpen]);

  // Initialize Map
  useEffect(() => {
    if (!isOpen || !googleLoaded || !mapContainerRef.current) return;

    try {
      const initLocation = coordinates;

      const mapOptions = {
        center: initLocation,
        zoom: 14,
        styles: DARK_MAP_STYLES,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        backgroundColor: '#09090B'
      };

      const gMap = new window.google.maps.Map(mapContainerRef.current, mapOptions);
      mapRef.current = gMap;

      const gMarker = new window.google.maps.Marker({
        position: initLocation,
        map: gMap,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        title: 'Selected Delivery Location'
      });
      markerRef.current = gMarker;

      // Map Click Event
      gMap.addListener('click', (event) => {
        const clickedLatLng = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        updateMarkerAndState(clickedLatLng);
      });

      // Marker Drag Event
      gMarker.addListener('dragend', () => {
        const dragLatLng = gMarker.getPosition();
        setCoordinates({
          lat: dragLatLng.lat(),
          lng: dragLatLng.lng()
        });
      });

      // Autocomplete Search Box
      if (searchInputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
          types: ['geocode', 'establishment']
        });
        autocomplete.bindTo('bounds', gMap);

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) {
            return;
          }

          const searchLatLng = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          };

          updateMarkerAndState(searchLatLng);
          gMap.setZoom(16);
        });
      }
    } catch (err) {
      console.error('Error initializing map:', err);
      setLoadError(true);
    }
  }, [isOpen, googleLoaded]);

  // Helper to update marker position, pan map, and update coordinates state
  const updateMarkerAndState = (latLng) => {
    setCoordinates(latLng);
    if (markerRef.current) {
      markerRef.current.setPosition(latLng);
    }
    if (mapRef.current) {
      mapRef.current.panTo(latLng);
    }
  };

  // Device GPS Geolocator
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setApiMessage('Geolocation is not supported by your browser.');
      return;
    }

    setLoadingGps(true);
    setApiMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const gpsLatLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        updateMarkerAndState(gpsLatLng);
        if (mapRef.current) {
          mapRef.current.setZoom(16);
        }
        setLoadingGps(false);
      },
      (error) => {
        setLoadingGps(false);
        setApiMessage(error.message || 'Unable to retrieve GPS coordinates.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Save coordinates & update database / Auth state
  const handleSave = async () => {
    setSavingLocation(true);
    setApiMessage('');
    try {
      const res = await updateLocation(coordinates);
      if (res.success) {
        setApiMessage('Location saved successfully.');
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setApiMessage(res.message || 'Failed to update location.');
      }
    } catch (err) {
      setApiMessage('Error updating location.');
    } finally {
      setSavingLocation(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(9, 9, 11, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '620px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={22} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Select Delivery Location</h3>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '50%',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Autocomplete Search input */}
          {googleLoaded && !loadError && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={18} style={{
                position: 'absolute',
                left: '14px',
                color: 'var(--text-secondary)'
              }} />
              <input
                ref={searchInputRef}
                type="text"
                className="input-field"
                placeholder="Search places or coordinates..."
                style={{ paddingLeft: '40px' }}
              />
            </div>
          )}

          {/* Map canvas container */}
          <div style={{ position: 'relative', height: '320px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            {!googleLoaded && !loadError && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(9, 9, 11, 0.9)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                zIndex: 10
              }}>
                <Loader2 size={32} style={{ color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Loading Google Maps...</span>
              </div>
            )}

            {loadError && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(9, 9, 11, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                textAlign: 'center',
                gap: '10px',
                zIndex: 10
              }}>
                <MapPin size={40} style={{ color: 'var(--danger)' }} />
                <h4 style={{ margin: 0 }}>Map Loading Failed</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                  Unable to connect to Google Maps. Please check your network connection. You can still input coordinates manually below.
                </p>
              </div>
            )}

            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', backgroundColor: '#09090B' }} />
          </div>

          {/* Manual Coordinate Inputs & GPS Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', flexGrow: 1, gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Latitude</span>
                <input 
                  type="number"
                  step="any"
                  className="input-field"
                  value={coordinates.lat}
                  onChange={(e) => {
                    const latVal = Number(e.target.value);
                    if (!isNaN(latVal)) {
                      updateMarkerAndState({ ...coordinates, lat: latVal });
                    }
                  }}
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Longitude</span>
                <input 
                  type="number"
                  step="any"
                  className="input-field"
                  value={coordinates.lng}
                  onChange={(e) => {
                    const lngVal = Number(e.target.value);
                    if (!isNaN(lngVal)) {
                      updateMarkerAndState({ ...coordinates, lng: lngVal });
                    }
                  }}
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleUseGps}
              disabled={loadingGps}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                marginTop: '18px',
                fontSize: '13px'
              }}
            >
              {loadingGps ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Navigation size={14} />}
              GPS
            </button>
          </div>

          {/* Messaging */}
          {apiMessage && (
            <div style={{
              fontSize: '13px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: apiMessage.includes('successfully') ? 'var(--success-glow)' : 'rgba(239, 68, 68, 0.1)',
              color: apiMessage.includes('successfully') ? 'var(--success)' : '#EF4444',
              border: `1px solid ${apiMessage.includes('successfully') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
            }}>
              {apiMessage}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '16px 24px',
          backgroundColor: 'rgba(255, 255, 255, 0.01)',
          borderTop: '1px solid var(--border-color)'
        }}>
          <button 
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Cancel
          </button>
          <button 
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={savingLocation}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              fontSize: '13px'
            }}
          >
            {savingLocation && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Save & Share Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPickerModal;
