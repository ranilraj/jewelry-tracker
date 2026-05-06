function renderGraphView(batches) {
  return `
    <div class="header" style="justify-content:space-between; align-items:center;">
      <div style="width:80px;"></div>
      <div style="display:flex; flex-direction:column; align-items:center;">
        <div class="brand">RANIL JEWELLERS</div>
        <div class="title">Analytics</div>
      </div>
      <button class="btn-edit" style="width:80px; padding:6px 0; font-size:11px; color:#f97316; border-color:#f9731633; background:rgba(249,115,22,0.1);" onclick="exportCSV()">Export CSV</button>
    </div>
    <div class="content" style="padding-top:20px;">
      <div class="card" style="margin-bottom:20px;">
        <div class="clbl">LAST 5 BATCHES (PROFIT)</div>
        <canvas id="batchChart" width="400" height="250"></canvas>
      </div>
      <div class="card">
        <div class="clbl">MONTHLY PROFIT</div>
        <canvas id="monthlyChart" width="400" height="250"></canvas>
      </div>
    </div>
  `;
}

let batchChartInstance = null;
let monthlyChartInstance = null;

function initCharts(batches) {
  if (typeof Chart === 'undefined') return;

  // Global Chart.js dark/orange theme defaults
  Chart.defaults.color = '#888';
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.plugins.tooltip.backgroundColor = '#111111';
  Chart.defaults.plugins.tooltip.titleColor = '#f97316';
  Chart.defaults.plugins.tooltip.bodyColor = '#e8e8e8';
  Chart.defaults.plugins.tooltip.borderColor = '#222222';
  Chart.defaults.plugins.tooltip.borderWidth = 1;

  // Helper functions assumed to exist in index.html global scope
  const _parseDate = typeof parseDateObj === 'function' ? parseDateObj : (s => new Date(s));
  const _totalCost = typeof totalCost === 'function' ? totalCost : (() => 0);
  const _totalSalesRevenue = typeof totalSalesRevenue === 'function' ? totalSalesRevenue : (b => parseFloat(b.sellingPrice) || 0);

  // Filter completed batches (those with a selling date and recorded revenue)
  const completed = batches.filter(b => b.sellingDate && _totalSalesRevenue(b) > 0);

  // Sort by selling date ascending (oldest to newest)
  const sorted = [...completed].sort((a, b) => _parseDate(a.sellingDate) - _parseDate(b.sellingDate));

  // --- 1. Last 5 Batches Graph ---
  const last5 = sorted.slice(-5);
  const labels5 = last5.map(b => b.name.substring(0, 10) + (b.name.length > 10 ? '...' : ''));
  
  const data5 = last5.map(b => {
    const cost = _totalCost(b.stages);
    const revenue = _totalSalesRevenue(b);
    return isNaN(revenue) ? 0 : (revenue - cost);
  });

  const avg5 = data5.length ? data5.reduce((a, b) => a + b, 0) / data5.length : 0;
  const avgData5 = data5.map(() => avg5);

  const ctxBatch = document.getElementById('batchChart');
  if (ctxBatch) {
    if (batchChartInstance) batchChartInstance.destroy();
    batchChartInstance = new Chart(ctxBatch, {
      type: 'bar',
      data: {
        labels: labels5.length ? labels5 : ['No Data'],
        datasets: [
          {
            type: 'line',
            label: 'Average',
            data: avgData5.length ? avgData5 : [0],
            borderColor: '#10b981',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 5,
            fill: false
          },
          {
            label: 'Net Profit (₹)',
            data: data5.length ? data5 : [0],
            backgroundColor: '#f97316',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          y: { grid: { color: '#222222' }, ticks: { color: '#666' } },
          x: { grid: { display: false }, ticks: { color: '#666', font: { size: 10 } } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // --- 2. Monthly Profit Graph ---
  const monthlyData = {};
  sorted.forEach(b => {
    const d = _parseDate(b.sellingDate);
    if (!isNaN(d)) {
      const monthYear = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const cost = _totalCost(b.stages);
      const revenue = _totalSalesRevenue(b);
      const profit = isNaN(revenue) ? 0 : (revenue - cost);
      monthlyData[monthYear] = (monthlyData[monthYear] || 0) + profit;
    }
  });

  const mLabels = Object.keys(monthlyData);
  const mData = Object.values(monthlyData);

  const mAvg = mData.length ? mData.reduce((a, b) => a + b, 0) / mData.length : 0;
  const avgMData = mData.map(() => mAvg);

  const ctxMonthly = document.getElementById('monthlyChart');
  if (ctxMonthly) {
    if (monthlyChartInstance) monthlyChartInstance.destroy();
    monthlyChartInstance = new Chart(ctxMonthly, {
      type: 'bar',
      data: {
        labels: mLabels.length ? mLabels : ['No Data'],
        datasets: [
          {
            type: 'line',
            label: 'Average',
            data: avgMData.length ? avgMData : [0],
            borderColor: '#10b981',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 5,
            fill: false
          },
          {
            label: 'Total Profit (₹)',
            data: mData.length ? mData : [0],
            backgroundColor: '#f59e0b',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          y: { grid: { color: '#222222' }, ticks: { color: '#666' } },
          x: { grid: { display: false }, ticks: { color: '#666', font: { size: 10 } } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}
