// src/components/GrafanaEmbed.jsx
import React from 'react';

const GrafanaEmbed = ({ dashboardId, panelId, from = 'now-24h', to = 'now' }) => {
  const grafanaUrl = `http://localhost:3000/d-solo/${dashboardId}/your-dashboard?orgId=1&from=${from}&to=${to}&panelId=${panelId}`;
  
  return (
    <div className="grafana-embed">
      <iframe
        src={grafanaUrl}
        width="100%"
        height="400"
        frameBorder="0"
        title="Grafana Dashboard"
      />
    </div>
  );
};

export default GrafanaEmbed;