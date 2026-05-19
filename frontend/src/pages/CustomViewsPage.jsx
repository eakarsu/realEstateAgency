import React from 'react';
import 'leaflet/dist/leaflet.css';
import PropertyMap from '../components/PropertyMap';
import ListingPriceTrend from '../components/ListingPriceTrend';
import ListingBrochurePDF from '../components/ListingBrochurePDF';
import ShowingScheduler from '../components/ShowingScheduler';

export default function CustomViewsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agency Views</h1>
        <p className="text-gray-600 text-sm">
          Custom real-estate workflow tools: map, price trends, brochures, and showing scheduling.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PropertyMap />
        <ListingPriceTrend />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListingBrochurePDF />
        <ShowingScheduler />
      </div>
    </div>
  );
}
