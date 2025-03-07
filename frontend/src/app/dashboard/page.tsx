import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the Dashboard component with no SSR to avoid window errors
const NodalGraphDashboard = dynamic(
  () => import('../../pages/Dashboard_new_part1'),
  { ssr: false }
);

export default function DashboardPage() {
  return <NodalGraphDashboard />;
} 