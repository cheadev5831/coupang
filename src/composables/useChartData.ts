import { ref } from 'vue';
import { loadMonthSummaries } from 'src/services/firestoreService';

export interface ChartMonthData {
  month: string;       // 'YYYY-MM'
  yyyymm: string;      // 'YYYYMM'
  totalAmount: number;
  checkedAmount: number;
  hasData: boolean;
}

function build12Months(): ChartMonthData[] {
  const now = new Date();
  const months: ChartMonthData[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    months.push({
      month: `${yyyy}-${mm}`,
      yyyymm: `${yyyy}${mm}`,
      totalAmount: 0,
      checkedAmount: 0,
      hasData: false,
    });
  }
  return months;
}

export function useChartData() {
  const chartData = ref<ChartMonthData[]>(build12Months());
  const isLoading = ref(false);

  async function loadChartData() {
    isLoading.value = true;
    const base = build12Months();
    const yyyymms = base.map((m) => m.yyyymm);

    try {
      const summaries = await loadMonthSummaries(yyyymms);
      chartData.value = base.map((m) => {
        const s = summaries.get(m.yyyymm);
        return s
          ? { ...m, totalAmount: s.totalAmount, checkedAmount: s.checkedAmount, hasData: true }
          : m;
      });
    } finally {
      isLoading.value = false;
    }
  }

  return { chartData, isLoading, loadChartData };
}
