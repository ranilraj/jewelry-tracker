function renderGraphView(batches) {
  // Stats calculations
  const _totalCost = (st) => {
    if (!Array.isArray(st)) return 0;
    return st.reduce((s, stg) => {
      const entries = stg.entries || [];
      const stgSum = entries.reduce((acc, e) => acc + (parseFloat(e.cost) || 0), 0);
      return s + stgSum;
    }, 0);
  };
  const _totalSalesRevenue = (b) => {
    if (typeof totalSalesRevenue === 'function') return totalSalesRevenue(b);
    if (!b.sales || !Array.isArray(b.sales)) return parseFloat(b.sellingPrice) || 0;
    return b.sales.reduce((acc, s) => acc + (parseFloat(s.price) || 0), 0);
  };

  const total = batches.length;
  const spend = batches.reduce((s, b) => s + _totalCost(b.stages), 0);
  const allRevenue = batches.reduce((s, b) => s + _totalSalesRevenue(b), 0);
  const pb = batches.filter(b => _totalSalesRevenue(b) > 0);
  const avg = pb.length ? pb.reduce((s, b) => { 
    const c = _totalCost(b.stages), sp = _totalSalesRevenue(b); 
    return s + (c > 0 ? ((sp - c) / c * 100) : 0); 
  }, 0) / pb.length : 0;
  const allNetProfit = allRevenue - spend;

  return `
    <div class="header">
      <div style="flex:1"><div class="brand">RANIL JEWELLERS</div><div class="title">Analytics</div></div>
    </div>
    <div class="content" style="padding-top:20px;">
      <div class="card" style="margin-bottom:20px;">
        <div class="clbl">LAST 5 BATCHES (PROFIT)</div>
        <canvas id="batchChart" width="400" height="250"></canvas>
      </div>
      <div class="card" style="margin-bottom:20px;">
        <div class="clbl">MONTHLY PROFIT</div>
        <canvas id="monthlyChart" width="400" height="250"></canvas>
      </div>

      <div style="font-family:monospace;font-size:11px;color:#888;letter-spacing:1.5px;margin-bottom:10px;margin-top:20px;">LIFETIME STATS</div>
      <div class="stats" style="margin-bottom:24px;">
        <div class="stat stat-full" style="background:rgba(245,158,11,0.05);border-color:rgba(245,158,11,0.2);"><div class="stat-lbl" style="color:#f59e0b">TOTAL REVENUE</div><div class="stat-val" style="color:#f59e0b;font-size:20px;">₹${typeof sfmt === 'function' ? sfmt(allRevenue) : allRevenue.toLocaleString()}</div></div>
        <div class="stat"><div class="stat-lbl">BATCHES</div><div class="stat-val" style="color:#aaa">${total}</div></div>
        <div class="stat"><div class="stat-lbl">TOTAL SPEND</div><div class="stat-val" style="color:#f97316">₹${typeof sfmt === 'function' ? sfmt(spend) : spend.toLocaleString()}</div></div>
        <div class="stat"><div class="stat-lbl">AVG MARGIN</div><div class="stat-val" style="color:${avg >= 0 ? '#10b981' : '#ef4444'}">${avg.toFixed(1)}%</div></div>
        <div class="stat"><div class="stat-lbl">TOTAL PROFIT</div><div class="stat-val" style="color:${allNetProfit >= 0 ? '#10b981' : '#ef4444'}">${allNetProfit >= 0 ? '+' : '-'}₹${typeof sfmt === 'function' ? sfmt(Math.abs(allNetProfit)) : Math.abs(allNetProfit).toLocaleString()}</div></div>
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
  const _totalSalesRevenue = (b) => {
    if (typeof totalSalesRevenue === 'function') return totalSalesRevenue(b);
    if (!b.sales || !Array.isArray(b.sales)) return parseFloat(b.sellingPrice) || 0;
    return b.sales.reduce((acc, s) => acc + (parseFloat(s.price) || 0), 0);
  };

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
