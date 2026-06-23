import { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';

interface PistaFormExtendedProps {
  name: string;
  address?: string;
  coordinates?: string;
  latitude?: number;
  longitude?: number;
  onNameChange: (name: string) => void;
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (coordinates: string, lat?: number, lng?: number) => void;
}

export function PistaFormExtended({
  name,
  address = '',
  coordinates = '',
  latitude,
  longitude,
  onNameChange,
  onAddressChange,
  onCoordinatesChange,
}: PistaFormExtendedProps) {
  const [loadingGeo, setLoadingGeo] = useState(false);

  const fetchCoordinates = async () => {
    if (!address.trim()) {
      toast.error('Digite um endereço antes de buscar coordenadas');
      return;
    }

    setLoadingGeo(true);
    try {
      // Usa a API do Nominatim (OpenStreetMap) - gratuita e sem API key
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'Porsche GT3 Cup - Sistema de Gerenciamento'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar coordenadas');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const coords = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        
        onCoordinatesChange(coords, lat, lon);
        toast.success('Coordenadas encontradas!', {
          description: `Lat: ${lat.toFixed(6)}, Lng: ${lon.toFixed(6)}`
        });
      } else {
        toast.error('Endereço não encontrado', {
          description: 'Tente adicionar mais detalhes (cidade, estado, país)'
        });
      }
    } catch (error) {
      console.error('Erro ao buscar coordenadas:', error);
      toast.error('Erro ao buscar coordenadas', {
        description: 'Você pode digitar as coordenadas manualmente'
      });
    } finally {
      setLoadingGeo(false);
    }
  };

  const openInGoogleMaps = () => {
    if (latitude && longitude) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank');
    } else if (coordinates) {
      const [lat, lng] = coordinates.split(',').map(c => c.trim());
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    } else {
      toast.error('Coordenadas não disponíveis');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="pista-name">Nome da Pista *</Label>
        <Input
          id="pista-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex: Autódromo de Interlagos"
        />
      </div>

      <div>
        <Label htmlFor="pista-address">Endereço Completo</Label>
        <div className="flex gap-2">
          <Input
            id="pista-address"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="Av. Senador Teotônio Vilela, 261 - São Paulo, SP"
            className="flex-1"
          />
          <Button
            type="button"
            onClick={fetchCoordinates}
            disabled={loadingGeo || !address.trim()}
            variant="outline"
            className="shrink-0"
          >
            <Navigation className="w-4 h-4 mr-2" />
            {loadingGeo ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Digite o endereço completo e clique em "Buscar" para preencher automaticamente
        </p>
      </div>

      <div>
        <Label htmlFor="pista-coordinates">Coordenadas (Lat, Lng)</Label>
        <div className="flex gap-2">
          <Input
            id="pista-coordinates"
            value={coordinates}
            onChange={(e) => {
              const value = e.target.value;
              onCoordinatesChange(value);
              
              // Tenta extrair lat/lng
              const parts = value.split(',').map(p => p.trim());
              if (parts.length === 2) {
                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);
                if (!isNaN(lat) && !isNaN(lng)) {
                  onCoordinatesChange(value, lat, lng);
                }
              }
            }}
            placeholder="-23.701031, -46.697068"
            className="flex-1"
          />
          {(latitude && longitude) || coordinates ? (
            <Button
              type="button"
              onClick={openInGoogleMaps}
              variant="outline"
              className="shrink-0"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Ver no Mapa
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Formato: latitude, longitude (ex: -23.701031, -46.697068)
        </p>
      </div>

      {latitude && longitude && (
        <Card className="p-3 bg-green-50 border-green-200">
          <p className="text-xs text-green-700">
            ✓ Coordenadas validadas: Lat {latitude.toFixed(6)}, Lng {longitude.toFixed(6)}
          </p>
        </Card>
      )}
    </div>
  );
}
