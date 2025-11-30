import React, { useState, useEffect } from 'react';
import { adminService } from '../services/api';

const AnalyticsDashboard = () => {
  const [grafanaUrl] = useState('http://localhost:3001/d/tech-store-dashboard');
  const [statistics, setStatistics] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchStatistics();
  }, [timeRange]);

  const fetchStatistics = async () => {
    try {
      const response = await adminService.getStatistics();
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.error('Gabim në marrjen e statistikave:', error);
    }
  };

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2>📈 Analitikë e Avancuar me Grafana</h2>
        <div className="time-range-selector">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="form-control"
          >
            <option value="24h">24 Orët e Fundit</option>
            <option value="7d">7 Ditët e Fundit</option>
            <option value="30d">30 Ditët e Fundit</option>
            <option value="90d">3 Muajt e Fundit</option>
          </select>
        </div>
      </div>

      {/* Embed Grafana Dashboard */}
      <div className="grafana-container">
        <div className="grafana-embed">
          <iframe
            src={grafanaUrl}
            width="100%"
            height="600"
            frameBorder="0"
            title="Grafana Dashboard"
          />
        </div>
        
        <div className="grafana-fallback">
          <p>Nëse Grafana nuk është e instaluar, shikoni statistikat lokale:</p>
          
          {statistics && (
            <div className="local-analytics">
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h4>📊 Performanca e Sistemit</h4>
                  <div className="metric">
                    <span className="metric-label">Shkalla e Konvertimit:</span>
                    <span className="metric-value">
                      {((statistics.overview.totalOrders / statistics.overview.totalUsers) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Vlera Mesatare e Porosisë:</span>
                    <span className="metric-value">
                      {parseFloat(statistics.overview.totalRevenue / statistics.overview.totalOrders).toFixed(2)} €
                    </span>
                  </div>
                </div>

                <div className="analytics-card">
                  <h4>📈 Trendet e Shitjeve</h4>
                  {statistics.monthlyOrders.slice(0, 3).map(month => (
                    <div key={month.month} className="trend-item">
                      <span className="trend-period">
                        {new Date(month.month + '-01').toLocaleDateString('sq-AL', { month: 'long', year: 'numeric' })}
                      </span>
                      <span className="trend-orders">{month.order_count} porosi</span>
                      <span className="trend-revenue">{parseFloat(month.revenue).toFixed(2)} €</span>
                    </div>
                  ))}
                </div>

                <div className="analytics-card">
                  <h4>🎯 Produktet Kryesuese</h4>
                  {statistics.topProducts.slice(0, 5).map(product => (
                    <div key={product.id} className="product-metric">
                      <span className="product-name">{product.name}</span>
                      <div className="product-stats">
                        <span className="sold-count">{product.total_sold} njësi</span>
                        <span className="product-revenue">{parseFloat(product.total_revenue).toFixed(2)} €</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metrikat e Performancës */}
      <div className="performance-metrics">
        <h3>📊 Metrikat e Performancës</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Përdorues të Rinj</span>
              <span className="metric-trend positive">+12%</span>
            </div>
            <div className="metric-value">
              {statistics?.newUsers.reduce((sum, day) => sum + day.user_count, 0) || 0}
            </div>
            <div className="metric-period">30 ditët e fundit</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Shitjet</span>
              <span className="metric-trend positive">+8%</span>
            </div>
            <div className="metric-value">
              {statistics?.monthlyOrders[0]?.order_count || 0}
            </div>
            <div className="metric-period">Muaji aktual</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Të Ardhurat</span>
              <span className="metric-trend positive">+15%</span>
            </div>
            <div className="metric-value">
              {parseFloat(statistics?.monthlyOrders[0]?.revenue || 0).toFixed(2)} €
            </div>
            <div className="metric-period">Muaji aktual</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Stoku i Ulet</span>
              <span className="metric-trend negative">-5%</span>
            </div>
            <div className="metric-value">
              {statistics?.overview.lowStockProducts || 0}
            </div>
            <div className="metric-period">Kërkon vëmendje</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;