'use client';

import { useState, useEffect } from 'react';
import Widget from './Widget';
import { useReactiveColors } from './ColorContext';

interface WeatherData {
  temp: number;
  feelsLike: number;
  condition: string;
  location: string;
  humidity: number;
  windSpeed: number;
  high: number;
  low: number;
  icon: string;
  hourly: Array<{ time: string; temp: number; icon: string }>;
}

const getWeatherIcon = (code: number): string => {
  // Map weather codes to emoji icons
  if (code === 0) return '☀️';
  if (code === 1) return '🌤️';
  if (code === 2) return '⛅';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌧️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95 && code <= 99) return '⛈️';
  return '🌤️';
};

const getWeatherCondition = (code: number): string => {
  const conditions: Record<number, string> = {
    0: 'Clear',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing Rime Fog',
    51: 'Light Drizzle',
    53: 'Moderate Drizzle',
    55: 'Dense Drizzle',
    56: 'Light Freezing Drizzle',
    57: 'Dense Freezing Drizzle',
    61: 'Slight Rain',
    63: 'Moderate Rain',
    65: 'Heavy Rain',
    71: 'Slight Snow',
    73: 'Moderate Snow',
    75: 'Heavy Snow',
    77: 'Snow Grains',
    80: 'Slight Rain Showers',
    81: 'Moderate Rain Showers',
    82: 'Violent Rain Showers',
    85: 'Slight Snow Showers',
    86: 'Heavy Snow Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with Hail',
    99: 'Thunderstorm with Heavy Hail',
  };
  return conditions[code] || 'Unknown';
};

export default function WeatherWidget() {
  const { colors } = useReactiveColors();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Get user's location
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const { latitude, longitude } = position.coords;

        // Get location name (reverse geocoding)
        let locationName = 'Your Location';
        try {
          const geoResponse = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const geoData = await geoResponse.json();
          if (geoData.city) {
            locationName = geoData.city;
            if (geoData.principalSubdivision) {
              locationName += `, ${geoData.principalSubdivision}`;
            }
          }
        } catch (geoErr) {
          console.error('Error getting location name:', geoErr);
        }

        // Fetch weather data from Open-Meteo (free, no API key needed)
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1&forecast_hours=12`
        );
        const weatherData = await weatherResponse.json();

        if (weatherData.current && weatherData.daily) {
          const temp = Math.round(weatherData.current.temperature_2m);
          const feelsLike = Math.round(weatherData.current.apparent_temperature);
          const weatherCode = weatherData.current.weather_code;
          const humidity = weatherData.current.relative_humidity_2m;
          const windSpeed = Math.round(weatherData.current.wind_speed_10m);
          
          const high = Math.round(weatherData.daily.temperature_2m_max[0]);
          const low = Math.round(weatherData.daily.temperature_2m_min[0]);
          
          // Get hourly forecast (next 6 hours)
          const hourly = weatherData.hourly?.time.slice(0, 6).map((time: string, idx: number) => {
            const hour = new Date(time).getHours();
            const hourStr = hour === 0 ? '12AM' : hour > 12 ? `${hour - 12}PM` : hour === 12 ? '12PM' : `${hour}AM`;
            return {
              time: hourStr,
              temp: Math.round(weatherData.hourly.temperature_2m[idx]),
              icon: getWeatherIcon(weatherData.hourly.weather_code[idx]),
            };
          }) || [];

          setWeather({
            temp,
            feelsLike,
            condition: getWeatherCondition(weatherCode),
            location: locationName,
            humidity,
            windSpeed,
            high,
            low,
            icon: getWeatherIcon(weatherCode),
            hourly,
          });
        } else {
          throw new Error('No weather data received');
        }
      } catch (err) {
        console.error('Error fetching weather:', err);
        setError('Unable to fetch weather data');
        // Fallback weather data
        setWeather({
          temp: 72,
          feelsLike: 72,
          condition: 'Unknown',
          location: 'Location unavailable',
          humidity: 50,
          windSpeed: 5,
          high: 75,
          low: 65,
          icon: '🌤️',
          hourly: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Widget title="Weather">
        <p style={{ color: colors.secondary }}>Loading weather...</p>
      </Widget>
    );
  }

  if (error || !weather) {
    return (
      <Widget title="Weather">
        <p className="text-sm" style={{ color: colors.secondary }}>
          {error || 'Unable to fetch weather'}
        </p>
        <p className="text-xs mt-2" style={{ color: colors.placeholder }}>
          Allow location access to enable weather
        </p>
      </Widget>
    );
  }

  return (
    <Widget title="Weather">
      <div className="space-y-3 flex flex-col h-full">
        {/* Main Weather Display */}
        <div className="space-y-2 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="text-5xl">{weather.icon}</div>
              <div>
                <div 
                  className="text-4xl font-bold font-mono"
                  style={{ color: colors.primary }}
                >
                  {weather.temp}°
                </div>
                <div 
                  className="text-xs"
                  style={{ color: colors.muted }}
                >
                  Feels like {weather.feelsLike}°
                </div>
              </div>
            </div>
            <div className="text-right">
              <div 
                className="text-lg font-semibold"
                style={{ color: colors.secondary }}
              >
                {weather.high}° / {weather.low}°
              </div>
              <div 
                className="text-xs"
                style={{ color: colors.muted }}
              >
                High / Low
              </div>
            </div>
          </div>
          
          <div 
            className="text-sm font-medium"
            style={{ color: colors.primary }}
          >
            {weather.condition}
          </div>
        </div>

        {/* Weather Details */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 flex-shrink-0">
          <div>
            <div 
              className="text-xs mb-1"
              style={{ color: colors.secondary }}
            >
              Humidity
            </div>
            <div 
              className="text-lg font-semibold"
              style={{ color: colors.primary }}
            >
              {weather.humidity}%
            </div>
          </div>
          <div>
            <div 
              className="text-xs mb-1"
              style={{ color: colors.secondary }}
            >
              Wind
            </div>
            <div 
              className="text-lg font-semibold"
              style={{ color: colors.primary }}
            >
              {weather.windSpeed} mph
            </div>
          </div>
        </div>

        {/* Hourly Forecast */}
        {weather.hourly.length > 0 && (
          <div className="pt-2 border-t border-white/10 flex-shrink-0">
            <div 
              className="text-xs font-mono whitespace-nowrap overflow-x-auto auto-hide-scrollbar"
              style={{ color: colors.primary }}
            >
              {weather.hourly.map((hour, idx) => (
                <span key={idx}>
                  {hour.time} {hour.temp}°
                  {idx < weather.hourly.length - 1 && (
                    <span className="mx-2" style={{ color: colors.muted }}>|</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        <div 
          className="text-xs pt-2 border-t border-white/10 flex-shrink-0"
          style={{ color: colors.muted }}
        >
          📍 {weather.location}
        </div>
      </div>
    </Widget>
  );
}

