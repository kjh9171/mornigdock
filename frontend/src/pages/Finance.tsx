import { FinanceCenter } from '../components/FinanceCenter';
import { StockMarket } from '../components/StockMarket';

export default function FinancePage() {
  return (
    <div className="space-y-16">
      <FinanceCenter />
      <StockMarket />
    </div>
  );
}
