import React, { ChangeEvent, Component, FormEvent, useState } from 'react';

// Interfaces for calculator results
interface SavingsResults {
  endingBalance: number;
  totalPrincipal: number;
  totalInterest: number;
}

interface DistributionResults {
  years: number;
  months: number;
  lastsOverMaxTime: boolean;
}

// Type for compounding interval options
type CompoundInterval = 'Annually' | 'Semi-Annually' | 'Quarterly' | 'Monthly';

const App: React.FC = () => {
  // --- State for Investment Savings Calculator ---
  const [initialInvestment, setInitialInvestment] = useState<string>('10000');
  const [monthlyContribution, setMonthlyContribution] = useState<string>('500');
  const [lengthOfTimeInYears, setLengthOfTimeInYears] = useState<string>('20');
  const [savingsInterestRate, setSavingsInterestRate] = useState<string>('7'); // Annual %
  const [compoundInterval, setCompoundInterval] =
    useState<CompoundInterval>('Annually');
  const [savingsResults, setSavingsResults] = useState<SavingsResults | null>(
    null
  );
  const [savingsError, setSavingsError] = useState<string>('');

  // --- State for Investment Distributions Calculator ---
  const [principalBalance, setPrincipalBalance] = useState<string>('500000');
  const [distributionInterestRate, setDistributionInterestRate] =
    useState<string>('4'); // Annual %
  const [desiredAnnualWithdrawal, setDesiredAnnualWithdrawal] =
    useState<string>('30000');
  const [distributionResults, setDistributionResults] =
    useState<DistributionResults | null>(null);
  const [distributionError, setDistributionError] = useState<string>('');

  // --- Helper to format currency ---
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  // --- Investment Savings Calculation ---
  const handleCalculateSavings = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingsError('');
    setSavingsResults(null);

    const P = parseFloat(initialInvestment); // Initial Investment
    const PMT = parseFloat(monthlyContribution); // Monthly Contribution
    const t = parseFloat(lengthOfTimeInYears); // Length of time in years
    const annualRatePercent = parseFloat(savingsInterestRate); // Annual interest rate as percentage

    if (
      isNaN(P) ||
      isNaN(PMT) ||
      isNaN(t) ||
      isNaN(annualRatePercent) ||
      P < 0 ||
      PMT < 0 ||
      t <= 0 ||
      annualRatePercent < 0
    ) {
      setSavingsError(
        'Please enter valid, non-negative numbers for all fields. Years must be greater than 0.'
      );
      return;
    }

    const annualRate = annualRatePercent / 100;
    let periodsPerYear: number;
    switch (compoundInterval) {
      case 'Semi-Annually':
        periodsPerYear = 2;
        break;
      case 'Quarterly':
        periodsPerYear = 4;
        break;
      case 'Monthly':
        periodsPerYear = 12;
        break;
      case 'Annually':
      default:
        periodsPerYear = 1;
        break;
    }

    let balance = P;
    let currentTotalPrincipal = P;
    const ratePerPeriod = annualRate / periodsPerYear;

    for (let year = 0; year < t; year++) {
      for (let period = 0; period < periodsPerYear; period++) {
        const monthsInPeriod = 12 / periodsPerYear;
        for (let month = 0; month < monthsInPeriod; month++) {
          balance += PMT;
          currentTotalPrincipal += PMT;
        }
        balance *= 1 + ratePerPeriod;
      }
    }

    // A more standard approach for future value calculation might be needed if the above is too simplified.
    // Let's refine the savings calculation loop to be more precise about when contributions are made vs compounded.
    // The previous loop assumes contributions are made, then interest is applied on the sum at period end.
    // This is a common simplification. For more precision with monthly contributions and various compounding:

    balance = P;
    currentTotalPrincipal = P;
    const numMonths = t * 12;
    const monthlyRateForMonthlyCompounding = annualRate / 12; // Only if compounding monthly

    if (compoundInterval === 'Monthly') {
      for (let month = 0; month < numMonths; month++) {
        balance += PMT;
        currentTotalPrincipal += PMT;
        balance *= 1 + monthlyRateForMonthlyCompounding;
      }
    } else {
      // Iterative approach for other compounding frequencies
      // This adds all monthly contributions for a period, then compounds.
      let tempBalance = P;
      let runningPrincipal = P;
      const totalPeriods = t * periodsPerYear;
      const monthsPerCompoundingPeriod = 12 / periodsPerYear;

      for (let i = 0; i < totalPeriods; i++) {
        // Accumulate contributions for this compounding period
        for (let month = 0; month < monthsPerCompoundingPeriod; month++) {
          tempBalance += PMT;
          runningPrincipal += PMT;
        }
        // Compound interest
        tempBalance *= 1 + ratePerPeriod;
      }
      balance = tempBalance;
      currentTotalPrincipal = runningPrincipal;
    }

    const endingBalance = parseFloat(balance.toFixed(2));
    const totalInterest = parseFloat(
      (endingBalance - currentTotalPrincipal).toFixed(2)
    );

    setSavingsResults({
      endingBalance,
      totalPrincipal: parseFloat(currentTotalPrincipal.toFixed(2)),
      totalInterest,
    });
  };

  // --- Investment Distributions Calculation ---
  const handleCalculateDistribution = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDistributionError('');
    setDistributionResults(null);

    const PV = parseFloat(principalBalance); // Principal Balance
    const annualRatePercent = parseFloat(distributionInterestRate); // Annual interest rate
    const W_annual = parseFloat(desiredAnnualWithdrawal); // Desired Annual Withdrawal

    if (
      isNaN(PV) ||
      isNaN(annualRatePercent) ||
      isNaN(W_annual) ||
      PV <= 0 ||
      annualRatePercent < 0 ||
      W_annual <= 0
    ) {
      setDistributionError(
        'Please enter valid, positive numbers for all fields.'
      );
      return;
    }

    const monthlyInterestRate = annualRatePercent / 100 / 12;
    const monthlyWithdrawal = W_annual / 12;

    let currentBalance = PV;
    let totalMonths = 0;
    const maxCalculationMonths = 50 * 12; // Max 50 years

    // Check if withdrawals are sustainable from interest alone (simplified check)
    if (
      monthlyWithdrawal <= PV * monthlyInterestRate &&
      monthlyInterestRate > 0
    ) {
      // This condition might mean it lasts "forever" if withdrawals are less than or equal to earnings.
      // For this calculator, we assume principal will be used.
      // The loop below will handle this by potentially reaching maxCalculationMonths.
    }

    while (currentBalance > 0 && totalMonths < maxCalculationMonths) {
      const interestEarnedThisMonth = currentBalance * monthlyInterestRate;
      currentBalance += interestEarnedThisMonth;

      if (currentBalance >= monthlyWithdrawal) {
        currentBalance -= monthlyWithdrawal;
        totalMonths++;
      } else {
        // Not enough to cover a full monthly withdrawal, funds depleted this month.
        // If there's any balance left, it means it lasted partially into this month.
        if (currentBalance > 0) {
          // The problem asks for "X years and Y months". If it cannot cover the full withdrawal,
          // it means it didn't last for this *entire* month with that withdrawal amount.
          // So, the previous month was the last full month it sustained.
          // However, a common interpretation is that if *any* money is left, it counts towards that period.
          // The site says "X years and Y months", implying whole months.
          // If currentBalance is positive but less than withdrawal, it means it lasted for this month partially.
          // Let's count this month if any withdrawal can be made.
          totalMonths++;
        }
        currentBalance = 0; // Depleted
        break;
      }
    }

    let lastsOverMax = false;
    if (totalMonths >= maxCalculationMonths && currentBalance > 0) {
      lastsOverMax = true;
      // Cap displayed months at maxCalculationMonths if it's still positive
      totalMonths = maxCalculationMonths;
    }

    setDistributionResults({
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
      lastsOverMaxTime: lastsOverMax,
    });
  };

  // --- Input Field Component --- (Inlined for single file structure)
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
        {type === 'select' && options ? (
          <select
            id={id}
            value={value}
            onChange={onChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {options.map((opt) => (
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
            min={type === 'number' ? '0' : undefined} // Basic min for numbers
            step={type === 'number' ? 'any' : undefined}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50"
          />
        )}
        {unit && type !== 'select' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">{unit}</span>
          </div>
        )}
      </div>
    </div>
  );

  // --- Main JSX ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 py-8 px-4 sm:px-6 lg:px-8 font-sans text-white">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-300">
            Retirement Calculators
          </h1>
          <p className="mt-4 text-xl text-slate-300">
            Plan your financial future.
          </p>
        </header>

        {/* Investment Savings Calculator Section */}
        <section className="mb-12 bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl transition-all duration-300 hover:shadow-sky-500/30">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6 text-sky-400 border-b-2 border-sky-700 pb-2">
            Investment Savings Calculator
          </h2>
          <form
            onSubmit={handleCalculateSavings}
            className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2"
          >
            {renderInputField(
              'Initial Investment',
              'initialInvestment',
              initialInvestment,
              (e) => setInitialInvestment(e.target.value),
              'number',
              '$'
            )}
            {renderInputField(
              'Monthly Contribution',
              'monthlyContribution',
              monthlyContribution,
              (e) => setMonthlyContribution(e.target.value),
              'number',
              '$'
            )}
            {renderInputField(
              'Length of Time (Years)',
              'lengthOfTimeInYears',
              lengthOfTimeInYears,
              (e) => setLengthOfTimeInYears(e.target.value),
              'number'
            )}
            {renderInputField(
              'Annual Interest Rate',
              'savingsInterestRate',
              savingsInterestRate,
              (e) => setSavingsInterestRate(e.target.value),
              'number',
              '%'
            )}
            {renderInputField(
              'Compounding Frequency',
              'compoundInterval',
              compoundInterval,
              (e) => setCompoundInterval(e.target.value as CompoundInterval),
              'select',
              undefined,
              ['Annually', 'Semi-Annually', 'Quarterly', 'Monthly']
            )}

            <div className="md:col-span-2 mt-4">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-400"
              >
                Calculate Savings
              </button>
            </div>
          </form>

          {savingsError && (
            <p className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md">
              {savingsError}
            </p>
          )}
          {savingsResults && (
            <div className="mt-6 p-6 bg-slate-700 rounded-lg shadow-inner">
              <h3 className="text-xl font-semibold mb-3 text-sky-300">
                Savings Projection:
              </h3>
              <p className="text-lg mb-1">
                <span className="font-medium text-slate-300">
                  Ending Balance:
                </span>{' '}
                {formatCurrency(savingsResults.endingBalance)}
              </p>
              <p className="text-lg mb-1">
                <span className="font-medium text-slate-300">
                  Total Principal Contributed:
                </span>{' '}
                {formatCurrency(savingsResults.totalPrincipal)}
              </p>
              <p className="text-lg">
                <span className="font-medium text-slate-300">
                  Total Interest Earned:
                </span>{' '}
                {formatCurrency(savingsResults.totalInterest)}
              </p>
            </div>
          )}
        </section>

        {/* Investment Distributions Calculator Section */}
        <section className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl transition-all duration-300 hover:shadow-teal-500/30">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6 text-teal-400 border-b-2 border-teal-700 pb-2">
            Investment Distributions Calculator
          </h2>
          <form
            onSubmit={handleCalculateDistribution}
            className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2"
          >
            {renderInputField(
              'Principal Balance (Retirement Savings)',
              'principalBalance',
              principalBalance,
              (e) => setPrincipalBalance(e.target.value),
              'number',
              '$'
            )}
            {renderInputField(
              'Annual Interest Rate (During Retirement)',
              'distributionInterestRate',
              distributionInterestRate,
              (e) => setDistributionInterestRate(e.target.value),
              'number',
              '%'
            )}
            {renderInputField(
              'Desired Annual Withdrawal',
              'desiredAnnualWithdrawal',
              desiredAnnualWithdrawal,
              (e) => setDesiredAnnualWithdrawal(e.target.value),
              'number',
              '$'
            )}

            <div className="md:col-span-2 mt-4">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-teal-400"
              >
                Calculate How Long Funds Will Last
              </button>
            </div>
          </form>

          {distributionError && (
            <p className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md">
              {distributionError}
            </p>
          )}
          {distributionResults && (
            <div className="mt-6 p-6 bg-slate-700 rounded-lg shadow-inner">
              <h3 className="text-xl font-semibold mb-3 text-teal-300">
                Distribution Projection:
              </h3>
              {distributionResults.lastsOverMaxTime ? (
                <p className="text-lg">
                  Your funds are projected to last for{' '}
                  <span className="font-bold">over 50 years</span>.
                </p>
              ) : (
                <p className="text-lg">
                  Your funds are projected to last approximately{' '}
                  <span className="font-bold">
                    {distributionResults.years} years
                  </span>{' '}
                  and{' '}
                  <span className="font-bold">
                    {distributionResults.months} months
                  </span>
                  .
                </p>
              )}
            </div>
          )}
        </section>

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
