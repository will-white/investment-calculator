import React, { ChangeEvent, Component, FormEvent, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// --- Type Definitions ---

// Defines the structure for each point in the timeline data for the chart
interface TimelineData {
  age: number;
  balance: number;
}

// Defines the structure for the overall calculation results
interface CalculationResults {
  endingBalance: number;
  totalPrincipal: number;
  totalInterest: number;
  distributionYears?: number;
  distributionMonths?: number;
  fundsLastOverMax?: boolean;
}

// Options for how often contributions/withdrawals are made or interest is compounded
type Frequency = 'Annually' | 'Semi-Annually' | 'Quarterly' | 'Monthly';

const App: React.FC = () => {
  // --- State Management ---

  // Phase 1: Contribution/Savings Inputs
  const [initialInvestment, setInitialInvestment] = useState<string>('10000');
  const [contributionAmount, setContributionAmount] = useState<string>('500');
  const [contributionFrequency, setContributionFrequency] =
    useState<Frequency>('Monthly');
  const [contributionYears, setContributionYears] = useState<string>('30');
  const [contributionInterestRate, setContributionInterestRate] =
    useState<string>('7');

  // Phase 2: Withdrawal/Distribution Inputs
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('40000');
  const [withdrawalFrequency, setWithdrawalFrequency] =
    useState<Frequency>('Annually');
  const [distributionInterestRate, setDistributionInterestRate] =
    useState<string>('5');

  // Shared Inputs & State
  const [currentAge, setCurrentAge] = useState<string>('35');
  const [inflationRate, setInflationRate] = useState<string>('3');
  const [adjustContributionsForInflation, setAdjustContributionsForInflation] =
    useState<boolean>(true);
  const [adjustWithdrawalsForInflation, setAdjustWithdrawalsForInflation] =
    useState<boolean>(true);
  const [compoundFrequency, setCompoundFrequency] =
    useState<Frequency>('Annually');

  // Results and UI State
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [error, setError] = useState<string>('');

  // --- Helper to format currency ---
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  // --- Calculation Logic ---
  const handleCalculate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setResults(null);
    setTimelineData([]);

    // --- Input Parsing and Validation ---
    const P = parseFloat(initialInvestment);
    let currentContribution = parseFloat(contributionAmount);
    const cFreq = contributionFrequency;
    const cYears = parseInt(contributionYears, 10);
    const cRate = parseFloat(contributionInterestRate) / 100;
    let currentWithdrawal = parseFloat(withdrawalAmount);
    const wFreq = withdrawalFrequency;
    const dRate = parseFloat(distributionInterestRate) / 100;
    const age = parseInt(currentAge, 10);
    const inflRate = parseFloat(inflationRate) / 100;
    const compFreq = compoundFrequency;

    if (
      [P, cYears, cRate, dRate, age, inflRate].some(isNaN) ||
      (currentContribution > 0 && isNaN(currentContribution)) ||
      (currentWithdrawal > 0 && isNaN(currentWithdrawal))
    ) {
      setError(
        'Please fill all fields with valid numbers. Contribution and withdrawal amounts are optional but must be numbers if entered.'
      );
      return;
    }

    // --- Frequency Helpers ---
    const getFrequencyValue = (freq: Frequency) => {
      switch (freq) {
        case 'Monthly':
          return 12;
        case 'Quarterly':
          return 4;
        case 'Semi-Annually':
          return 2;
        case 'Annually':
        default:
          return 1;
      }
    };
    const periodsPerYear = getFrequencyValue(compFreq);
    const ratePerPeriod = cRate / periodsPerYear;
    const distribRatePerPeriod = dRate / periodsPerYear;

    // --- Timeline Simulation ---
    let balance = P;
    let totalPrincipal = P;
    let newTimelineData: TimelineData[] = [{ age, balance }];
    let endOfSavingsBalance = 0;

    // --- Phase 1: Contribution Years ---
    for (let year = 1; year <= cYears; year++) {
      const currentYearAge = age + year;
      let yearlyContribution = 0;

      for (let period = 1; period <= periodsPerYear; period++) {
        // Add contributions for the period
        const contributionsThisPeriod =
          (getFrequencyValue(cFreq) / periodsPerYear) * currentContribution;
        balance += contributionsThisPeriod;
        totalPrincipal += contributionsThisPeriod;
        yearlyContribution += contributionsThisPeriod;

        // Apply interest
        balance *= 1 + ratePerPeriod;
      }

      // Adjust for inflation for the next year
      if (adjustContributionsForInflation) {
        currentContribution *= 1 + inflRate;
      }
      newTimelineData.push({ age: currentYearAge, balance });
    }
    endOfSavingsBalance = balance;

    // --- Phase 2: Distribution Years ---
    let distributionMonths = 0;
    const maxDistributionYears = 100; // Cap to prevent infinite loops

    if (currentWithdrawal > 0) {
      for (let year = 1; year <= maxDistributionYears; year++) {
        const currentYearAge = age + cYears + year;
        let yearlyWithdrawal = 0;

        for (let period = 1; period <= periodsPerYear; period++) {
          // Process withdrawals for the period
          const withdrawalsThisPeriod =
            (getFrequencyValue(wFreq) / periodsPerYear) * currentWithdrawal;
          balance -= withdrawalsThisPeriod;
          yearlyWithdrawal += withdrawalsThisPeriod;

          // Apply interest
          balance *= 1 + distribRatePerPeriod;
        }

        if (adjustWithdrawalsForInflation) {
          currentWithdrawal *= 1 + inflRate;
        }

        if (balance <= 0) {
          // Try to calculate the exact month funds run out
          let tempBalance = newTimelineData[newTimelineData.length - 1].balance;
          let months = 0;
          for (let m = 0; m < 12; m++) {
            tempBalance += tempBalance * (dRate / 12);
            if (tempBalance > currentWithdrawal / 12) {
              tempBalance -= currentWithdrawal / 12;
              months++;
            } else {
              break;
            }
          }
          distributionMonths = (year - 1) * 12 + months;
          balance = 0;
          newTimelineData.push({ age: currentYearAge, balance: 0 });
          break;
        }
        newTimelineData.push({ age: currentYearAge, balance });
      }
    }

    if (balance > 0 && currentWithdrawal > 0) {
      distributionMonths = maxDistributionYears * 12;
    }

    // --- Final Results ---
    const totalInterest = newTimelineData[newTimelineData.length - 1].balance - totalPrincipal;
    setResults({
      endingBalance: endOfSavingsBalance,
      totalPrincipal,
      totalInterest,
      distributionYears:
        distributionMonths > 0
          ? Math.floor(distributionMonths / 12)
          : undefined,
      distributionMonths:
        distributionMonths > 0 ? distributionMonths % 12 : undefined,
      fundsLastOverMax: distributionMonths >= maxDistributionYears * 12,
    });
    setTimelineData(newTimelineData);
  };

  // --- UI Component for Input Fields ---
  const renderInputField = (
    label: string,
    id: string,
    value: string,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void,
    type: string = 'number',
    unit?: string,
    options?: string[]
  ) => (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <div className="relative rounded-md shadow-sm">
        {type === 'select' ? (
          <select
            id={id}
            value={value}
            onChange={onChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            id={id}
            value={value}
            onChange={onChange}
            min="0"
            step="any"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        )}
        {unit && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">{unit}</span>
          </div>
        )}
      </div>
    </div>
  );

  // --- Main Render Method ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 py-8 px-4 sm:px-6 lg:px-8 font-sans text-white">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-300">
            Investment & Retirement Calculator
          </h1>
          <p className="mt-4 text-xl text-slate-300">
            A comprehensive tool to project your financial timeline.
          </p>
        </header>

        <form
          onSubmit={handleCalculate}
          className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6">
            {/* --- Column 1: Contribution Phase --- */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-sky-400 border-b-2 border-sky-700 pb-2">
                Phase 1: Savings
              </h2>
              {renderInputField(
                'Current Age',
                'currentAge',
                currentAge,
                (e) => setCurrentAge(e.target.value)
              )}
              {renderInputField(
                'Initial Investment',
                'initialInvestment',
                initialInvestment,
                (e) => setInitialInvestment(e.target.value),
                'number',
                '$'
              )}
              {renderInputField(
                'Amount to Contribute',
                'contributionAmount',
                contributionAmount,
                (e) => setContributionAmount(e.target.value),
                'number',
                '$'
              )}
              {renderInputField(
                'Contribution Frequency',
                'contributionFrequency',
                contributionFrequency,
                (e) => setContributionFrequency(e.target.value as Frequency),
                'select',
                undefined,
                ['Annually', 'Monthly', 'Quarterly', 'Semi-Annually']
              )}
              {renderInputField(
                'Years of Contributions',
                'contributionYears',
                contributionYears,
                (e) => setContributionYears(e.target.value)
              )}
            </div>

            {/* --- Column 2: Distribution Phase --- */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-teal-400 border-b-2 border-teal-700 pb-2">
                Phase 2: Withdrawals
              </h2>
              {renderInputField(
                'Amount to Withdraw',
                'withdrawalAmount',
                withdrawalAmount,
                (e) => setWithdrawalAmount(e.target.value),
                'number',
                '$'
              )}
              {renderInputField(
                'Withdrawal Frequency',
                'withdrawalFrequency',
                withdrawalFrequency,
                (e) => setWithdrawalFrequency(e.target.value as Frequency),
                'select',
                undefined,
                ['Annually', 'Monthly', 'Quarterly', 'Semi-Annually']
              )}
            </div>

            {/* --- Column 3: Rates & Adjustments --- */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-indigo-400 border-b-2 border-indigo-700 pb-2">
                Rates & Adjustments
              </h2>
              {renderInputField(
                'Interest Rate (Savings Phase)',
                'contributionInterestRate',
                contributionInterestRate,
                (e) => setContributionInterestRate(e.target.value),
                'number',
                '%'
              )}
              {renderInputField(
                'Interest Rate (Distribution Phase)',
                'distributionInterestRate',
                distributionInterestRate,
                (e) => setDistributionInterestRate(e.target.value),
                'number',
                '%'
              )}
              {renderInputField(
                'Compounding Frequency',
                'compoundFrequency',
                compoundFrequency,
                (e) => setCompoundFrequency(e.target.value as Frequency),
                'select',
                undefined,
                ['Annually', 'Semi-Annually', 'Quarterly', 'Monthly']
              )}
              {renderInputField(
                'Assumed Annual Inflation',
                'inflationRate',
                inflationRate,
                (e) => setInflationRate(e.target.value),
                'number',
                '%'
              )}
              <div className="flex items-center pt-2 space-x-4">
                <div className="flex items-center">
                  <input
                    id="adjustContributions"
                    type="checkbox"
                    checked={adjustContributionsForInflation}
                    onChange={(e) =>
                      setAdjustContributionsForInflation(e.target.checked)
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="adjustContributions" className="ml-2 block">
                    Inflate Contributions?
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="adjustWithdrawals"
                    type="checkbox"
                    checked={adjustWithdrawalsForInflation}
                    onChange={(e) =>
                      setAdjustWithdrawalsForInflation(e.target.checked)
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="adjustWithdrawals" className="ml-2 block">
                    Inflate Withdrawals?
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* --- Submission Button --- */}
          <div className="mt-8 pt-5 border-t border-slate-700">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-400"
            >
              Calculate Financial Timeline
            </button>
          </div>
        </form>

        {error && (
          <p className="mt-6 text-red-400 bg-red-900/50 p-4 rounded-md text-center">
            {error}
          </p>
        )}

        {results && timelineData.length > 0 && (
          <section className="mt-10 bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl">
            <h2 className="text-3xl font-semibold mb-6 text-center text-green-400">
              Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-8">
              <div className="p-4 bg-slate-700 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-300">
                  Ending Balance
                </h3>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(results.endingBalance)}
                </p>
              </div>
              <div className="p-4 bg-slate-700 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-300">
                  Total Principal
                </h3>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(results.totalPrincipal)}
                </p>
              </div>
              <div className="p-4 bg-slate-700 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-300">
                  Total Interest
                </h3>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(results.totalInterest)}
                </p>
              </div>
            </div>
            {results.distributionYears !== undefined && (
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-teal-300">
                  Distribution Phase
                </h3>
                {results.fundsLastOverMax ? (
                  <p className="text-lg">
                    Funds are projected to last for{' '}
                    <span className="font-bold">over 50 years</span>.
                  </p>
                ) : (
                  <p className="text-lg">
                    Funds will last approximately{' '}
                    <span className="font-bold">
                      {results.distributionYears} years
                    </span>{' '}
                    and{' '}
                    <span className="font-bold">
                      {results.distributionMonths} months
                    </span>
                    .
                  </p>
                )}
              </div>
            )}

            <div
              className="h-96 w-full bg-slate-700 p-4 rounded-lg"
              style={{ fontFamily: 'sans-serif' }}
            >
              <ResponsiveContainer>
                <LineChart
                  data={timelineData}
                  margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis
                    dataKey="age"
                    stroke="#94a3b8"
                    tick={{ fill: '#e2e8f0' }}
                    label={{
                      value: 'Age',
                      position: 'insideBottom',
                      offset: -5,
                      fill: '#e2e8f0',
                    }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#e2e8f0' }}
                    tickFormatter={(value) =>
                      `$${(Number(value) / 1000).toLocaleString()}k`
                    }
                    label={{
                      value: 'Balance',
                      angle: -90,
                      position: 'insideLeft',
                      offset: -40,
                      fill: '#e2e8f0',
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#475569',
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                    formatter={(value) => [
                      formatCurrency(Number(value)),
                      'Balance',
                    ]}
                  />
                  <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={false}
                    name="Account Balance"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <footer className="text-center mt-12 py-6 border-t border-slate-700">
          <p className="text-sm text-slate-400">
            Calculations are estimates and for illustrative purposes only.
            Consult a financial advisor for personalized advice.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
