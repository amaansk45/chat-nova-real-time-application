import React, { useState } from 'react';
import { MapPin, Navigation, Send, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface LocationShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendLocation: (locationData: { latitude: number; longitude: number; address?: string }) => void;
}

export const LocationShareModal: React.FC<LocationShareModalProps> = ({
  isOpen,
  onClose,
  onSendLocation,
}) => {
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [address, setAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setAddress('Current GPS Location');
        setIsLocating(false);
      },
      (err) => {
        setError(err.message || 'Unable to retrieve location.');
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSend = () => {
    if (lat === '' || lng === '') {
      setError('Please provide coordinates or click Get Current Location.');
      return;
    }

    onSendLocation({
      latitude: Number(lat),
      longitude: Number(lng),
      address: address || `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Location" size="md">
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-nova-error/10 border border-nova-error/30 rounded-xl text-xs text-nova-error flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          fullWidth
          isLoading={isLocating}
          onClick={handleGetCurrentLocation}
        >
          <Navigation className="w-4 h-4 mr-2 text-nova-accent" /> Use Current Location
        </Button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-nova-border"></div>
          <span className="flex-shrink mx-3 text-xs text-nova-muted uppercase font-bold">Or enter manually</span>
          <div className="flex-grow border-t border-nova-border"></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Latitude"
            type="number"
            step="any"
            placeholder="37.7749"
            value={lat.toString()}
            onChange={(e) => setLat(e.target.value ? parseFloat(e.target.value) : '')}
          />
          <Input
            label="Longitude"
            type="number"
            step="any"
            placeholder="-122.4194"
            value={lng.toString()}
            onChange={(e) => setLng(e.target.value ? parseFloat(e.target.value) : '')}
          />
        </div>

        <Input
          label="Location Name / Address (Optional)"
          type="text"
          placeholder="San Francisco Central Plaza"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        {/* Map Preview Graphic */}
        {lat !== '' && lng !== '' && (
          <div className="h-32 rounded-2xl bg-slate-900 border border-nova-border flex flex-col items-center justify-center p-3 text-center relative overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-nova-primary/20 text-nova-error flex items-center justify-center mb-1 animate-bounce">
              <MapPin className="w-6 h-6 fill-current" />
            </div>
            <p className="text-xs font-semibold text-white">{address || 'Selected Location'}</p>
            <p className="text-[10px] text-nova-muted font-mono mt-0.5">
              {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSend}
            disabled={lat === '' || lng === ''}
          >
            <Send className="w-4 h-4 mr-1.5" /> Share Location
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default LocationShareModal;
